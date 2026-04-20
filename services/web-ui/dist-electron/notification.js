// electron/notification.ts
import { Notification, BrowserWindow as BrowserWindow2 } from "electron";

// electron/windows/islandWindow.ts
import { BrowserWindow, screen, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function getProjectRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return process.cwd();
}
function getPreloadPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "dist-electron", "preload.js");
  }
  return path.join(__dirname, "preload.js");
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
    islandWindow.loadFile(path.join(getProjectRoot(), "dist", "index.html"), {
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

// electron/tray.ts
import { Tray, Menu, nativeImage, app as app2 } from "electron";
import path2 from "node:path";
var tray = null;
var hasNotification = false;
function getProjectRoot2() {
  if (app2.isPackaged) {
    return app2.getAppPath();
  }
  return process.cwd();
}
function getAppIconPath(notify = false) {
  const iconsDir = path2.join(getProjectRoot2(), "public", "icons");
  return path2.join(iconsDir, notify ? "icon-active.svg" : "icon.svg");
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
function updateTrayIcon(notify) {
  if (tray && notify !== hasNotification) {
    hasNotification = notify;
    tray.setImage(getTrayIcon(notify));
  }
}

// electron/notification.ts
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
export {
  connectNotify,
  getNotificationHistory,
  handleNotificationAction,
  showDingIslandNotification,
  showNotification,
  showSystemNotification
};
