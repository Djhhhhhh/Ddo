"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  // Notification event (from main process)
  onNotification: (callback) => {
    import_electron.ipcRenderer.on("notification:show", (_event, data) => callback(data));
  },
  // Island notification event
  onIslandShow: (callback) => {
    import_electron.ipcRenderer.on("island:show", (_event, data) => callback(data));
  },
  // Notification action (to main process)
  sendNotificationAction: (action) => {
    import_electron.ipcRenderer.send("notification:action", action);
  },
  // Window control
  toggleWindow: () => {
    import_electron.ipcRenderer.send("window:toggle");
  },
  // Get config
  getConfig: () => import_electron.ipcRenderer.invoke("config:get"),
  // Update config
  setConfig: (key, value) => import_electron.ipcRenderer.invoke("config:set", key, value),
  // Remove notification listeners
  removeNotificationListener: () => {
    import_electron.ipcRenderer.removeAllListeners("notification:show");
    import_electron.ipcRenderer.removeAllListeners("island:show");
  },
  // Hide island window
  hideIsland: () => {
    import_electron.ipcRenderer.send("island:hide");
  }
};
import_electron.contextBridge.exposeInMainWorld("ddoElectron", api);
