// Electron 预加载 API 类型定义

export interface NotificationChannels {
  island: boolean
  system: boolean
}

export interface NotificationData {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
  type?: string
  taskName?: string
  status?: string
  timerUUID?: string
  channels?: NotificationChannels
}

export interface NotificationAction {
  notificationId: string
  action: 'complete' | 'snooze' | 'view'
}

export interface AppConfig {
  notificationLevel: 'all' | 'important' | 'urgent'
  soundEnabled: boolean
  autoStart: boolean
  theme: 'light' | 'dark' | 'system'
  timerIslandEnabled: boolean
  timerSystemNotificationEnabled: boolean
}

export interface DdoElectronAPI {
  // 通知事件监听
  onNotification: (callback: (data: NotificationData) => void) => void
  onIslandShow: (callback: (data: NotificationData) => void) => void
  removeNotificationListener: () => void

  // 通知操作
  sendNotificationAction: (action: NotificationAction) => void

  // 窗口控制
  toggleWindow: () => void
  hideIsland: () => void

  // 配置
  getConfig: () => Promise<AppConfig>
  setConfig: (key: string, value: unknown) => Promise<boolean>
}

declare global {
  interface Window {
    ddoElectron: DdoElectronAPI
  }
}

export {}