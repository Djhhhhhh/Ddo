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
  const windowWidth = 520
  const windowHeight = 340
  const preloadPath = getPreloadPath()

  console.log('[IslandWindow] Creating new BrowserWindow')
  console.log('[IslandWindow] Using preload path:', preloadPath)

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
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath,
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

  function flushPendingNotification(): void {
    if (!pendingNotification || !islandWindow || islandWindow.isDestroyed()) {
      return
    }

    console.log('[IslandWindow] Sending pending notification to renderer')
    islandWindow.webContents.send('island:show', pendingNotification)
    console.log('[IslandWindow] notification sent')
    pendingNotification = null
  }

  // When ready, show and send pending notification
  islandWindow.once('ready-to-show', () => {
    console.log('[IslandWindow] ready-to-show event')
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.show()
      console.log('[IslandWindow] window shown')
    }
  })

  islandWindow.webContents.on('did-finish-load', () => {
    console.log('[IslandWindow] did-finish-load')
    setTimeout(() => {
      flushPendingNotification()
    }, 200)
  })

  islandWindow.webContents.on('console-message', (_event, level, message) => {
    console.log(`[IslandWindow:renderer:${level}] ${message}`)
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
  }
}

export function getIslandWindow(): BrowserWindow | null {
  return islandWindow
}
