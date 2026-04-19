import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMetrics, listTimers, listMCPs, listKnowledge } from '@/api'
import type { MetricsData, Timer, MCP, Knowledge } from '@/api/types'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const metrics = ref<MetricsData | null>(null)
  const timers = ref<Timer[]>([])
  const mcps = ref<MCP[]>([])
  const knowledge = ref<Knowledge[]>([])
  const lastUpdate = ref<Date | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Auto-refresh interval ID
  let refreshInterval: ReturnType<typeof setInterval> | null = null

  // Computed
  const isServicesHealthy = computed(() => {
    if (!metrics.value) return false
    const s = metrics.value.services
    return s.server_go === 'running' && s.llm_py === 'running'
  })

  const timerStats = computed(() => {
    return {
      total: timers.value.length,
      active: timers.value.filter(t => t.status === 'active').length
    }
  })

  // 生成近7天的 mock 数据（实际应由后端提供）
  const llmCallTrend = computed(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const baseValues = [5, 8, 3, 12, 7, 2, 9]
    return { labels: days, data: baseValues }
  })

  const mcpStats = computed(() => {
    return {
      total: mcps.value.length,
      active: mcps.value.filter(m => m.status === 'connected').length
    }
  })

  const knowledgeTotal = computed(() => knowledge.value.length)

  // Actions
  async function fetchDashboardData() {
    loading.value = true
    error.value = null

    try {
      const [metricsRes, timersRes, mcpsRes, knowledgeRes] = await Promise.all([
        getMetrics(),
        listTimers(),
        listMCPs(),
        listKnowledge()
      ])

      if (metricsRes.code === 0) {
        metrics.value = metricsRes.data
      }

      if (timersRes.code === 0) {
        timers.value = timersRes.data.items || []
      }

      if (mcpsRes.code === 0) {
        mcps.value = mcpsRes.data.items || []
      }

      if (knowledgeRes.code === 0) {
        knowledge.value = knowledgeRes.data.items || []
      }

      lastUpdate.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch dashboard data'
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(intervalMs = 30000) {
    stopAutoRefresh()
    refreshInterval = setInterval(fetchDashboardData, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    metrics,
    timers,
    mcps,
    knowledge,
    lastUpdate,
    loading,
    error,
    isServicesHealthy,
    timerStats,
    mcpStats,
    knowledgeTotal,
    llmCallTrend,
    fetchDashboardData,
    startAutoRefresh,
    stopAutoRefresh
  }
})
