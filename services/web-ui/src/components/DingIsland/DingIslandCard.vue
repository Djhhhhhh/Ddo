<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Notification {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
}

const notification = ref<Notification | null>(null)
const isHovered = ref(false)

onMounted(() => {
  console.log('[IslandCard] Vue component mounted')
  console.log('[IslandCard] window.ddoElectron:', (window as any).ddoElectron)

  const electronAPI = (window as any).ddoElectron
  if (electronAPI) {
    console.log('[IslandCard] Setting up onIslandShow listener')
    electronAPI.onIslandShow((data: Notification) => {
      console.log('[IslandCard] Received notification:', data)
      notification.value = data
      isHovered.value = false
    })
    console.log('[IslandCard] Listener setup complete')
  } else {
    console.log('[IslandCard] ERROR: electronAPI not found on window')
  }
})

onUnmounted(() => {
  console.log('[IslandCard] unmounting')
  const electronAPI = (window as any).ddoElectron
  if (electronAPI?.removeNotificationListener) {
    electronAPI.removeNotificationListener()
  }
})

function handleDismiss() {
  console.log('[IslandCard] dismissed by click')
  notification.value = null
}

function handleAction(action: 'complete' | 'snooze' | 'view') {
  console.log('[IslandCard] action:', action)
  if (!notification.value) return

  const electronAPI = (window as any).ddoElectron
  if (electronAPI?.sendNotificationAction) {
    electronAPI.sendNotificationAction({
      notificationId: notification.value.id,
      action
    })
  }

  notification.value = null
}
</script>

<template>
  <div
    v-if="notification"
    class="island-card"
    @click="handleDismiss"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="island-content">
      <div class="island-header">
        <div class="island-title-row">
          <h3 class="island-title">{{ notification.title }}</h3>
          <span
            v-if="notification.level !== 'normal'"
            class="island-badge"
          >
            {{ notification.level === 'urgent' ? 'Urgent' : 'Important' }}
          </span>
        </div>
        <p class="island-body">{{ notification.body }}</p>
      </div>

      <div class="island-actions">
        <button
          @click.stop="handleAction('complete')"
          class="island-btn island-btn-primary"
        >
          Done
        </button>
        <button
          @click.stop="handleAction('snooze')"
          class="island-btn island-btn-secondary"
        >
          Snooze
        </button>
        <button
          @click.stop="handleAction('view')"
          class="island-btn island-btn-secondary"
        >
          View
        </button>
      </div>

      <div v-if="isHovered" class="island-hint">
        Click to dismiss
      </div>
    </div>
  </div>
</template>

<style scoped>
.island-card {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 360px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  border-left: 4px solid #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.island-content {
  padding: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.island-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.island-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.island-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.island-badge {
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #111827;
  color: #ffffff;
}

.island-body {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.island-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.island-btn {
  flex: 1;
  padding: 8px 0;
  font-size: 12px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  outline: none;
}

.island-btn-primary {
  background: #111827;
  color: #ffffff;
}

.island-btn-primary:hover {
  background: #1f2937;
}

.island-btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.island-btn-secondary:hover {
  background: #e5e7eb;
}

.island-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}
</style>
