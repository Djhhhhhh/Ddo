import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray: Tray | null = null
let hasNotification = false

// 获取项目根目录
function getProjectRoot(): string {
  if (app.isPackaged) {
    return app.getAppPath()
  }
  // 开发模式使用 process.cwd()
  return process.cwd()
}

function getTrayIcon(notify = false): nativeImage {
  const iconsDir = path.join(getProjectRoot(), 'public', 'icons')
  const iconFile = notify ? 'icon-active.png' : 'icon.png'

  try {
    const iconPath = path.join(iconsDir, iconFile)
    console.log('[Tray] Loading icon:', iconPath)
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      return img.resize({ width: 16, height: 16 })
    }
  } catch (e) {
    console.log('[Tray] Icon load failed:', e)
  }

  // 创建简单的图标
  return createFallbackIcon(notify)
}

function createFallbackIcon(active: boolean): nativeImage {
  const size = 16
  const color = active ? '#dc2626' : '#374151'

  const buffer = Buffer.alloc(size * size * 4)
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 1

  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - centerX + 0.5
      const dy = y - centerY + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= radius) {
        buffer[idx] = r
        buffer[idx + 1] = g
        buffer[idx + 2] = b
        buffer[idx + 3] = 255
      } else {
        buffer[idx] = 0
        buffer[idx + 1] = 0
        buffer[idx + 2] = 0
        buffer[idx + 3] = 0
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size })
}

function createTrayMenu(getMainWindow: () => Electron.BrowserWindow | null): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('navigate', '/config')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])
}

export function createTray(getMainWindow: () => Electron.BrowserWindow | null): Tray {
  if (tray) {
    return tray
  }

  console.log('[Tray] Creating tray, project root:', getProjectRoot())
  const icon = getTrayIcon(hasNotification)
  console.log('[Tray] Icon created, isEmpty:', icon.isEmpty())

  tray = new Tray(icon)
  tray.setToolTip('Ddo Ding')
  tray.setContextMenu(createTrayMenu(getMainWindow))

  tray.on('click', () => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  tray.on('right-click', () => {
    tray?.setContextMenu(createTrayMenu(getMainWindow))
  })

  return tray
}

export function updateTrayIcon(notify: boolean): void {
  if (tray && notify !== hasNotification) {
    hasNotification = notify
    tray.setImage(getTrayIcon(notify))
  }
}

export function getTray(): Tray | null {
  return tray
}
