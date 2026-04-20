<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import ServiceCard from '@/components/ServiceCard.vue'
import StatCard from '@/components/StatCard.vue'
import BarChart from '@/components/Charts/BarChart.vue'
import Button from '@/components/ui/Button.vue'

const store = useDashboardStore()

const lastUpdateTime = computed(() => {
  if (!store.lastUpdate) return '--'
  return store.lastUpdate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const serverGoStatus = computed(() => store.metrics?.services.server_go || 'unknown')
const llmPyStatus = computed(() => store.metrics?.services.llm_py || 'unknown')

const llmTrendTotal = computed(() => store.llmCallTrend.data.reduce((a, b) => a + b, 0))
const llmTrendAvg = computed(() => Math.round(llmTrendTotal.value / store.llmCallTrend.data.length))

onMounted(async () => {
  await store.fetchMetrics()
})

function handleRefresh() {
  store.fetchMetrics()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="font-display text-3xl font-medium text-gray-900">Dashboard</h1>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-500">Last update: {{ lastUpdateTime }}</span>
        <Button @click="handleRefresh" :disabled="store.loading">
          {{ store.loading ? 'Loading...' : 'Refresh' }}
        </Button>
      </div>
    </div>

    <!-- Service Status Cards (CLI, Go, Py, Web) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <ServiceCard name="CLI" status="running" version="0.1.0" />
      <ServiceCard name="server-go" :status="serverGoStatus" :version="store.metrics?.version || '0.1.0'" />
      <ServiceCard name="llm-py" :status="llmPyStatus" version="0.1.0" />
      <ServiceCard name="web-ui" status="running" version="0.1.0" />
    </div>

    <!-- Error Banner -->
    <div v-if="store.error" class="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-700">
      <p class="font-medium">Failed to fetch metrics</p>
      <p class="text-sm text-gray-500">{{ store.error }}</p>
      <p class="text-sm text-gray-400 mt-2">Make sure server-go is running at 127.0.0.1:8080</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="定时任务" :value="store.metrics?.timers.total || 0" :subtitle="`${store.metrics?.timers.active || 0} active`" />
      <StatCard title="知识库条目" :value="store.metrics?.knowledge.total || 0" subtitle="total entries" />
      <StatCard title="MCP 配置" :value="store.metrics?.mcps.total || 0" subtitle="total configs" />
      <StatCard title="服务状态" :value="store.isServicesHealthy ? 'Healthy' : 'Degraded'" />
    </div>

    <!-- LLM Call Trend (mock data - 待后端提供真实 API) -->
    <div class="bg-white border border-gray-200 rounded-xl p-6">
      <h2 class="font-medium text-gray-900 mb-4">LLM 调用趋势 (近7天)</h2>
      <BarChart :labels="store.llmCallTrend.labels" :data="store.llmCallTrend.data" label="API Calls" />
      <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Total: {{ llmTrendTotal }} calls</span>
        <span>Avg: {{ llmTrendAvg }}/day</span>
      </div>
    </div>
  </div>
</template>
