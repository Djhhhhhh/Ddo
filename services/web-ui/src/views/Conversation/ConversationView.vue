<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-medium text-gray-900 mb-2">对话记录</h1>
      <p class="text-sm text-gray-500">查看 LLM 对话历史记录和统计信息</p>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="text-sm text-gray-500 mb-1">今日请求</div>
        <div class="text-2xl font-semibold text-gray-900">{{ overview?.today?.requests || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1">{{ overview?.today?.avg_latency_ms || 0 }}ms 平均延迟</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="text-sm text-gray-500 mb-1">本周请求</div>
        <div class="text-2xl font-semibold text-gray-900">{{ overview?.this_week?.requests || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1">{{ overview?.this_week?.avg_latency_ms || 0 }}ms 平均延迟</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="text-sm text-gray-500 mb-1">本月请求</div>
        <div class="text-2xl font-semibold text-gray-900">{{ overview?.this_month?.requests || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1">{{ overview?.this_month?.avg_latency_ms || 0 }}ms 平均延迟</div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-medium text-gray-900">调用趋势</h2>
        <div class="flex gap-2">
          <button
            v-for="d in [7, 14, 30]"
            :key="d"
            @click="days = d; loadTrend()"
            :class="[
              'px-3 py-1 text-sm rounded-full border transition-colors',
              days === d
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            ]"
          >
            {{ d }}天
          </button>
        </div>
      </div>
      <div class="h-48 flex items-end gap-1">
        <div
          v-for="(count, i) in trend?.requests || []"
          :key="i"
          class="flex-1 bg-gray-200 rounded-t hover:bg-gray-300 transition-colors relative group"
          :style="{ height: `${Math.max((count / maxRequests) * 100, 5)}%` }"
        >
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
            {{ trend?.dates?.[i] }}: {{ count }} 请求
          </div>
        </div>
      </div>
    </div>

    <!-- Conversation List -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-medium text-gray-900">对话列表</h2>
      </div>

      <div class="divide-y divide-gray-100">
        <div
          v-for="conv in conversations?.items || []"
          :key="conv.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-gray-900 truncate">{{ conv.title || '未命名对话' }}</span>
                <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {{ conv.message_count }} 消息
                </span>
                <span
                  v-if="conv.memory_enabled"
                  class="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-white"
                >
                  记忆
                </span>
              </div>
              <div class="text-xs text-gray-500">
                <span>ID: {{ conv.id.slice(0, 8) }}</span>
                <span class="mx-2">|</span>
                <span>来源: {{ conv.source }}</span>
                <span class="mx-2">|</span>
                <span>{{ formatDate(conv.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="conversations?.total_pages > 1" class="p-4 border-t border-gray-200 flex items-center justify-between">
        <span class="text-sm text-gray-500">
          共 {{ conversations?.total }} 条
        </span>
        <div class="flex gap-2">
          <button
            :disabled="page === 1"
            @click="page--; loadConversations()"
            class="px-3 py-1 text-sm rounded-full border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm">{{ page }} / {{ conversations?.total_pages }}</span>
          <button
            :disabled="page >= (conversations?.total_pages || 1)"
            @click="page++; loadConversations()"
            class="px-3 py-1 text-sm rounded-full border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getLLMOverview, getLLMTrend, getConversations } from '../../api'
import type { OverviewResponse, TrendData, ConversationListResponse } from '../../api'

const overview = ref<OverviewResponse | null>(null)
const trend = ref<TrendData | null>(null)
const conversations = ref<ConversationListResponse | null>(null)

const days = ref(7)
const page = ref(1)
const pageSize = 10

const maxRequests = computed(() => {
  const counts = trend.value?.requests || []
  return Math.max(...counts, 1)
})

async function loadOverview() {
  try {
    overview.value = await getLLMOverview()
  } catch (e) {
    console.error('Failed to load overview:', e)
  }
}

async function loadTrend() {
  try {
    trend.value = await getLLMTrend(days.value)
  } catch (e) {
    console.error('Failed to load trend:', e)
  }
}

async function loadConversations() {
  try {
    conversations.value = await getConversations(page.value, pageSize)
  } catch (e) {
    console.error('Failed to load conversations:', e)
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadOverview()
  loadTrend()
  loadConversations()
})
</script>
