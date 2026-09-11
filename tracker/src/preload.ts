import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("vitarantracker", {
  getState: () => ipcRenderer.invoke("tracker:get-state"),
  register: (payload: {
    backendUrl: string;
    employeeId: string;
    registrationCode: string;
    deviceName: string;
  }) => ipcRenderer.invoke("tracker:register", payload),
  unregister: () => ipcRenderer.invoke("tracker:unregister"),
  onStatus: (listener: (status: string) => void) => {
    ipcRenderer.on("tracker:status", (_event, status: string) => listener(status));
  },
});
