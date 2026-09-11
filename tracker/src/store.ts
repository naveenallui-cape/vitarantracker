import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

export type DeviceCredentials = {
  backendUrl: string;
  employeeId: string;
  deviceId: string;
  deviceToken: string;
  deviceName: string;
};

function filePath() {
  return path.join(app.getPath("userData"), "device.enc");
}

export function saveCredentials(credentials: DeviceCredentials) {
  const json = JSON.stringify(credentials);
  const payload = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, "utf8");
  fs.writeFileSync(filePath(), payload);
}

export function loadCredentials(): DeviceCredentials | null {
  const target = filePath();
  if (!fs.existsSync(target)) {
    return null;
  }
  const payload = fs.readFileSync(target);
  try {
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(payload)
      : payload.toString("utf8");
    const parsed = JSON.parse(json) as DeviceCredentials;
    if (!parsed.backendUrl || !parsed.deviceToken || !parsed.employeeId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCredentials() {
  const target = filePath();
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}
