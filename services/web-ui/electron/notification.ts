import { Notification, BrowserWindow } from 'electron'
import { showIslandWindow } from './windows/islandWindow.js'
import { navigateMainWindow } from './windows/mainWindow.js'
import { updateTrayIcon } from './tray.js'
import { getStore } from './store.js'

export interface NotificationData {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
  type?: string
  taskName?: string
  description?: string
  status?: string
  timerUUID?: string
  channels?: {
    island: boolean
    system: boolean
  }
}

export interface NotificationAction {
  id: string
  label: string
  type: 'complete' | 'snooze' | 'view'
}

interface NotificationSubscribeResponse {
  notifications?: NotificationData[]
}

// Notification history
const notificationHistory: NotificationData[] = []

// Track processed notification IDs to prevent duplicates within short period
const processedNotificationIds = new Set<string>()
const PROCESSED_ID_EXPIRY_MS = 30000 // 30 seconds

// Clean up old processed IDs periodically
function cleanupProcessedIds(): void {
  // Keep only recent IDs, this is a simple cleanup
  // In production, you might want to use a time-based expiry
  if (processedNotificationIds.size > 1000) {
    processedNotificationIds.clear()
  }
}

// Check if notification was recently processed
function isRecentlyProcessed(id: string): boolean {
  return processedNotificationIds.has(id)
}

// Mark notification as processed
function markAsProcessed(id: string): void {
  processedNotificationIds.add(id)
  // Auto cleanup when size grows too large
  if (processedNotificationIds.size % 100 === 0) {
    cleanupProcessedIds()
  }
}

function isTimerNotification(data: NotificationData): boolean {
	return data.type === 'scheduled_task'
}

function shouldShowIsland(data: NotificationData): boolean {
	const config = getStore().store
	if (isTimerNotification(data) && !config.timerIslandEnabled) {
		return false
	}
	if (data.channels) {
		return data.channels.island
	}
	return data.level === 'important' || data.level === 'urgent'
}

function shouldShowSystem(data: NotificationData): boolean {
	const config = getStore().store
	if (isTimerNotification(data) && !config.timerSystemNotificationEnabled) {
		return false
	}
	if (data.channels) {
		return data.channels.system
	}
	return data.level === 'normal' || data.level === 'urgent'
}

function navigateToNotificationTarget(data: NotificationData): void {
	if (data.timerUUID) {
		navigateMainWindow(`/timer?timerUuid=${encodeURIComponent(data.timerUUID)}`)
		return
	}

	const windows = BrowserWindow.getAllWindows()
	if (windows.length > 0) {
		windows[0].show()
		windows[0].focus()
	}
}

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
    navigateToNotificationTarget(data)
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
  // Check for duplicate notification
  if (isRecentlyProcessed(data.id)) {
    console.log('[Ddo Ding] Duplicate notification skipped:', data.id)
    return
  }

  // Mark as processed to prevent duplicates
  markAsProcessed(data.id)

  // Store in history
  notificationHistory.push(data)
  if (notificationHistory.length > 100) {
    notificationHistory.shift()
  }

  if (shouldShowIsland(data)) {
    showDingIslandNotification(data)
  }
  if (shouldShowSystem(data)) {
    showSystemNotification(data)
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
      navigateToNotificationTarget(notification)
      break
  }
}

// Get notification history
export function getNotificationHistory(): NotificationData[] {
  return [...notificationHistory].reverse()
}

// Connect to backend notification service
export function connectNotify(): void {
  try {
    console.log('[Ddo Ding] Connecting to notification polling service...')

    let pollInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:8080/api/v1/notifications/subscribe')
          if (response.ok) {
            const data = await response.json() as NotificationSubscribeResponse
            if (data.notifications && data.notifications.length > 0) {
              data.notifications.forEach((n) => {
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