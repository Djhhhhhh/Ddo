<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'
import * as mcpApi from '@/api/mcp'
import type { MCPItem, MCPDetail } from '@/api/types'

const mcps = ref<MCPItem[]>([])
const loading = ref(false)
const selectedMcpUuid = ref<string | null>(null)
const selectedMcp = ref<MCPDetail | null>(null)
const detailLoading = ref(false)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showTestModal = ref(false)
const submitLoading = ref(false)
const testLoading = ref(false)
const testResult = ref<{ status: string; tools: string[]; elapsed_ms: number; error?: string } | null>(null)

// Create mode: 'form' or 'json'
const createMode = ref<'form' | 'json'>('form')

// Create/Edit form data
const formData = ref({
  name: '',
  description: '',
  type: 'stdio' as 'stdio' | 'http' | 'sse',
  command: '',
  args: '',
  env: '',
  url: '',
  headers: ''
})

// JSON import
const jsonText = ref('')
const jsonError = ref('')

// Load MCPs
async function loadMcps() {
  loading.value = true
  try {
    const res = await mcpApi.listMCPs()
    mcps.value = res.data.items
  } catch (e) {
    console.error('Failed to load MCPs:', e)
  } finally {
    loading.value = false
  }
}

// Load MCP detail
async function loadMcpDetail(uuid: string) {
  detailLoading.value = true
  selectedMcpUuid.value = uuid
  try {
    const res = await mcpApi.getMCP(uuid)
    selectedMcp.value = res.data.mcp
  } catch (e) {
    console.error('Failed to load MCP detail:', e)
  } finally {
    detailLoading.value = false
  }
}

onMounted(loadMcps)

// Select MCP
function selectMcp(uuid: string) {
  loadMcpDetail(uuid)
}

// Reset create form
function resetCreateForm() {
  createMode.value = 'form'
  formData.value = {
    name: '',
    description: '',
    type: 'stdio',
    command: '',
    args: '',
    env: '',
    url: '',
    headers: ''
  }
  jsonText.value = ''
  jsonError.value = ''
}

// Submit create (form mode)
async function submitCreateForm() {
  submitLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      name: formData.value.name,
      description: formData.value.description,
      type: formData.value.type
    }
    if (formData.value.type === 'stdio') {
      payload.command = formData.value.command
      if (formData.value.args) payload.args = formData.value.args.split(',').map(s => s.trim()).filter(Boolean)
      if (formData.value.env) payload.env = formData.value.env.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      payload.url = formData.value.url
      if (formData.value.headers) {
        try { payload.headers = JSON.parse(formData.value.headers) } catch {}
      }
    }
    await mcpApi.createMCP(payload as any)
    showCreateModal.value = false
    await loadMcps()
  } catch (e) {
    console.error('Failed to create MCP:', e)
  } finally {
    submitLoading.value = false
  }
}

// Submit create (json mode)
async function submitCreateJson() {
  jsonError.value = ''
  try {
    const parsed = JSON.parse(jsonText.value)
    await mcpApi.createMCP(parsed)
    showCreateModal.value = false
    await loadMcps()
  } catch (e: any) {
    jsonError.value = e.message || 'JSON格式错误'
  }
}

// Start edit
function startEdit() {
  if (!selectedMcp.value) return
  formData.value = {
    name: selectedMcp.value.name,
    description: selectedMcp.value.description || '',
    type: selectedMcp.value.type,
    command: selectedMcp.value.command || '',
    args: selectedMcp.value.args?.join(', ') || '',
    env: selectedMcp.value.env?.join(', ') || '',
    url: selectedMcp.value.url || '',
    headers: selectedMcp.value.headers ? JSON.stringify(selectedMcp.value.headers) : ''
  }
  showEditModal.value = true
}

// Submit edit
async function submitEdit() {
  if (!selectedMcpUuid.value) return
  submitLoading.value = true
  try {
    // Note: MCP doesn't have update API yet, this would need server-go support
    showEditModal.value = false
  } catch (e) {
    console.error('Failed to update MCP:', e)
  } finally {
    submitLoading.value = false
  }
}

// Test MCP
async function testMcp() {
  if (!selectedMcpUuid.value) return
  testLoading.value = true
  testResult.value = null
  showTestModal.value = true
  try {
    const res = await mcpApi.testMCP(selectedMcpUuid.value)
    testResult.value = res.data
    await loadMcpDetail(selectedMcpUuid.value)
  } catch (e: any) {
    testResult.value = {
      status: 'error',
      tools: [],
      elapsed_ms: 0,
      error: e.response?.data?.message || e.message || '测试失败'
    }
  } finally {
    testLoading.value = false
  }
}

// Delete MCP
async function deleteMcp() {
  if (!selectedMcpUuid.value) return
  try {
    await mcpApi.deleteMCP(selectedMcpUuid.value)
    showDeleteModal.value = false
    selectedMcp.value = null
    selectedMcpUuid.value = null
    await loadMcps()
  } catch (e) {
    console.error('Failed to delete MCP:', e)
  }
}

function getStatusVariant(status: string): 'gray' | 'green' | 'red' {
  if (status === 'active') return 'green'
  if (status === 'error') return 'red'
  return 'gray'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    active: 'Active',
    error: 'Error',
    inactive: 'Inactive'
  }
  return map[status] || status
}

function formatTime(time?: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-2xl font-medium text-gray-900">MCP 管理</h1>
      <Button size="sm" variant="black" @click="showCreateModal = true; resetCreateForm()">+ 新增 MCP</Button>
    </div>

    <!-- Left-Right Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Left: MCP List -->
      <div class="lg:col-span-2 space-y-3">
        <Card v-if="loading">
          <p class="text-gray-500 text-sm">加载中...</p>
        </Card>
        <Card v-else-if="mcps.length === 0">
          <p class="text-gray-500 text-sm">暂无 MCP 配置</p>
        </Card>
        <Card
          v-else
          v-for="mcp in mcps"
          :key="mcp.uuid"
          :hoverable="true"
          class="cursor-pointer transition-colors"
          :class="{ 'border-gray-900': selectedMcpUuid === mcp.uuid }"
          @click="selectMcp(mcp.uuid)"
        >
          <div class="flex items-center gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-900 truncate">{{ mcp.name }}</span>
                <Badge :variant="getStatusVariant(mcp.status)" class="text-xs">
                  {{ getStatusText(mcp.status) }}
                </Badge>
              </div>
              <span class="text-xs text-gray-500">{{ mcp.type }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Right: Detail -->
      <div class="lg:col-span-3">
        <Card v-if="!selectedMcpUuid">
          <div class="text-center py-12">
            <p class="text-gray-400">← 请选择一个 MCP 查看详情</p>
          </div>
        </Card>
        <Card v-else-if="detailLoading">
          <p class="text-gray-500 text-sm">加载中...</p>
        </Card>
        <Card v-else-if="selectedMcp">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-lg font-medium text-gray-900">{{ selectedMcp.name }}</h2>
                <Badge :variant="getStatusVariant(selectedMcp.status)">
                  {{ getStatusText(selectedMcp.status) }}
                </Badge>
              </div>
              <p v-if="selectedMcp.description" class="text-sm text-gray-500">{{ selectedMcp.description }}</p>
            </div>
            <div class="flex gap-2">
              <Button size="sm" variant="gray" @click="testMcp">测试</Button>
              <Button size="sm" variant="white" @click="startEdit">编辑</Button>
              <Button size="sm" variant="gray" @click="showDeleteModal = true">删除</Button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">类型</p>
              <p class="text-sm font-medium text-gray-900">{{ selectedMcp.type }}</p>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">命令/URL</p>
              <p class="text-sm font-medium text-gray-900 truncate">{{ selectedMcp.command || selectedMcp.url || '-' }}</p>
            </div>
            <div v-if="selectedMcp.args?.length" class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">参数</p>
              <p class="text-sm font-medium text-gray-900">{{ selectedMcp.args.join(', ') }}</p>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">上次测试</p>
              <p class="text-sm font-medium text-gray-900">{{ formatTime(selectedMcp.last_test_at) }}</p>
            </div>
            <div v-if="selectedMcp.last_error" class="col-span-2 p-3 bg-red-50 rounded-lg">
              <p class="text-xs text-red-500 mb-1">error</p>
              <p class="text-sm text-red-700">{{ selectedMcp.last_error }}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal v-model="showCreateModal" title="新增 MCP 配置" class="max-w-lg">
      <div class="space-y-4">
        <!-- Mode Toggle -->
        <div class="flex gap-2 p-1 bg-gray-100 rounded-full w-fit">
          <button
            class="px-4 py-1.5 text-sm rounded-full transition-colors"
            :class="createMode === 'form' ? 'bg-white shadow text-gray-900' : 'text-gray-600'"
            @click="createMode = 'form'"
          >
            表单
          </button>
          <button
            class="px-4 py-1.5 text-sm rounded-full transition-colors"
            :class="createMode === 'json' ? 'bg-white shadow text-gray-900' : 'text-gray-600'"
            @click="createMode = 'json'"
          >
            JSON
          </button>
        </div>

        <!-- Form Mode -->
        <div v-if="createMode === 'form'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
            <Input v-model="formData.name" placeholder="配置名称" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <Input v-model="formData.description" placeholder="描述信息" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">类型 *</label>
            <Select
              v-model="formData.type"
              :options="[
                { label: 'Stdio', value: 'stdio' },
                { label: 'HTTP', value: 'http' },
                { label: 'SSE', value: 'sse' }
              ]"
            />
          </div>
          <template v-if="formData.type === 'stdio'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">命令 *</label>
              <Input v-model="formData.command" placeholder="npx, python" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">参数 (逗号分隔)</label>
              <Input v-model="formData.args" placeholder="-m, mcp_server" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">环境变量 (逗号分隔)</label>
              <Input v-model="formData.env" placeholder="API_KEY=xxx" />
            </div>
          </template>
          <template v-else>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
              <Input v-model="formData.url" placeholder="https://api.example.com/mcp" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">请求头 (JSON)</label>
              <Input v-model="formData.headers" placeholder='{"Authorization": "Bearer xxx"}' />
            </div>
          </template>
        </div>

        <!-- JSON Mode -->
        <div v-if="createMode === 'json'">
          <textarea
            v-model="jsonText"
            placeholder='{"name": "my-mcp", "type": "stdio", "command": "npx"}'
            class="w-full h-40 bg-white border border-gray-200 p-3 text-sm font-mono"
            style="border-radius: 12px;"
          />
          <p v-if="jsonError" class="text-red-500 text-sm mt-1">{{ jsonError }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button size="sm" variant="gray" @click="showCreateModal = false">取消</Button>
        <Button
          size="sm"
          variant="black"
          :loading="submitLoading"
          @click="createMode === 'form' ? submitCreateForm() : submitCreateJson()"
        >
          创建
        </Button>
      </div>
    </Modal>

    <!-- Edit Modal -->
    <Modal v-model="showEditModal" title="编辑 MCP 配置" class="max-w-lg">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
          <Input v-model="formData.name" placeholder="配置名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <Input v-model="formData.description" placeholder="描述信息" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">类型 *</label>
          <Select
            v-model="formData.type"
            :options="[
              { label: 'Stdio', value: 'stdio' },
              { label: 'HTTP', value: 'http' },
              { label: 'SSE', value: 'sse' }
            ]"
          />
        </div>
        <template v-if="formData.type === 'stdio'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">命令 *</label>
            <Input v-model="formData.command" placeholder="npx, python" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">参数</label>
            <Input v-model="formData.args" placeholder="逗号分隔" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">环境变量</label>
            <Input v-model="formData.env" placeholder="逗号分隔" />
          </div>
        </template>
        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <Input v-model="formData.url" placeholder="https://api.example.com/mcp" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">请求头 (JSON)</label>
            <Input v-model="formData.headers" placeholder='{"Authorization": "Bearer xxx"}' />
          </div>
        </template>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <Button size="sm" variant="gray" @click="showEditModal = false">取消</Button>
        <Button size="sm" variant="black" :loading="submitLoading" @click="submitEdit">保存</Button>
      </div>
    </Modal>

    <!-- Test Result Modal -->
    <Modal v-model="showTestModal" title="测试结果">
      <div v-if="testLoading" class="py-8 text-center text-gray-500">测试中...</div>
      <div v-else-if="testResult">
        <div class="mb-4">
          <span class="font-medium">Status: </span>
          <Badge :variant="testResult.status === 'success' ? 'green' : 'red'">
            {{ testResult.status === 'success' ? 'Success' : 'Failed' }}
          </Badge>
        </div>
        <div v-if="testResult.tools.length > 0" class="mb-4">
          <span class="font-medium">Tools: </span>
          <div class="flex flex-wrap gap-2 mt-2">
            <Badge v-for="tool in testResult.tools" :key="tool">{{ tool }}</Badge>
          </div>
        </div>
        <div v-if="testResult.elapsed_ms" class="mb-4">
          <span class="font-medium">Duration: </span>
          <span class="text-gray-700">{{ testResult.elapsed_ms }}ms</span>
        </div>
        <div v-if="testResult.error" class="text-red-600">{{ testResult.error }}</div>
      </div>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="showDeleteModal" title="确认删除">
      <p class="text-gray-700 text-center py-4">确定要删除 "{{ selectedMcp?.name }}" 吗？此操作不可撤销。</p>
      <div class="flex justify-center gap-4">
        <Button size="sm" variant="gray" @click="showDeleteModal = false">取消</Button>
        <Button size="sm" variant="black" @click="deleteMcp">确认删除</Button>
      </div>
    </Modal>
  </div>
</template>
