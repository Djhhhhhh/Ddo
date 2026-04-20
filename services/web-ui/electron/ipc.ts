import { ipcMain } from 'electron'
import { handleNotificationAction, getNotificationHistory } from './notification'
import { getMainWindow, toggleMainWindow } from './windows/mainWindow'
import { getStore } from './store'

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
  WINDOW_TOGGLE: 'window:toggle'
} as const