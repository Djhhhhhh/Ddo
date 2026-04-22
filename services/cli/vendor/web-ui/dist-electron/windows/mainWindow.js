// electron/windows/mainWindow.ts
import { BrowserWindow, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var mainWindow = null;
function createMainWindow(options = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  const {
    width = 1414,
    height = 824,
    show = false
  } = options;
  const preloadPath = app.isPackaged ? path.join(process.resourcesPath, "dist-electron", "preload.js") : path.join(__dirname, "..", "preload.js");
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    show,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "Ddo Ding",
    backgroundColor: "#ffffff"
  });
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(process.env.DDO_WEB_UI_URL || process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:50003");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
function getMainWindow() {
  return mainWindow;
}
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}
function navigateMainWindow(hashPath) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  const isDev = !app.isPackaged;
  if (isDev) {
    const baseUrl = process.env.DDO_WEB_UI_URL || process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:50003";
    mainWindow.loadURL(`${baseUrl}#${hashPath}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      hash: hashPath
    });
  }
  mainWindow.show();
  mainWindow.focus();
}
function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}
function toggleMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  }
}
export {
  createMainWindow,
  getMainWindow,
  hideMainWindow,
  navigateMainWindow,
  showMainWindow,
  toggleMainWindow
};
