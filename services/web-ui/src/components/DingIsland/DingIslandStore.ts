import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
  completedAt?: number
}

export const useDingIslandStore = defineStore('dingIsland', () => {
  // 当前显示的通知
  const currentNotification = ref<Notification | null>(null)

  // 通知历史
  const notificationHistory = ref<Notification[]>([])

  // 是否连接中
  const isConnected = ref(false)

  // 显示新通知
  function showNotification(notification: Notification): void {
    currentNotification.value = notification

    // 添加到历史记录
    const existing = notificationHistory.value.find(n => n.id === notification.id)
    if (!existing) {
      notificationHistory.value.unshift(notification)
      // 最多保留 100 条
      if (notificationHistory.value.length > 100) {
        notificationHistory.value.pop()
      }
    }
  }

  // 关闭当前通知
  function closeCurrentNotification(): void {
    currentNotification.value = null
  }

  // 标记通知为已完成
  function markComplete(notificationId: string): void {
    const notification = notificationHistory.value.find(n => n.id === notificationId)
    if (notification) {
      notification.completedAt = Date.now()
    }
    if (currentNotification.value?.id === notificationId) {
      currentNotification.value = null
    }
  }

  // 获取未完成的通知
  function getPendingNotifications(): Notification[] {
    return notificationHistory.value.filter(n => !n.completedAt)
  }

  // 清空历史
  function clearHistory(): void {
    notificationHistory.value = []
  }

  // 设置连接状态
  function setConnected(connected: boolean): void {
    isConnected.value = connected
  }

  return {
    currentNotification,
    notificationHistory,
    isConnected,
    showNotification,
    closeCurrentNotification,
    markComplete,
    getPendingNotifications,
    clearHistory,
    setConnected
  }
})
