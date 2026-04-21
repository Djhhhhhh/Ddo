import { ipcMain } from 'electron'
import { handleNotificationAction, getNotificationHistory } from './notification.js'
import { toggleMainWindow } from './windows/mainWindow.js'
import { getStore } from './store.js'
import { hideIslandWindow } from './windows/islandWindow.js'

export function initIpcHandlers(): void {
  // Get config
  ipcMain.handle('config:get', () => {
    const store = getStore()
    return store.store
  })

  // Set config
  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    const store = getStore()
    store.set(key, value)
    return true
  })

  // Notification action
  ipcMain.on('notification:action', (_event, action) => {
    handleNotificationAction(action)
  })

  // Window control
  ipcMain.on('window:toggle', () => {
    toggleMainWindow()
  })

  // Get notification history
  ipcMain.handle('notification:history', () => {
    return getNotificationHistory()
  })

  // Hide island window
  ipcMain.on('island:hide', () => {
    hideIslandWindow()
  })

  console.log('[Ddo Ding] IPC handlers initialized')
}

// IPC channel definitions
export const IPC_CHANNELS = {
  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // Notification
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_ACTION: 'notification:action',
  NOTIFICATION_HISTORY: 'notification:history',

  // Window
  WINDOW_TOGGLE: 'window:toggle',

  // Island
  ISLAND_HIDE: 'island:hide'
} as const