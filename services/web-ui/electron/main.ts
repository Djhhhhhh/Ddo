import { app, BrowserWindow, globalShortcut, Tray } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTray, destroyTray, getAppIconPath } from './tray'
import { createIslandWindow, showIslandWindow, NotificationData } from './windows/islandWindow'
import { initIpcHandlers } from './ipc'
import { connectNotify } from './notification'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
const IS_DEV = !app.isPackaged
const APP_ICON_PATH = getAppIconPath()
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

function triggerTestIsland(): void {
  const testNotification: NotificationData = {
    id: `test-${Date.now()}`,
    title: 'Test Notification',
    body: 'This is a test notification from Ddo Ding',
    level: 'important',
    timestamp: Date.now()
  }
  showIslandWindow(testNotification)
  console.log('[Ddo Ding] Test notification triggered')
}

async function createMainWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    width: 1414,
    height: 824,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false, // 启动时隐藏，通过托盘或快捷键控制显示
    title: 'Ddo Ding',
    icon: APP_ICON_PATH,
    autoHideMenuBar: true // 自动隐藏菜单栏
  })

  // 加载 Web UI
  if (IS_DEV) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // 生产模式不自动打开 DevTools
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 默认不自动显示窗口，用户可通过托盘或快捷键打开
  // 如需调试，可在 DevTools 控制台执行 window.showMainWindow()

  return mainWindow
}

function registerGlobalShortcuts() {
  // Ctrl+Shift+D: 显示/隐藏窗口
  const toggleWindowRegistered = globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
  console.log(`[Ddo Ding] Shortcut CommandOrControl+Shift+D ${toggleWindowRegistered ? 'registered' : 'failed to register'}`)

  // Ctrl+Shift+T: 测试触发灵动岛（开发模式）
  if (IS_DEV) {
    const testIslandRegistered = globalShortcut.register('CommandOrControl+Shift+T', triggerTestIsland)
    console.log(`[Ddo Ding] Shortcut CommandOrControl+Shift+T ${testIslandRegistered ? 'registered' : 'failed to register'}`)

    if (!testIslandRegistered) {
      const fallbackIslandRegistered = globalShortcut.register('CommandOrControl+Alt+T', triggerTestIsland)
      console.log(`[Ddo Ding] Shortcut CommandOrControl+Alt+T ${fallbackIslandRegistered ? 'registered as fallback' : 'failed to register as fallback'}`)

      if (mainWindow) {
        mainWindow.webContents.on('before-input-event', (_event, input) => {
          const isFocusedTestShortcut = input.type === 'keyDown'
            && input.control
            && input.shift
            && input.key.toUpperCase() === 'T'

          if (isFocusedTestShortcut) {
            triggerTestIsland()
          }
        })
      }
    }
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export async function initElectron(): Promise<void> {
  if (tray) {
    destroyTray()
    tray = null
  }

  // 初始化 IPC 处理器
  initIpcHandlers()

  // 创建主窗口
  await createMainWindow()

  // 创建系统托盘
  tray = createTray(() => getMainWindow())

  // 注册全局快捷键
  registerGlobalShortcuts()

  // 连接后端通知服务
  connectNotify()

  console.log('[Ddo Ding] Electron initialized successfully')
  console.log('[Ddo Ding] Shortcuts: Ctrl+Shift+D (toggle window), Ctrl+Shift+T (test island, dev only), Ctrl+Alt+T (fallback when registration conflicts)')
}

// 应用准备就绪
if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    initElectron().catch(console.error)
  })
}

// 所有窗口关闭时，只隐藏不退出（保持托盘运行）
app.on('window-all-closed', () => {
  // 不退出，保持托盘运行
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    initElectron()
  }
})

app.on('will-quit', () => {
  // 退出时取消所有全局快捷键
  globalShortcut.unregisterAll()
  destroyTray()
})