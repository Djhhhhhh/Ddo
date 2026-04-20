import { Notification, BrowserWindow } from 'electron'
import { showIslandWindow } from './windows/islandWindow'
import { updateTrayIcon } from './tray'

export interface NotificationData {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
}

export interface NotificationAction {
  id: string
  label: string
  type: 'complete' | 'snooze' | 'view'
}

// Notification history
const notificationHistory: NotificationData[] = []

// Show system notification
export function showSystemNotification(data: NotificationData): void {
  if (!Notification.isSupported()) {
    console.warn('[Ddo Ding] System notifications not supported')
    return
  }

  const notification = new Notification({
    title: data.title,
    body: data.body,
    silent: data.level === 'normal'
  })

  notification.on('click', () => {
    // Click to open main window
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].show()
      windows[0].focus()
    }
  })

  notification.show()
}

// Show island notification
export function showDingIslandNotification(data: NotificationData): void {
  showIslandWindow(data)
  updateTrayIcon(true)
}

// Show notification (based on level)
export function showNotification(data: NotificationData): void {
  // Store in history
  notificationHistory.push(data)
  if (notificationHistory.length > 100) {
    notificationHistory.shift()
  }

  // Choose display method based on level
  switch (data.level) {
    case 'urgent':
      // Urgent: show both island and system notification
      showDingIslandNotification(data)
      showSystemNotification(data)
      break
    case 'important':
      // Important: show island only
      showDingIslandNotification(data)
      break
    case 'normal':
    default:
      // Normal: system notification only
      showSystemNotification(data)
      break
  }
}

// Handle notification action
export function handleNotificationAction(action: {
  notificationId: string
  action: 'complete' | 'snooze' | 'view'
}): void {
  const notification = notificationHistory.find(n => n.id === action.notificationId)

  if (!notification) {
    console.warn('[Ddo Ding] Notification not found:', action.notificationId)
    return
  }

  switch (action.action) {
    case 'complete':
      updateTrayIcon(false)
      break
    case 'snooze':
      // Reshow after 5 minutes
      setTimeout(() => {
        showNotification(notification)
      }, 5 * 60 * 1000)
      break
    case 'view':
      // Open main window
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].show()
        windows[0].focus()
      }
      break
  }
}

// Get notification history
export function getNotificationHistory(): NotificationData[] {
  return [...notificationHistory].reverse()
}

// Connect to backend notification service
export function connectNotify(): void {
  const WS_URL = process.env.NOTIFY_WS_URL || 'ws://localhost:8080/ws/notify'

  try {
    console.log('[Ddo Ding] Connecting to notification service...', WS_URL)

    // Backup polling mechanism
    let pollInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:8080/api/notifications/subscribe')
          if (response.ok) {
            const data = await response.json()
            if (data.notifications && data.notifications.length > 0) {
              data.notifications.forEach((n: NotificationData) => {
                showNotification(n)
              })
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 10000) // Poll every 10 seconds
    }

    startPolling()

    process.on('exit', () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    })
  } catch (error) {
    console.error('[Ddo Ding] Notification service connection failed:', error)
  }
}