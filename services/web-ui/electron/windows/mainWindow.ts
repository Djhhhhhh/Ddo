import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM 中 __dirname 等效
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

export interface MainWindowOptions {
  width?: number
  height?: number
  show?: boolean
}

export function createMainWindow(options: MainWindowOptions = {}): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  const {
    width = 1414,
    height = 824,
    show = false
  } = options

  // Get preload path
  const preloadPath = app.isPackaged
    ? path.join(process.resourcesPath, 'dist-electron', 'preload.js')
    : path.join(__dirname, '..', 'preload.js')

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
    title: 'Ddo Ding',
    backgroundColor: '#ffffff'
  })

  // Load Web UI
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL(process.env.DDO_WEB_UI_URL || process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:50003')
    // DevTools opened manually when needed
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function showMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  }
}

export function navigateMainWindow(hashPath: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  const isDev = !app.isPackaged
  if (isDev) {
    const baseUrl = process.env.DDO_WEB_UI_URL || process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:50003'
    mainWindow.loadURL(`${baseUrl}#${hashPath}`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: hashPath
    })
  }

  mainWindow.show()
  mainWindow.focus()
}

export function hideMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
}

export function toggleMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  }
}
