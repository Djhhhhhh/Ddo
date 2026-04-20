// electron/tray.ts
import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var tray = null;
var hasNotification = false;
function getProjectRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return process.cwd();
}
function getTrayIcon(notify = false) {
  const iconsDir = path.join(getProjectRoot(), "public", "icons");
  const iconFile = notify ? "icon-active.png" : "icon.png";
  try {
    const iconPath = path.join(iconsDir, iconFile);
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
function createTrayMenu(getMainWindow) {
  return Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: "Settings",
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("navigate", "/config");
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
function createTray(getMainWindow) {
  if (tray) {
    return tray;
  }
  console.log("[Tray] Creating tray, project root:", getProjectRoot());
  const icon = getTrayIcon(hasNotification);
  console.log("[Tray] Icon created, isEmpty:", icon.isEmpty());
  tray = new Tray(icon);
  tray.setToolTip("Ddo Ding");
  tray.setContextMenu(createTrayMenu(getMainWindow));
  tray.on("click", () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  tray.on("right-click", () => {
    tray?.setContextMenu(createTrayMenu(getMainWindow));
  });
  return tray;
}
function updateTrayIcon(notify) {
  if (tray && notify !== hasNotification) {
    hasNotification = notify;
    tray.setImage(getTrayIcon(notify));
  }
}
function getTray() {
  return tray;
}
export {
  createTray,
  getTray,
  updateTrayIcon
};
