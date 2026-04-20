<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Badge from '@/components/ui/Badge.vue'
import * as knowledgeApi from '@/api/knowledge'
import type { RagMessage, KnowledgeSearchResult } from '@/api/types'

const emit = defineEmits<{
  (e: 'sourceClick', source: KnowledgeSearchResult): void
}>()

const messages = ref<RagMessage[]>([])
const inputQuestion = ref('')
const loading = ref(false)

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function getErrorMessage(error: any): string {
  const detail = error?.response?.data?.detail || error?.message || '未知错误'

  // Check for embedding-related errors
  if (detail.includes('embedding') || detail.includes('Embedding')) {
    return `⚠️ 知识库检索服务暂时不可用

可能原因：
1. 知识库尚未录入任何内容
2. Embedding 服务配置异常
3. 网络连接问题

建议：请先在左侧添加知识库词条，或检查服务状态。`
  }

  // Check for RAG errors
  if (detail.includes('rag') || detail.includes('RAG')) {
    return `⚠️ RAG 问答服务异常

错误信息：${detail}

建议：请确保知识库已正确配置，并包含足够的检索数据。`
  }

  // Default error
  return `⚠️ 发生错误：${detail}`
}

async function sendQuestion() {
  const question = inputQuestion.value.trim()
  if (!question || loading.value) return

  // Add user message
  messages.value.push({
    id: generateId(),
    role: 'user',
    content: question,
    timestamp: new Date()
  })

  inputQuestion.value = ''
  loading.value = true

  try {
    const res = await knowledgeApi.askKnowledge({ question, top_k: 3 })
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: res.data.answer || '抱歉，无法生成回答。',
      sources: res.data.sources,
      timestamp: new Date()
    })
  } catch (e: any) {
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: getErrorMessage(e),
      timestamp: new Date()
    })
  } finally {
    loading.value = false
  }
}

function clearChat() {
  messages.value = []
}

function handleSourceClick(source: KnowledgeSearchResult) {
  emit('sourceClick', source)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-medium text-gray-900">💬 知识库测试</h3>
        <p class="text-xs text-gray-400 mt-1">基于已有知识库进行问答</p>
      </div>
      <Button
        v-if="messages.length > 0"
        variant="gray"
        @click="clearChat"
      >
        🗑️ 清空
      </Button>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-auto space-y-4 mb-4">
      <!-- Empty state -->
      <div
        v-if="messages.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <div class="text-4xl mb-4">🔍</div>
        <p class="text-gray-500 mb-2">输入问题测试知识库检索</p>
        <p class="text-sm text-gray-400">例如："如何配置 MCP？"</p>
        <div class="mt-4 text-xs text-gray-400 max-w-xs">
          <p>提示：确保知识库中已有相关内容的词条</p>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="space-y-2"
      >
        <!-- User message -->
        <div
          v-if="msg.role === 'user'"
          class="bg-white border border-gray-200 p-4"
          style="border-radius: 12px;"
        >
          <p class="text-sm font-medium text-gray-500 mb-1">Q:</p>
          <p class="text-gray-900">{{ msg.content }}</p>
        </div>

        <!-- Assistant message -->
        <div
          v-else
          class="bg-gray-50 border border-gray-200 p-4"
          style="border-radius: 12px;"
        >
          <p class="text-sm font-medium text-gray-500 mb-1">A:</p>
          <p class="text-gray-900 whitespace-pre-wrap">{{ msg.content }}</p>

          <!-- Sources -->
          <div
            v-if="msg.sources && msg.sources.length > 0"
            class="mt-3 pt-3 border-t border-gray-200"
          >
            <p class="text-sm text-gray-500 mb-2">📚 参考来源:</p>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="source in msg.sources"
                :key="source.uuid"
                variant="gray"
                class="cursor-pointer hover:bg-gray-200"
                @click="handleSourceClick(source)"
              >
                {{ source.title }}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-gray-50 border border-gray-200 p-4" style="border-radius: 12px;">
        <div class="flex items-center gap-2">
          <div class="animate-pulse">
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <p class="text-gray-500">正在检索知识库...</p>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="flex gap-2">
      <Input
        v-model="inputQuestion"
        placeholder="输入问题..."
        :disabled="loading"
        @keydown.enter="sendQuestion"
      />
      <Button
        variant="black"
        :disabled="!inputQuestion.trim() || loading"
        @click="sendQuestion"
      >
        →
      </Button>
    </div>
  </div>
</template>
