import { BrowserWindow, screen, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getProjectRoot(): string {
  if (app.isPackaged) {
    return app.getAppPath()
  }
  return process.cwd()
}

function getPreloadPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist-electron', 'preload.js')
  }
  return path.join(__dirname, 'preload.js')
}

let islandWindow: BrowserWindow | null = null
let pendingNotification: any = null

export interface NotificationData {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
}

export function createIslandWindow(): BrowserWindow {
  if (islandWindow && !islandWindow.isDestroyed()) {
    return islandWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  console.log('[IslandWindow] Creating new BrowserWindow')

  islandWindow = new BrowserWindow({
    width: 360,
    height: 160,
    x: screenWidth - 380,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  islandWindow.setVisibleOnAllWorkspaces(true)

  // Load page
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = `${process.env.VITE_DEV_SERVER_URL}#/island`
    console.log('[IslandWindow] Loading URL:', url)
    islandWindow.loadURL(url).then(() => {
      console.log('[IslandWindow] loadURL succeeded')
    }).catch((err) => {
      console.error('[IslandWindow] loadURL failed:', err)
    })
  } else {
    islandWindow.loadFile(path.join(getProjectRoot(), 'dist', 'index.html'), {
      hash: '/island'
    })
  }

  // When ready, show and send pending notification
  islandWindow.once('ready-to-show', () => {
    console.log('[IslandWindow] ready-to-show event')
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.show()
      console.log('[IslandWindow] window shown')

      // Send pending notification after a small delay to ensure Vue is mounted
      if (pendingNotification) {
        console.log('[IslandWindow] Sending pending notification to renderer')
        setTimeout(() => {
          if (islandWindow && !islandWindow.isDestroyed()) {
            islandWindow.webContents.send('island:show', pendingNotification)
            console.log('[IslandWindow] notification sent')
            pendingNotification = null
          }
        }, 500) // 500ms delay to ensure Vue is mounted
      }
    }
  })

  islandWindow.webContents.on('did-finish-load', () => {
    console.log('[IslandWindow] did-finish-load')
  })

  islandWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[IslandWindow] did-fail-load:', errorCode, errorDescription)
  })

  islandWindow.on('closed', () => {
    console.log('[IslandWindow] closed')
    islandWindow = null
  })

  return islandWindow
}

export function hideIslandWindow(): void {
  if (islandWindow && !islandWindow.isDestroyed()) {
    islandWindow.hide()
  }
}

export function showIslandWindow(notification: NotificationData): void {
  console.log('[IslandWindow] showIslandWindow called:', notification.title)

  if (!islandWindow || islandWindow.isDestroyed()) {
    console.log('[IslandWindow] Creating window with pending notification')
    pendingNotification = notification
    createIslandWindow()
  } else {
    // Window exists, send directly
    console.log('[IslandWindow] Sending notification directly to existing window')
    islandWindow.webContents.send('island:show', notification)

    if (!islandWindow.isVisible()) {
      islandWindow.show()
    }

    setTimeout(() => {
      hideIslandWindow()
    }, 5000)
  }
}

export function getIslandWindow(): BrowserWindow | null {
  return islandWindow
}
