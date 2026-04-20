import { contextBridge, ipcRenderer } from 'electron'

// Define exposed API
const api = {
  // Notification event (from main process)
  onNotification: (callback: (data: NotificationData) => void) => {
    ipcRenderer.on('notification:show', (_event, data) => callback(data))
  },

  // Island notification event
  onIslandShow: (callback: (data: NotificationData) => void) => {
    ipcRenderer.on('island:show', (_event, data) => callback(data))
  },

  // Notification action (to main process)
  sendNotificationAction: (action: NotificationAction) => {
    ipcRenderer.send('notification:action', action)
  },

  // Window control
  toggleWindow: () => {
    ipcRenderer.send('window:toggle')
  },

  // Get config
  getConfig: () => ipcRenderer.invoke('config:get'),

  // Update config
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),

  // Remove notification listeners
  removeNotificationListener: () => {
    ipcRenderer.removeAllListeners('notification:show')
    ipcRenderer.removeAllListeners('island:show')
  }
}

// Type definitions
interface NotificationData {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
}

interface NotificationAction {
  notificationId: string
  action: 'complete' | 'snooze' | 'view'
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('ddoElectron', api)

// Type declaration (for TypeScript usage)
export type DdoElectronAPI = typeof api