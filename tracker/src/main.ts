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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function isWindows() {
  return process.platform === "win32";
}

function isRegistered() {
  return Boolean(loadCredentials());
}

function hideToBackground() {
  window?.hide();
  window?.setSkipTaskbar(true);
}

function showSetupWindow() {
  window?.setSkipTaskbar(false);
  window?.show();
  window?.focus();
}

function refreshTray() {
  if (!tray) {
    return;
  }
  const registered = isRegistered();
  tray.setToolTip(
    registered
      ? `Vitarantracker · ${currentStatus}`
      : "Vitarantracker · setup required",
  );
  tray.setContextMenu(
    Menu.buildFromTemplate(
      registered
        ? [
            { label: "Running in background", enabled: false },
            { label: `Status: ${currentStatus}`, enabled: false },
            { label: "Managed by admin. No login or logout on this laptop.", enabled: false },
          ]
        : [{ label: "Open setup", click: () => showSetupWindow() }],
    ),
  );
}

function createWindow() {
  const registered = isRegistered();
  window = new BrowserWindow({
    width: 520,
    height: 680,
    title: "Vitarantracker",
    show: false,
    skipTaskbar: registered,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  window.on("close", (event) => {
    if (isRegistered()) {
      event.preventDefault();
      hideToBackground();
      return;
    }
  });
  window.once("ready-to-show", () => {
    if (!isRegistered()) {
      showSetupWindow();
    }
  });
}

function createTray() {
  const image = nativeImage.createEmpty();
  tray = new Tray(image);
  refreshTray();
  tray.on("click", () => {
    if (!isRegistered()) {
      showSetupWindow();
    }
  });
}

function stopForAdminUnlink() {
  monitor?.stop();
  monitor = null;
  clearCredentials();
  currentStatus = "OFFLINE";
  refreshTray();
  showSetupWindow();
  window?.webContents.send("tracker:status", "OFFLINE");
}

function startMonitor() {
  const credentials = loadCredentials();
  if (!credentials) {
    return;
  }
  monitor?.stop();
  monitor = new ActivityMonitor(
    credentials,
    (status) => {
      currentStatus = status;
      refreshTray();
      window?.webContents.send("tracker:status", status);
    },
    () => {
      stopForAdminUnlink();
    },
  );
  monitor.start();
  refreshTray();
}

if (gotLock) {
  app.on("second-instance", () => {
    if (!isRegistered()) {
      showSetupWindow();
    }
  });

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
    app.setLoginItemSettings({
      openAtLogin: isWindows() && app.isPackaged,
      openAsHidden: true,
    });
    startMonitor();
    if (isRegistered()) {
      hideToBackground();
    }
  });
}

ipcMain.handle("tracker:get-state", () => {
  const credentials = loadCredentials();
  return {
    registered: Boolean(credentials),
    employeeId: credentials?.employeeId ?? "",
    deviceName: credentials?.deviceName ?? os.hostname(),
    hostname: os.hostname(),
    backendUrl:
      credentials?.backendUrl ?? "https://vitarantracker-one.vercel.app",
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
    hideToBackground();
    return { success: true, deviceId: registered.deviceId };
  },
);

app.on("window-all-closed", () => {
  if (!isRegistered()) {
    app.quit();
  }
});
