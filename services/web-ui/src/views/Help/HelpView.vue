<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  { title: '服务管理', desc: '管理 MySQL、server-go、llm-py 等服务', cmd: 'ddo start' },
  { title: '知识库', desc: 'RAG 向量知识库，存储和检索文档知识', cmd: '/kb' },
  { title: '定时任务', desc: 'Cron 调度与 HTTP 回调', cmd: '/timer' },
  { title: 'MCP 扩展', desc: '即插即用的 AI 工具', cmd: '/mcp' },
  { title: 'LLM 对话', desc: '本地模型与 OpenRouter', cmd: '/chat' }
]

const cliCommands = ['/help-web', '/dashboard-web', '/mcp-web', '/timer-web', '/config-web']

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Hero -->
    <div class="text-center mb-12">
      <div class="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-2xl mb-4">
        <span class="text-white font-bold text-xl">D</span>
      </div>

      <h1 style="font-family: 'SF Pro Rounded', system-ui, sans-serif; font-weight: 500; font-size: 2rem; line-height: 1.1;" class="mb-2 text-gray-900">
        Ddo
      </h1>

      <p style="font-size: 1rem; line-height: 1.5; color: #737373;" class="mb-6">
        本地化的 AI 开发助手平台，为开发者提供可控、可扩展的 AI 能力
      </p>

      <div class="flex items-center justify-center gap-3">
        <button
          class="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors hover:bg-gray-800"
          style="border-radius: 9999px;"
          @click="goTo('/dashboard')"
        >
          Dashboard
        </button>
        <button
          class="bg-gray-200 text-gray-800 px-5 py-2 rounded-full text-sm font-medium border border-gray-200 transition-colors hover:bg-gray-300"
          style="border-radius: 9999px;"
          @click="goTo('/mcp')"
        >
          MCP
        </button>
      </div>
    </div>

    <!-- Features - Card with icons -->
    <div class="mb-10">
      <h2 class="text-lg font-medium mb-4 text-gray-900">功能</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="f in features"
          :key="f.title"
          class="flex items-center gap-4 p-4 rounded-xl"
          style="background-color: #fafafa;"
        >
          <div class="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 mb-0.5">{{ f.title }}</div>
            <div class="text-xs" style="color: #a3a3a3;">{{ f.desc }}</div>
          </div>
          <code class="text-xs px-2 py-1 rounded-full flex-shrink-0" style="background-color: #e5e5e5; color: #525252;">
            {{ f.cmd }}
          </code>
        </div>
      </div>
    </div>

    <!-- CLI Commands -->
    <div class="mb-10">
      <h2 class="text-lg font-medium mb-3 text-gray-900">CLI 命令</h2>
      <p class="text-xs mb-3" style="color: #a3a3a3;">在 CLI 中输入以下命令打开 Web 页面</p>
      <div class="flex flex-wrap gap-2">
        <code
          v-for="cmd in cliCommands"
          :key="cmd"
          class="px-3 py-1.5 text-sm rounded-full"
          style="background-color: #e5e5e5; color: #262626; border-radius: 9999px;"
        >
          {{ cmd }}
        </code>
      </div>
    </div>

    <!-- Architecture -->
    <p class="text-xs" style="color: #a3a3a3; text-align: center;">
      CLI 是核心主体 · Web 是可视化扩展 · Electron 是通知扩展
    </p>
  </div>
</template>