// electron/main.ts
import { app as app4, BrowserWindow as BrowserWindow4, globalShortcut } from "electron";
import path4 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";

// electron/tray.ts
import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";
var tray = null;
var hasNotification = false;
function getProjectRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return process.cwd();
}
function getAppIconPath(notify = false) {
  const iconsDir = path.join(getProjectRoot(), "public", "icons");
  return path.join(iconsDir, notify ? "icon-active.svg" : "icon.svg");
}
function getTrayIcon(notify = false) {
  try {
    const iconPath = getAppIconPath(notify);
    console.log("[Tray] Loading icon:", iconPath);
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      return img.resize({ width: 16, height: 16 });
    }
  } catch (e) {
    console.log("[Tray] Icon load failed:", e);
  }
  return createFallbackIcon(notify);
}
function createFallbackIcon(active) {
  const size = 16;
  const color = active ? "#dc2626" : "#374151";
  const buffer = Buffer.alloc(size * size * 4);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 1;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - centerX + 0.5;
      const dy = y - centerY + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = 255;
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}
function createTrayMenu(getMainWindow3) {
  return Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        const mainWindow3 = getMainWindow3();
        if (mainWindow3) {
          mainWindow3.show();
          mainWindow3.focus();
        }
      }
    },
    {
      label: "Settings",
      click: () => {
        const mainWindow3 = getMainWindow3();
        if (mainWindow3) {
          mainWindow3.show();
          mainWindow3.focus();
          mainWindow3.webContents.send("navigate", "/config");
        }
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ]);
}
function createTray(getMainWindow3) {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  console.log("[Tray] Creating tray, project root:", getProjectRoot());
  const icon = getTrayIcon(hasNotification);
  console.log("[Tray] Icon created, isEmpty:", icon.isEmpty());
  tray = new Tray(icon);
  tray.setToolTip("Ddo Ding");
  tray.setContextMenu(createTrayMenu(getMainWindow3));
  tray.on("click", () => {
    const mainWindow3 = getMainWindow3();
    if (mainWindow3) {
      if (mainWindow3.isVisible()) {
        mainWindow3.hide();
      } else {
        mainWindow3.show();
        mainWindow3.focus();
      }
    }
  });
  tray.on("right-click", () => {
    tray?.setContextMenu(createTrayMenu(getMainWindow3));
  });
  return tray;
}
function destroyTray() {
  if (!tray) {
    return;
  }
  tray.destroy();
  tray = null;
}
function updateTrayIcon(notify) {
  if (tray && notify !== hasNotification) {
    hasNotification = notify;
    tray.setImage(getTrayIcon(notify));
  }
}

// electron/windows/islandWindow.ts
import { BrowserWindow, screen, app as app2 } from "electron";
import path2 from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
function getProjectRoot2() {
  if (app2.isPackaged) {
    return app2.getAppPath();
  }
  return process.cwd();
}
function getPreloadPath() {
  if (app2.isPackaged) {
    return path2.join(process.resourcesPath, "dist-electron", "preload.js");
  }
  return path2.join(__dirname, "preload.js");
}
var islandWindow = null;
var pendingNotification = null;
function createIslandWindow() {
  if (islandWindow && !islandWindow.isDestroyed()) {
    return islandWindow;
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const windowWidth = 520;
  const windowHeight = 340;
  const preloadPath = getPreloadPath();
  console.log("[IslandWindow] Creating new BrowserWindow");
  console.log("[IslandWindow] Using preload path:", preloadPath);
  islandWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round((screenWidth - windowWidth) / 2),
    y: 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  islandWindow.setVisibleOnAllWorkspaces(true);
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = `${process.env.VITE_DEV_SERVER_URL}#/island`;
    console.log("[IslandWindow] Loading URL:", url);
    islandWindow.loadURL(url).then(() => {
      console.log("[IslandWindow] loadURL succeeded");
    }).catch((err) => {
      console.error("[IslandWindow] loadURL failed:", err);
    });
  } else {
    islandWindow.loadFile(path2.join(getProjectRoot2(), "dist", "index.html"), {
      hash: "/island"
    });
  }
  function flushPendingNotification() {
    if (!pendingNotification || !islandWindow || islandWindow.isDestroyed()) {
      return;
    }
    console.log("[IslandWindow] Sending pending notification to renderer");
    islandWindow.webContents.send("island:show", pendingNotification);
    console.log("[IslandWindow] notification sent");
    pendingNotification = null;
  }
  islandWindow.once("ready-to-show", () => {
    console.log("[IslandWindow] ready-to-show event");
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.show();
      console.log("[IslandWindow] window shown");
    }
  });
  islandWindow.webContents.on("did-finish-load", () => {
    console.log("[IslandWindow] did-finish-load");
    setTimeout(() => {
      flushPendingNotification();
    }, 200);
  });
  islandWindow.webContents.on("console-message", (_event, level, message) => {
    console.log(`[IslandWindow:renderer:${level}] ${message}`);
  });
  islandWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[IslandWindow] did-fail-load:", errorCode, errorDescription);
  });
  islandWindow.on("closed", () => {
    console.log("[IslandWindow] closed");
    islandWindow = null;
  });
  return islandWindow;
}
function showIslandWindow(notification) {
  console.log("[IslandWindow] showIslandWindow called:", notification.title);
  if (!islandWindow || islandWindow.isDestroyed()) {
    console.log("[IslandWindow] Creating window with pending notification");
    pendingNotification = notification;
    createIslandWindow();
  } else {
    console.log("[IslandWindow] Sending notification directly to existing window");
    islandWindow.webContents.send("island:show", notification);
    if (!islandWindow.isVisible()) {
      islandWindow.show();
    }
  }
}

// electron/ipc.ts
import { ipcMain } from "electron";

// electron/notification.ts
import { Notification, BrowserWindow as BrowserWindow2 } from "electron";
var notificationHistory = [];
function showSystemNotification(data) {
  if (!Notification.isSupported()) {
    console.warn("[Ddo Ding] System notifications not supported");
    return;
  }
  const notification = new Notification({
    title: data.title,
    body: data.body,
    silent: data.level === "normal"
  });
  notification.on("click", () => {
    const windows = BrowserWindow2.getAllWindows();
    if (windows.length > 0) {
      windows[0].show();
      windows[0].focus();
    }
  });
  notification.show();
}
function showDingIslandNotification(data) {
  showIslandWindow(data);
  updateTrayIcon(true);
}
function showNotification(data) {
  notificationHistory.push(data);
  if (notificationHistory.length > 100) {
    notificationHistory.shift();
  }
  switch (data.level) {
    case "urgent":
      showDingIslandNotification(data);
      showSystemNotification(data);
      break;
    case "important":
      showDingIslandNotification(data);
      break;
    case "normal":
    default:
      showSystemNotification(data);
      break;
  }
}
function handleNotificationAction(action) {
  const notification = notificationHistory.find((n) => n.id === action.notificationId);
  if (!notification) {
    console.warn("[Ddo Ding] Notification not found:", action.notificationId);
    return;
  }
  switch (action.action) {
    case "complete":
      updateTrayIcon(false);
      break;
    case "snooze":
      setTimeout(() => {
        showNotification(notification);
      }, 5 * 60 * 1e3);
      break;
    case "view":
      const windows = BrowserWindow2.getAllWindows();
      if (windows.length > 0) {
        windows[0].show();
        windows[0].focus();
      }
      break;
  }
}
function getNotificationHistory() {
  return [...notificationHistory].reverse();
}
function connectNotify() {
  const WS_URL = process.env.NOTIFY_WS_URL || "ws://localhost:8080/ws/notify";
  try {
    console.log("[Ddo Ding] Connecting to notification service...", WS_URL);
    let pollInterval = null;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch("http://localhost:8080/api/notifications/subscribe");
          if (response.ok) {
            const data = await response.json();
            if (data.notifications && data.notifications.length > 0) {
              data.notifications.forEach((n) => {
                showNotification(n);
              });
            }
          }
        } catch {
        }
      }, 1e4);
    };
    startPolling();
    process.on("exit", () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    });
  } catch (error) {
    console.error("[Ddo Ding] Notification service connection failed:", error);
  }
}

// electron/windows/mainWindow.ts
import { BrowserWindow as BrowserWindow3, app as app3 } from "electron";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var mainWindow = null;
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

// electron/store.ts
import Store from "electron-store";
var defaults = {
  notificationLevel: "all",
  soundEnabled: true,
  autoStart: false,
  theme: "system"
};
var storeInstance = null;
function getStore() {
  if (!storeInstance) {
    storeInstance = new Store({
      name: "ddo-ding-config",
      defaults
    });
  }
  return storeInstance;
}

// electron/ipc.ts
function initIpcHandlers() {
  ipcMain.handle("config:get", () => {
    const store = getStore();
    return store.store;
  });
  ipcMain.handle("config:set", (_event, key, value) => {
    const store = getStore();
    store.set(key, value);
    return true;
  });
  ipcMain.on("notification:action", (_event, action) => {
    handleNotificationAction(action);
  });
  ipcMain.on("window:toggle", () => {
    toggleMainWindow();
  });
  ipcMain.handle("notification:history", () => {
    return getNotificationHistory();
  });
  console.log("[Ddo Ding] IPC handlers initialized");
}

// electron/main.ts
var __dirname3 = path4.dirname(fileURLToPath3(import.meta.url));
var mainWindow2 = null;
var tray2 = null;
var VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
var IS_DEV = !app4.isPackaged;
var APP_ICON_PATH = getAppIconPath();
var gotSingleInstanceLock = app4.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app4.quit();
}
function triggerTestIsland() {
  const testNotification = {
    id: `test-${Date.now()}`,
    title: "Test Notification",
    body: "This is a test notification from Ddo Ding",
    level: "important",
    timestamp: Date.now()
  };
  showIslandWindow(testNotification);
  console.log("[Ddo Ding] Test notification triggered");
}
async function createMainWindow() {
  mainWindow2 = new BrowserWindow4({
    width: 1414,
    height: 824,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path4.join(__dirname3, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    // 启动时隐藏，通过托盘或快捷键控制显示
    title: "Ddo Ding",
    icon: APP_ICON_PATH,
    autoHideMenuBar: true
    // 自动隐藏菜单栏
  });
  if (IS_DEV) {
    await mainWindow2.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await mainWindow2.loadFile(path4.join(__dirname3, "../dist/index.html"));
  }
  mainWindow2.on("closed", () => {
    mainWindow2 = null;
  });
  return mainWindow2;
}
function registerGlobalShortcuts() {
  const toggleWindowRegistered = globalShortcut.register("CommandOrControl+Shift+D", async () => {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      if (mainWindow2.isVisible()) {
        mainWindow2.hide();
      } else {
        mainWindow2.show();
        mainWindow2.focus();
      }
    } else {
      mainWindow2 = await createMainWindow();
      mainWindow2.show();
      mainWindow2.focus();
    }
  });
  console.log(`[Ddo Ding] Shortcut CommandOrControl+Shift+D ${toggleWindowRegistered ? "registered" : "failed to register"}`);
  if (IS_DEV) {
    const testIslandRegistered = globalShortcut.register("CommandOrControl+Shift+T", triggerTestIsland);
    console.log(`[Ddo Ding] Shortcut CommandOrControl+Shift+T ${testIslandRegistered ? "registered" : "failed to register"}`);
    if (!testIslandRegistered) {
      const fallbackIslandRegistered = globalShortcut.register("CommandOrControl+Alt+T", triggerTestIsland);
      console.log(`[Ddo Ding] Shortcut CommandOrControl+Alt+T ${fallbackIslandRegistered ? "registered as fallback" : "failed to register as fallback"}`);
      if (mainWindow2) {
        mainWindow2.webContents.on("before-input-event", (_event, input) => {
          const isFocusedTestShortcut = input.type === "keyDown" && input.control && input.shift && input.key.toUpperCase() === "T";
          if (isFocusedTestShortcut) {
            triggerTestIsland();
          }
        });
      }
    }
  }
}
function getMainWindow2() {
  return mainWindow2;
}
async function initElectron() {
  if (tray2) {
    destroyTray();
    tray2 = null;
  }
  initIpcHandlers();
  await createMainWindow();
  tray2 = createTray(() => getMainWindow2());
  registerGlobalShortcuts();
  connectNotify();
  console.log("[Ddo Ding] Electron initialized successfully");
  console.log("[Ddo Ding] Shortcuts: Ctrl+Shift+D (toggle window), Ctrl+Shift+T (test island, dev only), Ctrl+Alt+T (fallback when registration conflicts)");
}
if (gotSingleInstanceLock) {
  app4.on("second-instance", () => {
    if (mainWindow2) {
      if (!mainWindow2.isVisible()) {
        mainWindow2.show();
      }
      if (mainWindow2.isMinimized()) {
        mainWindow2.restore();
      }
      mainWindow2.focus();
    }
  });
  app4.whenReady().then(() => {
    initElectron().catch(console.error);
  });
}
app4.on("window-all-closed", () => {
});
app4.on("activate", () => {
  if (BrowserWindow4.getAllWindows().length === 0) {
    initElectron();
  }
});
app4.on("will-quit", () => {
  globalShortcut.unregisterAll();
  destroyTray();
});
export {
  getMainWindow2 as getMainWindow,
  initElectron
};
