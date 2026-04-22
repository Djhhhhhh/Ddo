<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import ServiceCard from '@/components/ServiceCard.vue'
import StatCard from '@/components/StatCard.vue'
import BarChart from '@/components/Charts/BarChart.vue'
import PieChart from '@/components/Charts/PieChart.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'

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

// Timer stats for pie chart
const timerStatsData = computed(() => {
  const t = store.metrics?.timers
  if (!t) return []
  return [
    { name: '运行中', value: t.active || 0 },
    { name: '已暂停', value: (t.total || 0) - (t.active || 0) }
  ].filter(d => d.value > 0)
})

onMounted(async () => {
  await store.fetchMetrics()
  store.startAutoRefresh(30000) // Auto refresh every 30 seconds
})

onUnmounted(() => {
  store.stopAutoRefresh()
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
        <span class="text-sm text-gray-500">最后更新: {{ lastUpdateTime }}</span>
        <Button @click="handleRefresh" :disabled="store.loading" variant="gray">
          {{ store.loading ? '加载中...' : '刷新' }}
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
    <div v-if="store.error" class="mb-6 p-4 bg-gray-100 border border-gray-200" style="border-radius: 12px;">
      <p class="font-medium text-gray-900">获取指标数据失败</p>
      <p class="text-sm text-gray-500">{{ store.error }}</p>
      <p class="text-sm text-gray-400 mt-2">请确保 server-go 已启动且 web-ui 配置中的 API 地址可访问</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="定时任务" :value="store.metrics?.timers.total || 0" :subtitle="`${store.metrics?.timers.active || 0} 运行中`" />
      <StatCard title="知识库条目" :value="store.metrics?.knowledge.total || 0" subtitle="条目总数" />
      <StatCard title="MCP 配置" :value="store.metrics?.mcps.total || 0" subtitle="配置总数" />
      <StatCard title="服务状态" :value="store.isServicesHealthy ? '健康' : '异常'" />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- LLM Call Trend -->
      <Card>
        <h2 class="font-medium text-gray-900 mb-4">LLM 调用趋势 (近7天)</h2>
        <BarChart :labels="store.llmCallTrend.labels" :data="store.llmCallTrend.data" label="API Calls" />
        <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>总计: {{ llmTrendTotal }} 次调用</span>
          <span>日均: {{ llmTrendAvg }} 次</span>
        </div>
      </Card>

      <!-- Timer Stats -->
      <Card>
        <h2 class="font-medium text-gray-900 mb-4">定时任务状态分布</h2>
        <PieChart v-if="timerStatsData.length > 0" :data="timerStatsData" />
        <p v-else class="text-sm text-gray-500">暂无数据</p>
      </Card>
    </div>
  </div>
</template>
