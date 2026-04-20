import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMetrics } from '@/api'
import type { MetricsData } from '@/api/types'

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

  // 生成近7天的 mock 数据（实际应由后端提供）
  const llmCallTrend = computed(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const baseValues = [5, 8, 3, 12, 7, 2, 9]
    return { labels: days, data: baseValues }
  })

  // Actions
  async function fetchMetrics() {
    loading.value = true
    error.value = null

    try {
      const res = await getMetrics()

      if (res.code === 0) {
        metrics.value = res.data
      }

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
