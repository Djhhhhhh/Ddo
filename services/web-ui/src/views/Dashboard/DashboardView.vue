<script setup lang="ts">
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'

// Placeholder for Dashboard functionality
const services = [
  { name: 'CLI', status: 'running', version: '0.1.0' },
  { name: 'server-go', status: 'running', version: '0.1.0' },
  { name: 'llm-py', status: 'running', version: '0.1.0' },
  { name: 'MySQL', status: 'running', version: '8.0' }
]
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-medium mb-8 text-gray-900">Dashboard</h1>

    <!-- Service Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card v-for="service in services" :key="service.name">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-900">{{ service.name }}</span>
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
        </div>
        <p class="text-sm text-gray-500">v{{ service.version }}</p>
        <p class="text-xs text-green-600 mt-1">{{ service.status }}</p>
      </Card>
    </div>

    <!-- Placeholder Content -->
    <Card>
      <h2 class="font-medium text-gray-900 mb-4">监控面板</h2>
      <p class="text-gray-500">
        Dashboard 功能正在开发中，敬请期待...
      </p>
      <p class="text-sm text-gray-400 mt-2">
        计划功能：服务状态、统计数据、图表可视化
      </p>
    </Card>
  </div>
</template>