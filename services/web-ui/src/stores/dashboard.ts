import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMetrics, getLLMTrend } from '@/api'
import type { MetricsData, TrendData } from '@/api/types'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const metrics = ref<MetricsData | null>(null)
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

  // 从后端获取真实 LLM 趋势数据
  const llmTrend = ref<TrendData | null>(null)
  const llmCallTrend = computed(() => {
    if (!llmTrend.value) {
      return { labels: [], data: [] }
    }
    // 格式化日期为简短形式
    const labels = llmTrend.value.dates.map((dateStr: string) => {
      const date = new Date(dateStr)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
    return { labels, data: llmTrend.value.requests }
  })

  // Actions
  async function fetchMetrics() {
    loading.value = true
    error.value = null

    try {
      const [metricsRes, trendRes] = await Promise.all([
        getMetrics(),
        getLLMTrend(7)
      ])

      if (metricsRes.code === 0) {
        metrics.value = metricsRes.data
      }
      llmTrend.value = trendRes

      lastUpdate.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch metrics data'
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(intervalMs = 30000) {
    stopAutoRefresh()
    refreshInterval = setInterval(fetchMetrics, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    metrics,
    lastUpdate,
    loading,
    error,
    isServicesHealthy,
    llmCallTrend,
    fetchMetrics,
    startAutoRefresh,
    stopAutoRefresh
  }
})
