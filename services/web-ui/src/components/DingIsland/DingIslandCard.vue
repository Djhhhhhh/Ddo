<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'

interface Notification {
  id: string
  title: string
  body: string
  level: 'normal' | 'important' | 'urgent'
  timestamp: number
  taskName?: string
  description?: string
  status?: string
}

const notification = ref<Notification | null>(null)
const queue = ref<Notification[]>([])

const isVisible = ref(false)
const isHovered = ref(false)
const isDone = ref(false)

const expandRef = ref<HTMLElement | null>(null)
const expandHeight = ref(0)

onMounted(() => {
  window.ddoElectron?.onIslandShow(addToQueue)
})

onUnmounted(() => {
  window.ddoElectron?.removeNotificationListener?.()
})

function addToQueue(n: Notification) {
  if (notification.value?.id === n.id || queue.value.find(q => q.id === n.id)) return
  queue.value.push(n)
  if (!notification.value) showNext()
}

async function showNext() {
  const next = queue.value.shift()
  if (!next) {
    notification.value = null
    return
  }

  notification.value = next
  isDone.value = false

  await nextTick()
  measureHeight()

  requestAnimationFrame(() => {
    isVisible.value = true
  })
}

function measureHeight() {
  if (expandRef.value) {
    expandHeight.value = expandRef.value.scrollHeight
  }
}

function dismiss() {
  isVisible.value = false
  setTimeout(() => {
    showNext()
    // 如果队列为空，通知主进程隐藏窗口
    if (queue.value.length === 0 && !notification.value) {
      window.ddoElectron?.hideIsland?.()
    }
  }, 300)
}

function handleClick() {
  if (!notification.value || isDone.value) return

  window.ddoElectron?.sendNotificationAction?.({
    notificationId: notification.value.id,
    action: 'view'
  })

  isDone.value = true
  setTimeout(dismiss, 1200)
}

async function handleMouseEnter() {
  measureHeight()
  await nextTick()
  requestAnimationFrame(() => {
    isHovered.value = true
  })
}

function handleMouseLeave() {
  isHovered.value = false
}

const displayTitle = computed(() => notification.value?.taskName || notification.value?.title || '')
const displayBody = computed(() => notification.value?.description || notification.value?.body || '')
const queueCount = computed(() => queue.value.length)
</script>

<template>
  <div
    v-if="notification"
    class="island-root"
    :class="{ 'is-visible': isVisible }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- stack -->
    <div
      v-for="(n, i) in queue.slice(0, 2)"
      :key="n.id"
      class="island-stack"
      :style="{ '--i': i }"
    />

    <div
      class="island-shell"
      :class="{ 'is-hovered': isHovered, 'is-done': isDone }"
      :style="{ '--expand-h': expandHeight + 'px' }"
    >
      <div class="island-border" />

      <div class="island-surface">
        <!-- 主行 -->
        <div class="main-row">
          <span class="dot" :class="notification.level" />
          <span class="title">{{ displayTitle }}</span>
          <span v-if="queueCount" class="count">+{{ queueCount }}</span>
        </div>

        <!-- 展开层 -->
        <div class="expand-wrapper">
          <div ref="expandRef" class="expand-content">
            {{ displayBody }}
          </div>
        </div>
      </div>

      <div v-if="isDone" class="done-layer">
        <span class="done-text">✓ 已标记完成</span>
      </div>
    </div>
  </div>
</template>

<style scoped>

/* ================= root ================= */
.island-root {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(-120px) scale(0.96);
  opacity: 0;
  z-index: 9999;
  cursor: pointer;
  user-select: none;

  transition:
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.3s ease;
}

.island-root.is-visible {
  transform: translateX(-50%) translateY(0) scale(1);
  opacity: 1;
}

/* ================= stack ================= */
.island-stack {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.9);

  transform:
    translateY(calc(6px * (var(--i) + 1)))
    scale(calc(1 - 0.04 * (var(--i) + 1)));

  opacity: 0.24;
  filter: blur(2px);
}

/* ================= island ================= */
.island-shell {
  --island-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --island-radius: 9999px;
  --island-shadow: 0 12px 36px rgba(255, 255, 255, 0);
  --island-radius-duration: 0.5s;
  position: relative;
  box-shadow: var(--island-shadow);
  border-radius: var(--island-radius);
  will-change: border-radius, box-shadow;

  transition:
    border-radius var(--island-radius-duration) var(--island-ease),
    box-shadow 0.34s var(--island-ease),
    transform 0.2s var(--island-ease);
}

.island-shell.is-hovered {
  --island-radius: 30px;
  --island-shadow: 0 12px 36px rgba(255, 255, 255, 0.06);
}

.island-root:active .island-shell {
  transform: scale(0.985);
}

.island-border {
  position: absolute;
  inset: -1px;
  border-radius: var(--island-radius);
  padding: 1px;
  pointer-events: none;
  opacity: 0;
  will-change: opacity;
  transform: translateZ(0);

  background: conic-gradient(
    from var(--angle, 0deg),
    #1a1a1a,
    #3f3f46,
    #fafafa,
    #3f3f46,
    #1a1a1a
  );

  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  animation: stream-light 2.2s linear infinite;
  animation-play-state: paused;
  transition:
    opacity 0.28s var(--island-ease),
    border-radius var(--island-radius-duration) var(--island-ease);
}

.island-root.is-visible .island-border {
  opacity: 0.72;
  animation-play-state: running;
}

.island-shell.is-hovered .island-border {
  opacity: 1;
}

.island-surface {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  max-width: 340px;
  padding: 10px 20px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: var(--island-radius);
  background: rgba(0, 0, 0, 0.92);
  overflow: hidden;

  transition:
    border-radius var(--island-radius-duration) var(--island-ease),
    background 0.34s var(--island-ease);
}

@property --angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes stream-light {
  to { --angle: 360deg; }
}

/* ================= 主行 ================= */
.main-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

/* ================= 展开（自适应高度） ================= */
.expand-wrapper {
  overflow: hidden;
  height: 0;
  will-change: height;

  transition: height var(--island-radius-duration) var(--island-ease);
}

.island-shell.is-hovered .expand-wrapper {
  height: var(--expand-h);
}

.expand-content {
  padding-top: 8px;
  max-width: 260px;
  color: #bfbfbf;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  transform: translateY(-8px);
  opacity: 0;

  transition:
    transform var(--island-radius-duration) var(--island-ease),
    opacity calc(var(--island-radius-duration) - 0.1s) var(--island-ease);
}

.island-shell.is-hovered .expand-content {
  transform: translateY(0);
  opacity: 1;
}

/* ================= text ================= */
.title {
  flex: 1;
  min-width: 0;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
}

.dot.normal { background: #737373; }
.dot.important { background: #a3a3a3; }
.dot.urgent { background: #fff; }

.count {
  margin-left: auto;
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: #fff;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

/* ================= done ================= */
.done-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--island-radius);
  border: 1px solid rgba(134, 239, 172, 0.3);
  background: rgba(22, 163, 74, 0.16);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);

  transition: border-radius var(--island-radius-duration) var(--island-ease);
}

.done-text {
  color: #dcfce7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

</style>