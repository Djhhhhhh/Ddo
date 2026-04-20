// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";
var api = {
  // Notification event (from main process)
  onNotification: (callback) => {
    ipcRenderer.on("notification:show", (_event, data) => callback(data));
  },
  // Island notification event
  onIslandShow: (callback) => {
    ipcRenderer.on("island:show", (_event, data) => callback(data));
  },
  // Notification action (to main process)
  sendNotificationAction: (action) => {
    ipcRenderer.send("notification:action", action);
  },
  // Window control
  toggleWindow: () => {
    ipcRenderer.send("window:toggle");
  },
  // Get config
  getConfig: () => ipcRenderer.invoke("config:get"),
  // Update config
  setConfig: (key, value) => ipcRenderer.invoke("config:set", key, value),
  // Remove notification listeners
  removeNotificationListener: () => {
    ipcRenderer.removeAllListeners("notification:show");
    ipcRenderer.removeAllListeners("island:show");
  }
};
contextBridge.exposeInMainWorld("ddoElectron", api);
