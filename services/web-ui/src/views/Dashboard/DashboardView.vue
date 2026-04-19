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
  await store.fetchDashboardData()
})

function handleRefresh() {
  store.fetchDashboardData()
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
      <p class="font-medium">Failed to fetch dashboard data</p>
      <p class="text-sm text-gray-500">{{ store.error }}</p>
      <p class="text-sm text-gray-400 mt-2">Make sure server-go is running at 127.0.0.1:8080</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="定时任务" :value="store.timerStats.total" :subtitle="`${store.timerStats.active} active`" />
      <StatCard title="知识库条目" :value="store.knowledgeTotal" subtitle="total entries" />
      <StatCard title="MCP 配置" :value="store.mcpStats.total" :subtitle="`${store.mcpStats.active} connected`" />
      <StatCard title="服务状态" :value="store.isServicesHealthy ? 'Healthy' : 'Degraded'" />
    </div>

    <!-- Timer List -->
    <div v-if="store.timers.length > 0" class="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h2 class="font-medium text-gray-900 mb-4">定时任务</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="pb-3 text-sm font-medium text-gray-500">Name</th>
              <th class="pb-3 text-sm font-medium text-gray-500">Cron</th>
              <th class="pb-3 text-sm font-medium text-gray-500">Status</th>
              <th class="pb-3 text-sm font-medium text-gray-500">Next Run</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="timer in store.timers" :key="timer.uuid" class="border-b border-gray-100 last:border-0">
              <td class="py-3 text-gray-900">{{ timer.name }}</td>
              <td class="py-3 text-gray-500 font-mono text-sm">{{ timer.cron_expr }}</td>
              <td class="py-3">
                <span :class="[
                  'inline-block px-2 py-0.5 text-xs rounded-full',
                  timer.status === 'active' ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400'
                ]">
                  {{ timer.status }}
                </span>
              </td>
              <td class="py-3 text-gray-400 text-sm">{{ timer.next_run_at || '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MCP Status List -->
    <div v-if="store.mcps.length > 0" class="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h2 class="font-medium text-gray-900 mb-4">MCP 配置</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="pb-3 text-sm font-medium text-gray-500">Name</th>
              <th class="pb-3 text-sm font-medium text-gray-500">Type</th>
              <th class="pb-3 text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mcp in store.mcps" :key="mcp.uuid" class="border-b border-gray-100 last:border-0">
              <td class="py-3 text-gray-900">{{ mcp.name }}</td>
              <td class="py-3 text-gray-500">{{ mcp.type }}</td>
              <td class="py-3">
                <span :class="[
                  'inline-block px-2 py-0.5 text-xs rounded-full',
                  mcp.status === 'connected' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600'
                ]">
                  {{ mcp.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
