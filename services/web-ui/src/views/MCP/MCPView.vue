<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'
import * as mcpApi from '@/api/mcp'
import type { MCPItem, MCPDetail, MCPToolItem } from '@/api/types'

type ToolSchemaProperty = {
  type?: string | string[]
  description?: string
  default?: unknown
  enum?: unknown[]
  properties?: Record<string, ToolSchemaProperty>
  items?: ToolSchemaProperty
}

type ToolSchema = {
  type?: string | string[]
  properties?: Record<string, ToolSchemaProperty>
  required?: string[]
}

const mcps = ref<MCPItem[]>([])
const loading = ref(false)
const selectedMcpUuid = ref<string | null>(null)
const selectedMcp = ref<MCPDetail | null>(null)
const detailLoading = ref(false)

// Inline connection test states
const connectStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const connectError = ref<string | null>(null)
const connectLatency = ref<number | null>(null)
const mcpTools = ref<MCPToolItem[] | null>(null)

// Persistent connection state
const persistentConnectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

// Tool test states
const toolFormValues = ref<Record<string, Record<string, unknown>>>({})
const toolTestLoading = ref<Record<string, boolean>>({})
const toolTestResult = ref<Record<string, { is_error: boolean; content?: unknown; structured_content?: unknown; error?: string; raw?: unknown } | null>>({})

// Modal states (create/edit/delete only)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const submitLoading = ref(false)

// Create mode: 'form' or 'json'
const createMode = ref<'form' | 'json'>('form')

// Create/Edit form data
const formData = ref({
  name: '',
  description: '',
  type: 'stdio' as 'stdio' | 'http' | 'streamable_http' | 'sse',
  command: '',
  args: '',
  env: '',
  url: '',
  headers: ''
})

// JSON import
const jsonText = ref('')
const jsonError = ref('')

// Reset inline states when switching MCP
watch(selectedMcpUuid, () => {
  connectStatus.value = 'idle'
  connectError.value = null
  connectLatency.value = null
  mcpTools.value = null
  toolFormValues.value = {}
  toolTestResult.value = {}
  persistentConnectionStatus.value = 'disconnected'
})

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

// Persistent connection
async function connectMcp() {
  if (!selectedMcpUuid.value) return
  persistentConnectionStatus.value = 'connecting'
  try {
    await mcpApi.connectMCP(selectedMcpUuid.value)
    persistentConnectionStatus.value = 'connected'
    await loadMcpDetail(selectedMcpUuid.value)
    // Load tools after connection
    await loadTools()
  } catch (e: any) {
    persistentConnectionStatus.value = 'error'
    console.error('Failed to connect MCP:', e)
  }
}

async function disconnectMcp() {
  if (!selectedMcpUuid.value) return
  persistentConnectionStatus.value = 'connecting'
  try {
    await mcpApi.disconnectMCP(selectedMcpUuid.value)
    persistentConnectionStatus.value = 'disconnected'
    mcpTools.value = null
    await loadMcpDetail(selectedMcpUuid.value)
  } catch (e: any) {
    persistentConnectionStatus.value = 'error'
    console.error('Failed to disconnect MCP:', e)
  }
}

function getToolSchema(tool: MCPToolItem): ToolSchema {
  const schema = tool.inputSchema
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    return schema as ToolSchema
  }
  return {}
}

function normalizeFallbackTools(toolNames: string[]): MCPToolItem[] {
  return toolNames.map((name) => ({
    name,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }))
}

async function loadTools(fallbackToolNames: string[] = []) {
  if (!selectedMcpUuid.value) return
  const fallbackTools = normalizeFallbackTools(fallbackToolNames)
  try {
    const res = await mcpApi.listMCPTools(selectedMcpUuid.value)
    mcpTools.value = res.data.tools && res.data.tools.length > 0 ? res.data.tools : fallbackTools
    for (const tool of mcpTools.value) {
      initToolForm(tool)
    }
  } catch (e) {
    console.error('Failed to load tools:', e)
    mcpTools.value = fallbackTools
    for (const tool of mcpTools.value) {
      initToolForm(tool)
    }
  }
}

function getDefaultToolFieldValue(prop: ToolSchemaProperty): unknown {
  if (prop.default !== undefined) return prop.default
  const type = getSchemaType(prop)
  if (type === 'boolean') return false
  if (type === 'object') return '{}'
  return ''
}

function initToolForm(tool: MCPToolItem) {
  const values: Record<string, unknown> = {
    ...(toolFormValues.value[tool.name] || {})
  }
  const schema = getToolProperties(tool)
  for (const [key, prop] of Object.entries(schema)) {
    if (!(key in values)) {
      values[key] = getDefaultToolFieldValue(prop)
    }
  }
  toolFormValues.value[tool.name] = values
}

function getSchemaType(prop: ToolSchemaProperty): string {
  if (Array.isArray(prop.type)) {
    return prop.type.find((item) => item !== 'null') || prop.type[0] || 'string'
  }
  if (prop.type) return prop.type
  if (prop.properties) return 'object'
  return 'string'
}

function isRequired(tool: MCPToolItem, key: string): boolean {
  const required = getToolSchema(tool).required
  return !!required?.includes(key)
}

function getEnumOptions(prop: ToolSchemaProperty): { label: string; value: string }[] | undefined {
  if (prop.enum) {
    return prop.enum.map((v) => ({ label: String(v), value: String(v) }))
  }
  return undefined
}

function getToolFieldValue(toolName: string, fieldKey: string): unknown {
  return toolFormValues.value[toolName]?.[fieldKey]
}

function getToolFieldStringValue(toolName: string, fieldKey: string): string {
  const value = getToolFieldValue(toolName, fieldKey)
  if (value === undefined || value === null) return ''
  return String(value)
}

function getToolFieldInputValue(toolName: string, fieldKey: string): string | number {
  const value = getToolFieldValue(toolName, fieldKey)
  if (typeof value === 'number') return value
  if (typeof value === 'string') return value
  return ''
}

function setToolFieldValue(toolName: string, fieldKey: string, value: unknown) {
  if (!toolFormValues.value[toolName]) {
    toolFormValues.value[toolName] = {}
  }
  toolFormValues.value[toolName][fieldKey] = value
}

function hasToolParameters(tool: MCPToolItem): boolean {
  return Object.keys(getToolProperties(tool)).length > 0
}

function getToolProperties(tool: MCPToolItem): Record<string, ToolSchemaProperty> {
  return getToolSchema(tool).properties || {}
}

function getToolFieldPlaceholder(key: string, prop: ToolSchemaProperty): string {
  const type = getSchemaType(prop)
  if (type === 'array') return '多个值用逗号分隔，也可以直接输入 JSON 数组'
  if (type === 'object') return '请输入 JSON 对象'
  return prop.description || key
}

function coerceArrayItemValue(value: string, itemSchema?: ToolSchemaProperty): unknown {
  const trimmed = value.trim()
  const itemType = itemSchema ? getSchemaType(itemSchema) : 'string'
  if (itemType === 'number' || itemType === 'integer') {
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) throw new Error(`数组值 ${trimmed} 不是有效数字`)
    return parsed
  }
  if (itemType === 'boolean') {
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
  }
  return trimmed
}

function parseToolArgumentValue(tool: MCPToolItem, key: string, prop: ToolSchemaProperty, value: unknown): unknown {
  const type = getSchemaType(prop)
  if (value === undefined || value === null || value === '') {
    if (isRequired(tool, key)) {
      throw new Error(`参数 ${key} 为必填项`)
    }
    return undefined
  }
  if (type === 'number' || type === 'integer') {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) throw new Error(`参数 ${key} 需要是数字`)
    return parsed
  }
  if (type === 'boolean') {
    return Boolean(value)
  }
  if (type === 'array') {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string') return []
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (!Array.isArray(parsed)) throw new Error('数组参数必须是 JSON 数组')
        return parsed
      } catch (error: any) {
        throw new Error(error.message || `参数 ${key} 不是有效 JSON 数组`)
      }
    }
    return trimmed.split(',').map((item) => coerceArrayItemValue(item, prop.items)).filter((item) => item !== '')
  }
  if (type === 'object') {
    if (typeof value === 'object' && !Array.isArray(value)) return value
    if (typeof value !== 'string') throw new Error(`参数 ${key} 需要是 JSON 对象`)
    try {
      const parsed = JSON.parse(value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`参数 ${key} 需要是 JSON 对象`)
      }
      return parsed
    } catch (error: any) {
      throw new Error(error.message || `参数 ${key} 不是有效 JSON 对象`)
    }
  }
  return String(value)
}

async function submitToolTest(tool: MCPToolItem) {
  if (!selectedMcpUuid.value) return
  const toolName = tool.name
  toolTestLoading.value[toolName] = true
  toolTestResult.value[toolName] = null
  try {
    const rawValues = toolFormValues.value[toolName] || {}
    const args: Record<string, unknown> = {}
    const schema = getToolProperties(tool)
    if (Object.keys(schema).length > 0) {
      for (const [key, prop] of Object.entries(schema)) {
        const parsedValue = parseToolArgumentValue(tool, key, prop, rawValues[key])
        if (parsedValue !== undefined) {
          args[key] = parsedValue
        }
      }
    } else {
      Object.assign(args, rawValues)
    }
    const res = await mcpApi.callMCPTool(selectedMcpUuid.value, toolName, args)
    toolTestResult.value[toolName] = res.data
  } catch (e: any) {
    toolTestResult.value[toolName] = {
      is_error: true,
      error: e.response?.data?.message || e.message || '调用失败'
    }
  } finally {
    toolTestLoading.value[toolName] = false
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
    connectStatus.value = 'idle'
    mcpTools.value = null
    await loadMcps()
  } catch (e) {
    console.error('Failed to delete MCP:', e)
  }
}

function getStatusVariant(status: string): 'gray' | 'green' | 'red' {
  if (status === 'active' || status === 'connected') return 'green'
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
              <Button v-if="persistentConnectionStatus === 'disconnected'" size="sm" variant="primary" @click="connectMcp">连接</Button>
              <Button v-else size="sm" variant="gray" @click="disconnectMcp">断开连接</Button>
              <Button size="sm" variant="gray" @click="startEdit">编辑</Button>
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

        <!-- Inline Connection Test Status -->
        <div v-if="connectStatus === 'loading'" class="text-sm text-gray-500 py-2">连接测试中...</div>
        <Card v-else-if="connectStatus === 'error'" class="border-red-200">
          <div class="flex items-center gap-2 mb-1"><Badge variant="red">连接失败</Badge></div>
          <p class="text-sm text-red-600">{{ connectError }}</p>
        </Card>
        <template v-else-if="persistentConnectionStatus === 'connected'">
          <div class="flex items-center gap-2 text-sm text-green-700 py-1">
            <Badge variant="green">已连接</Badge>
            <span v-if="mcpTools !== null">{{ mcpTools.length }} 个工具</span>
          </div>

          <!-- Tools Section -->
          <Card>
            <h3 class="font-medium text-gray-900 mb-4">可用工具列表</h3>
            <div v-if="mcpTools === null" class="text-gray-500 text-sm">加载工具中...</div>
            <div v-else-if="mcpTools.length === 0" class="text-gray-500 text-sm">暂无可用工具</div>
            <div v-else class="space-y-4">
              <div v-for="tool in mcpTools" :key="tool.name" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <div class="font-medium text-gray-900">{{ tool.name }}</div>
                    <p v-if="tool.description" class="text-sm text-gray-500 mt-1">{{ tool.description }}</p>
                  </div>
                  <Badge variant="gray">{{ hasToolParameters(tool) ? '可配置参数' : '无参数' }}</Badge>
                </div>

                <!-- Dynamic Test Form -->
                <div class="mt-3 space-y-3">
                  <div v-if="hasToolParameters(tool)" class="space-y-3">
                    <div v-for="(prop, fieldKey) in getToolProperties(tool)" :key="fieldKey">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        {{ fieldKey }}
                        <span v-if="isRequired(tool, fieldKey as string)" class="text-red-500">*</span>
                        <span v-if="prop.description" class="text-gray-400 font-normal text-xs ml-1">({{ prop.description }})</span>
                      </label>

                      <!-- String -->
                      <Input v-if="getSchemaType(prop) === 'string' && !prop.enum" :model-value="getToolFieldInputValue(tool.name, fieldKey as string)" :placeholder="getToolFieldPlaceholder(String(fieldKey), prop)" @update:model-value="setToolFieldValue(tool.name, fieldKey as string, $event)" />
                      <!-- Enum -->
                      <Select v-else-if="getSchemaType(prop) === 'string' && prop.enum" :model-value="getToolFieldStringValue(tool.name, fieldKey as string) || undefined" :options="getEnumOptions(prop) || []" @update:model-value="setToolFieldValue(tool.name, fieldKey as string, $event)" />
                      <!-- Number -->
                      <input v-else-if="getSchemaType(prop) === 'number' || getSchemaType(prop) === 'integer'" type="number" v-model="toolFormValues[tool.name][fieldKey as string]" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" :placeholder="getToolFieldPlaceholder(String(fieldKey), prop)" />
                      <!-- Boolean -->
                      <label v-else-if="getSchemaType(prop) === 'boolean'" class="flex items-center gap-2">
                        <input type="checkbox" v-model="toolFormValues[tool.name][fieldKey as string]" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                        <span class="text-sm text-gray-700">是</span>
                      </label>
                      <!-- Array -->
                      <div v-else-if="getSchemaType(prop) === 'array'">
                        <Input :model-value="getToolFieldInputValue(tool.name, fieldKey as string)" :placeholder="getToolFieldPlaceholder(String(fieldKey), prop)" @update:model-value="setToolFieldValue(tool.name, fieldKey as string, $event)" />
                        <p class="text-xs text-gray-400 mt-1">多个值用逗号分隔，也可以直接输入 JSON 数组</p>
                      </div>
                      <!-- Object / Fallback -->
                      <div v-else>
                        <textarea :value="getToolFieldStringValue(tool.name, fieldKey as string)" class="w-full h-20 bg-white border border-gray-200 p-2 text-sm font-mono rounded" :placeholder="getToolFieldPlaceholder(String(fieldKey), prop)" @input="setToolFieldValue(tool.name, fieldKey as string, ($event.target as HTMLTextAreaElement).value)" />
                        <p class="text-xs text-gray-400 mt-1">请输入 JSON 对象</p>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-gray-400 text-sm">该工具无参数，可直接执行测试</div>

                  <div class="flex justify-end">
                    <Button size="sm" variant="black" :loading="toolTestLoading[tool.name]" @click="submitToolTest(tool)">执行测试</Button>
                  </div>

                  <!-- Tool Test Result -->
                  <div v-if="toolTestResult[tool.name]" class="mt-3">
                    <div class="mb-2">
                      <Badge :variant="toolTestResult[tool.name]!.is_error ? 'red' : 'green'">
                        {{ toolTestResult[tool.name]!.is_error ? 'Error' : 'Success' }}
                      </Badge>
                    </div>
                    <div v-if="toolTestResult[tool.name]!.content !== undefined" class="mb-2">
                      <pre class="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{{ JSON.stringify(toolTestResult[tool.name]!.content, null, 2) }}</pre>
                    </div>
                    <div v-if="toolTestResult[tool.name]!.structured_content !== undefined" class="mb-2">
                      <p class="text-xs text-gray-500 mb-1">structured_content:</p>
                      <pre class="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{{ JSON.stringify(toolTestResult[tool.name]!.structured_content, null, 2) }}</pre>
                    </div>
                    <div v-if="toolTestResult[tool.name]!.error" class="text-red-600 text-sm">{{ toolTestResult[tool.name]!.error }}</div>
                    <div v-if="toolTestResult[tool.name]!.raw !== undefined" class="mt-2">
                      <p class="text-xs text-gray-500 mb-1">raw:</p>
                      <pre class="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{{ JSON.stringify(toolTestResult[tool.name]!.raw, null, 2) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </template>
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
                { label: 'Streamable HTTP', value: 'streamable_http' },
                { label: 'SSE', value: 'sse' }
              ]"
            />
          </div>
          <template v-if="formData.type === 'stdio'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">命令 *</label>
              <Input v-model="formData.command" placeholder="例如: npx 或 python" />
              <p class="text-xs text-gray-400 mt-1">直接填写可执行命令，不要写 cmd /c</p>
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
              { label: 'Streamable HTTP', value: 'streamable_http' },
              { label: 'SSE', value: 'sse' }
            ]"
          />
        </div>
        <template v-if="formData.type === 'stdio'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">命令 *</label>
            <Input v-model="formData.command" placeholder="例如: npx 或 python" />
            <p class="text-xs text-gray-400 mt-1">直接填写可执行命令，不要写 cmd /c</p>
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
