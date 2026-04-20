<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { DdoElectronAPI } from '@/types/electron'

interface Notification {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
}

const notification = ref<Notification | null>(null)
const isVisible = ref(false)
const isHovered = ref(false)
const queue = ref<Notification[]>([])

onMounted(() => {
  const electronAPI: DdoElectronAPI | undefined = window.ddoElectron
  if (electronAPI) {
    electronAPI.onIslandShow((data: Notification) => {
      addToQueue(data)
    })
  }
})

onUnmounted(() => {
  const electronAPI: DdoElectronAPI | undefined = window.ddoElectron
  if (electronAPI?.removeNotificationListener) {
    electronAPI.removeNotificationListener()
  }
})

// 添加通知到队列
function addToQueue(data: Notification) {
  // 避免重复
  const exists = queue.value.find(n => n.id === data.id) ||
    (notification.value?.id === data.id)
  if (exists) return

  queue.value.push(data)

  // 如果没有正在显示的通知，立即显示
  if (!notification.value) {
    showNext()
  }
}

// 显示队列中的下一个通知
function showNext() {
  if (queue.value.length === 0) {
    notification.value = null
    return
  }

  const next = queue.value.shift()
  if (next) {
    notification.value = next
    // 下一帧显示动画
    requestAnimationFrame(() => {
      isVisible.value = true
    })
  }
}

// 关闭当前通知并显示下一个
function dismiss() {
  isVisible.value = false

  // 动画结束后显示下一个
  setTimeout(() => {
    showNext()
  }, 300)
}

function handleClick() {
  dismiss()
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}

// 获取队列中待显示的数量
function getPendingCount(): number {
  return queue.value.length
}
</script>

<template>
  <div
    v-if="notification"
    class="island-container"
    :class="{ 'island-visible': isVisible }"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="island-pill" :class="{ 'island-pill-hovered': isHovered }">
      <span class="island-dot" :class="`island-dot-${notification.level}`"></span>
      <span class="island-text">{{ notification.title }}</span>
      <span v-if="notification.body" class="island-subtext">{{ notification.body }}</span>
      <span v-if="queue.length > 0" class="island-count">+{{ queue.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.island-container {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

.island-visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.island-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: #000000;
  border-radius: 9999px;
  max-width: 400px;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* 流光边框 - 一道光沿边框流动 */
.island-pill::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 9999px;
  padding: 1px;
  background: conic-gradient(
    from var(--angle, 0deg),
    #262626 0deg,
    #404040 30deg,
    #ffffff 60deg,
    #404040 90deg,
    #262626 120deg,
    #262626 360deg
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: stream-light 2s linear infinite;
  opacity: 0.8;
}

@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes stream-light {
  from {
    --angle: 0deg;
  }
  to {
    --angle: 360deg;
  }
}

/* 悬浮效果 */
.island-pill-hovered {
  transform: scale(1.02);
}

.island-pill-hovered::before {
  opacity: 1;
  background: conic-gradient(
    from var(--angle, 0deg),
    #404040 0deg,
    #737373 30deg,
    #ffffff 60deg,
    #737373 90deg,
    #404040 120deg,
    #404040 360deg
  );
}

.island-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.island-dot-normal {
  background: #737373;
}

.island-dot-important {
  background: #a3a3a3;
}

.island-dot-urgent {
  background: #ffffff;
}

.island-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.island-subtext {
  font-size: 13px;
  color: #a3a3a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-left: 1px solid #262626;
  padding-left: 10px;
  margin-left: 4px;
}

.island-count {
  font-size: 11px;
  font-weight: 500;
  color: #000000;
  background: #ffffff;
  padding: 2px 6px;
  border-radius: 9999px;
  margin-left: 6px;
  flex-shrink: 0;
}
</style>
