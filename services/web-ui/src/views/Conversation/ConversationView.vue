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

    <!-- Conversation List -->
    <div class="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">对话列表</h2>
        </div>

        <div class="divide-y divide-gray-100 max-h-[720px] overflow-y-auto">
          <button
            v-for="conv in conversations?.items || []"
            :key="conv.id"
            type="button"
            @click="selectConversation(conv.id)"
            :class="[
              'w-full p-4 text-left transition-colors',
              selectedConversationId === conv.id
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
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
                <div class="text-xs text-gray-500 leading-5">
                  <div>ID: {{ conv.id }}</div>
                  <div>来源: {{ conv.source || '-' }}</div>
                  <div>创建时间: {{ formatDate(conv.created_at) }}</div>
                </div>
              </div>
            </div>
          </button>

          <div v-if="!(conversations?.items?.length)" class="p-6 text-sm text-gray-500">
            暂无对话记录
          </div>
        </div>

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

      <div class="bg-white rounded-xl border border-gray-200 min-h-[480px] flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">会话详情</h2>
        </div>

        <div v-if="selectedConversation" class="p-4 border-b border-gray-100 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-base font-medium text-gray-900">{{ selectedConversation.title || '未命名对话' }}</span>
            <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {{ selectedConversation.message_count }} 消息
            </span>
            <span
              v-if="selectedConversation.memory_enabled"
              class="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-white"
            >
              记忆
            </span>
          </div>
          <div class="text-xs text-gray-500 leading-5 break-all">
            <div>会话 ID: {{ selectedConversation.id }}</div>
            <div v-if="selectedConversation.session_id">Session ID: {{ selectedConversation.session_id }}</div>
            <div>来源: {{ selectedConversation.source || '-' }}</div>
            <div>创建时间: {{ formatDate(selectedConversation.created_at) }}</div>
            <div>更新时间: {{ formatDate(selectedConversation.updated_at) }}</div>
          </div>
        </div>

        <div v-if="detailLoading" class="flex-1 flex items-center justify-center text-sm text-gray-500">
          正在加载会话详情...
        </div>

        <div v-else-if="detailError" class="flex-1 p-6 text-sm text-gray-500">
          {{ detailError }}
        </div>

        <div v-else-if="selectedConversation && selectedConversation.messages.length" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="(message, index) in selectedConversation.messages"
            :key="message.id || `${message.role}-${index}`"
            :class="[
              'rounded-xl border p-4',
              message.role === 'user'
                ? 'border-blue-200 bg-blue-50 text-gray-900 ml-12'
                : 'border-gray-200 bg-gray-50 text-gray-900 mr-12'
            ]"
          >
            <div class="flex items-center justify-between gap-3 mb-2">
              <span :class="['text-xs uppercase tracking-wide', message.role === 'user' ? 'text-blue-600' : 'text-gray-500']">
                {{ formatRole(message.role) }}
              </span>
              <span :class="['text-xs', message.role === 'user' ? 'text-blue-400' : 'text-gray-400']">
                {{ formatDate(message.created_at || message.timestamp || '') }}
              </span>
            </div>
            <div class="text-sm leading-6 whitespace-pre-wrap break-words">{{ message.content }}</div>
            <div v-if="message.model" :class="['text-xs mt-3', message.role === 'user' ? 'text-blue-400' : 'text-gray-400']">
              模型: {{ message.model }}
            </div>
          </div>
        </div>

        <div v-else-if="selectedConversation" class="flex-1 p-6 text-sm text-gray-500">
          当前会话暂无可展示的消息内容
        </div>

        <div v-else class="flex-1 flex items-center justify-center text-sm text-gray-500">
          点击左侧会话后查看完整内容
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getLLMOverview, getConversations, getConversationDetail } from '../../api'
import type { OverviewResponse, ConversationListResponse, ConversationDetailResponse } from '../../api'

const overview = ref<OverviewResponse | null>(null)
const conversations = ref<ConversationListResponse | null>(null)
const selectedConversation = ref<ConversationDetailResponse | null>(null)
const selectedConversationId = ref('')
const detailLoading = ref(false)
const detailError = ref('')

const page = ref(1)
const pageSize = 10


async function loadOverview() {
  try {
    overview.value = await getLLMOverview()
  } catch (e) {
    console.error('Failed to load overview:', e)
  }
}


async function loadConversations() {
  try {
    conversations.value = await getConversations(page.value, pageSize)

    const firstConversation = conversations.value.items[0]

    if (!firstConversation) {
      selectedConversation.value = null
      selectedConversationId.value = ''
      detailError.value = ''
      return
    }

    const existsInCurrentPage = conversations.value.items.some((item) => item.id === selectedConversationId.value)

    if (!existsInCurrentPage) {
      await selectConversation(firstConversation.id)
    }
  } catch (e) {
    console.error('Failed to load conversations:', e)
  }
}

async function selectConversation(id: string) {
  if (!id || detailLoading.value || (selectedConversationId.value === id && selectedConversation.value && !detailError.value)) {
    return
  }

  selectedConversationId.value = id
  detailLoading.value = true
  detailError.value = ''
  selectedConversation.value = null

  try {
    selectedConversation.value = await getConversationDetail(id)
  } catch (e) {
    selectedConversation.value = null
    detailError.value = '会话详情加载失败，请确认后端已返回完整消息内容'
    console.error('Failed to load conversation detail:', e)
  } finally {
    detailLoading.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) {
    return '-'
  }

  const date = new Date(dateStr)

  if (Number.isNaN(date.getTime())) {
    return dateStr
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRole(role: string) {
  const normalizedRole = role.toLowerCase()

  if (normalizedRole === 'user') {
    return '用户'
  }

  if (normalizedRole === 'assistant') {
    return '助手'
  }

  if (normalizedRole === 'system') {
    return '系统'
  }

  return role
}

onMounted(() => {
  loadOverview()
  loadConversations()
})
</script>
