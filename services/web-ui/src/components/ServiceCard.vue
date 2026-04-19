<script setup lang="ts">
defineProps<{
  name: string
  status: 'running' | 'stopped' | 'connected' | 'disconnected' | string
  version?: string
  uptime?: string
}>()

function getStatusColor(status: string): string {
  const running = ['running', 'connected', 'ok'].includes(status)
  return running ? 'bg-green-500' : 'bg-red-500'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    running: 'Running',
    stopped: 'Stopped',
    connected: 'Connected',
    disconnected: 'Disconnected',
    ok: 'OK'
  }
  return map[status] || status
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-6 min-w-[160px]">
    <div class="flex items-center justify-between mb-3">
      <span class="font-medium text-gray-900 text-base">{{ name }}</span>
      <span :class="['w-2.5 h-2.5 rounded-full', getStatusColor(status)]"></span>
    </div>
    <p v-if="version" class="text-sm text-gray-500">v{{ version }}</p>
    <p v-if="uptime" class="text-xs text-gray-400 mt-1">{{ uptime }}</p>
    <p :class="['text-xs mt-2', status === 'running' || status === 'connected' ? 'text-green-600' : 'text-red-500']">
      {{ getStatusText(status) }}
    </p>
  </div>
</template>
