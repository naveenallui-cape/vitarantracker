import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  dialog,
  nativeImage,
} from "electron";
import path from "node:path";
import os from "node:os";
import { ActivityMonitor } from "./activity-monitor";
import { registerDevice } from "./api";
import { clearCredentials, loadCredentials, saveCredentials } from "./store";

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let monitor: ActivityMonitor | null = null;
let currentStatus = "OFFLINE";

function isWindows() {
  return process.platform === "win32";
}

function createWindow() {
  window = new BrowserWindow({
    width: 520,
    height: 680,
    title: "Vitarantracker",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  window.on("close", (event) => {
    if (loadCredentials()) {
      event.preventDefault();
      window?.hide();
    }
  });
}

function createTray() {
  const image = nativeImage.createEmpty();
  tray = new Tray(image);
  tray.setToolTip("Vitarantracker");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open", click: () => window?.show() },
      {
        label: "Quit",
        click: () => {
          monitor?.stop();
          app.exit(0);
        },
      },
    ]),
  );
  tray.on("click", () => window?.show());
}

function startMonitor() {
  const credentials = loadCredentials();
  if (!credentials) {
    return;
  }
  monitor?.stop();
  monitor = new ActivityMonitor(credentials, (status) => {
    currentStatus = status;
    window?.webContents.send("tracker:status", status);
  });
  monitor.start();
}

app.whenReady().then(() => {
  if (app.isPackaged && !isWindows()) {
    void dialog.showErrorBox(
      "Windows only",
      "Vitarantracker is for company-owned Windows laptops.",
    );
    app.quit();
    return;
  }

  if (!app.isPackaged && !isWindows()) {
    console.warn(
      "Development mode on a non-Windows OS. Idle/lock APIs may be limited. Production builds are Windows-only.",
    );
  }

  createWindow();
  createTray();
  app.setLoginItemSettings({ openAtLogin: isWindows() && app.isPackaged });
  startMonitor();
});

ipcMain.handle("tracker:get-state", () => {
  const credentials = loadCredentials();
  return {
    registered: Boolean(credentials),
    employeeId: credentials?.employeeId ?? "",
    deviceName: credentials?.deviceName ?? os.hostname(),
    hostname: os.hostname(),
    backendUrl: credentials?.backendUrl ?? "http://localhost:4000",
    status: currentStatus,
    platform: process.platform,
    windowsOnly: isWindows(),
  };
});

ipcMain.handle(
  "tracker:register",
  async (
    _event,
    payload: {
      backendUrl: string;
      employeeId: string;
      registrationCode: string;
      deviceName: string;
    },
  ) => {
    const registered = await registerDevice(payload);
    saveCredentials({
      backendUrl: payload.backendUrl.replace(/\/$/, ""),
      employeeId: payload.employeeId.trim(),
      deviceId: registered.deviceId,
      deviceToken: registered.deviceToken,
      deviceName: registered.deviceName,
    });
    currentStatus = "ACTIVE";
    startMonitor();
    return { success: true, deviceId: registered.deviceId };
  },
);

ipcMain.handle("tracker:unregister", () => {
  monitor?.stop();
  monitor = null;
  clearCredentials();
  currentStatus = "OFFLINE";
  return { success: true };
});

app.on("window-all-closed", () => {
  if (!loadCredentials()) {
    app.quit();
  }
});
