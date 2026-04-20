<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'
import * as timerApi from '@/api/timer'
import type { Timer, TimerLog, CreateTimerRequest, UpdateTimerRequest } from '@/api/types'

const timers = ref<Timer[]>([])
const loading = ref(false)
const selectedTimerUuid = ref<string | null>(null)
const selectedTimer = ref<Timer | null>(null)
const detailLoading = ref(false)

// Logs
const logs = ref<TimerLog[]>([])
const logsLoading = ref(false)

// Form states
const showCreateForm = ref(false)
const showEditForm = ref(false)
const showDeleteConfirm = ref(false)
const submitLoading = ref(false)
const actionLoading = ref<string | null>(null)

// Trigger type options
const triggerTypeOptions = [
  { label: 'Cron Expression', value: 'cron' },
  { label: 'Periodic Interval', value: 'periodic' },
  { label: 'Delayed One-shot', value: 'delayed' }
]

// HTTP method options
const httpMethodOptions = [
  { label: 'POST', value: 'POST' },
  { label: 'GET', value: 'GET' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' }
]

// Timezone options
const timezoneOptions = [
  { label: 'Asia/Shanghai (UTC+8)', value: 'Asia/Shanghai' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York (UTC-5)', value: 'America/New_York' }
]

// Create/Edit form
const formData = ref<CreateTimerRequest>({
  name: '',
  description: '',
  trigger_type: 'cron',
  cron_expr: '',
  interval_seconds: 3600,
  delay_seconds: 60,
  timezone: 'Asia/Shanghai',
  callback_url: '',
  callback_method: 'POST',
  callback_headers: {},
  callback_body: ''
})

// Cron input helpers (visual mode)
const cronMinute = ref('0')
const cronHour = ref('*')
const cronDay = ref('*')
const cronMonth = ref('*')
const cronWeek = ref('*')

const cronPresets = [
  { label: 'Every Hour', value: '0 * * * *' },
  { label: 'Daily 9:00', value: '0 9 * * *' },
  { label: 'Daily 18:00', value: '0 18 * * *' },
  { label: 'Weekly Mon', value: '0 9 * * 1' },
  { label: 'Monthly 1st', value: '0 9 1 * *' }
]

// Periodic interval presets (in seconds)
const intervalPresets = [
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '1 day', value: 86400 }
]

// Load timers
async function loadTimers() {
  loading.value = true
  try {
    const res = await timerApi.listTimers()
    timers.value = res.data.items
  } catch (e) {
    console.error('Failed to load timers:', e)
  } finally {
    loading.value = false
  }
}

// Load timer detail
async function loadTimerDetail(uuid: string) {
  detailLoading.value = true
  selectedTimerUuid.value = uuid
  try {
    const res = await timerApi.getTimer(uuid)
    selectedTimer.value = res.data.timer
  } catch (e) {
    console.error('Failed to load timer detail:', e)
  } finally {
    detailLoading.value = false
  }
}

// Load logs
async function loadLogs(uuid: string) {
  logsLoading.value = true
  try {
    const res = await timerApi.listTimerLogs(uuid)
    logs.value = res.data.items
  } catch (e) {
    console.error('Failed to load logs:', e)
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

onMounted(loadTimers)

// Select timer
function selectTimer(uuid: string) {
  loadTimerDetail(uuid)
  loadLogs(uuid)
}

// Build cron expression from parts
function buildCronExpression(): string {
  return `${cronMinute.value} ${cronHour.value} ${cronDay.value} ${cronMonth.value} ${cronWeek.value}`
}

// Parse cron expression to parts
function parseCronExpression(expr: string) {
  const parts = expr.split(' ')
  if (parts.length === 5) {
    cronMinute.value = parts[0]
    cronHour.value = parts[1]
    cronDay.value = parts[2]
    cronMonth.value = parts[3]
    cronWeek.value = parts[4]
  }
}

// Apply preset
function applyPreset(expr: string) {
  formData.value.cron_expr = expr
  parseCronExpression(expr)
}

// Reset create form
function resetCreateForm() {
  formData.value = {
    name: '',
    description: '',
    trigger_type: 'cron',
    cron_expr: '',
    interval_seconds: 3600,
    delay_seconds: 60,
    timezone: 'Asia/Shanghai',
    callback_url: '',
    callback_method: 'POST',
    callback_headers: {},
    callback_body: ''
  }
  cronMinute.value = '0'
  cronHour.value = '*'
  cronDay.value = '*'
  cronMonth.value = '*'
  cronWeek.value = '*'
}

// Submit create form
async function submitCreateForm() {
  submitLoading.value = true
  if (formData.value.trigger_type === 'cron') {
    formData.value.cron_expr = buildCronExpression()
  }
  try {
    await timerApi.createTimer(formData.value)
    showCreateForm.value = false
    await loadTimers()
  } catch (e) {
    console.error('Failed to create timer:', e)
  } finally {
    submitLoading.value = false
  }
}

// Submit edit form
async function submitEditForm() {
  if (!selectedTimerUuid.value) return
  submitLoading.value = true
  if (formData.value.trigger_type === 'cron') {
    formData.value.cron_expr = buildCronExpression()
  }
  try {
    await timerApi.updateTimer(selectedTimerUuid.value, formData.value)
    showEditForm.value = false
    await loadTimerDetail(selectedTimerUuid.value)
    await loadTimers()
  } catch (e) {
    console.error('Failed to update timer:', e)
  } finally {
    submitLoading.value = false
  }
}

// Start edit
function startEdit() {
  if (!selectedTimer.value) return
  formData.value = {
    name: selectedTimer.value.name,
    description: selectedTimer.value.description || '',
    trigger_type: selectedTimer.value.trigger_type || 'cron',
    cron_expr: selectedTimer.value.cron_expr || '',
    interval_seconds: (selectedTimer.value as any).interval_seconds || 3600,
    delay_seconds: (selectedTimer.value as any).delay_seconds || 60,
    timezone: selectedTimer.value.timezone || 'Asia/Shanghai',
    callback_url: selectedTimer.value.callback_url,
    callback_method: selectedTimer.value.callback_method || 'POST',
    callback_headers: selectedTimer.value.callback_headers || {},
    callback_body: selectedTimer.value.callback_body || ''
  }
  if (formData.value.cron_expr) {
    parseCronExpression(formData.value.cron_expr)
  }
  showEditForm.value = true
}

// Pause timer
async function pauseTimer(uuid: string) {
  actionLoading.value = uuid
  try {
    await timerApi.pauseTimer(uuid)
    await loadTimers()
    if (selectedTimerUuid.value === uuid) {
      await loadTimerDetail(uuid)
      await loadLogs(uuid)
    }
  } catch (e) {
    console.error('Failed to pause timer:', e)
  } finally {
    actionLoading.value = null
  }
}

// Resume timer
async function resumeTimer(uuid: string) {
  actionLoading.value = uuid
  try {
    await timerApi.resumeTimer(uuid)
    await loadTimers()
    if (selectedTimerUuid.value === uuid) {
      await loadTimerDetail(uuid)
      await loadLogs(uuid)
    }
  } catch (e) {
    console.error('Failed to resume timer:', e)
  } finally {
    actionLoading.value = null
  }
}

// Trigger timer
async function triggerTimer(uuid: string) {
  actionLoading.value = uuid
  try {
    await timerApi.triggerTimer(uuid)
    await loadLogs(uuid)
  } catch (e) {
    console.error('Failed to trigger timer:', e)
  } finally {
    actionLoading.value = null
  }
}

// Delete timer
async function deleteTimer() {
  if (!selectedTimerUuid.value) return
  try {
    await timerApi.deleteTimer(selectedTimerUuid.value)
    showDeleteConfirm.value = false
    selectedTimer.value = null
    selectedTimerUuid.value = null
    logs.value = []
    await loadTimers()
  } catch (e) {
    console.error('Failed to delete timer:', e)
  }
}

function getStatusVariant(status: string): 'gray' | 'green' | 'red' {
  if (status === 'active') return 'green'
  if (status === 'paused') return 'gray'
  if (status === 'error') return 'red'
  return 'gray'
}

function getStatusText(status: string) {
  return status // Keep original English status
}

function getTriggerTypeText(type_: string) {
  const map: Record<string, string> = {
    cron: 'Cron',
    periodic: 'Periodic',
    delayed: 'Delayed'
  }
  return map[type_] || type_
}

function formatTime(time?: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatInterval(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-3xl font-medium text-gray-900">定时任务</h1>
      <Button variant="black" @click="showCreateForm = true; resetCreateForm()">+ 新增任务</Button>
    </div>

    <!-- Left-Right Split Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Panel - Timer List -->
      <div class="space-y-4">
        <Card v-if="loading">
          <p class="text-gray-500">加载中...</p>
        </Card>

        <Card v-else-if="timers.length === 0">
          <p class="text-gray-500">暂无定时任务</p>
          <p class="text-sm text-gray-400 mt-2">点击"新增任务"创建第一个定时任务</p>
        </Card>

        <Card
          v-else
          v-for="timer in timers"
          :key="timer.uuid"
          :hoverable="true"
          class="cursor-pointer transition-colors"
          :class="{ 'border-gray-900': selectedTimerUuid === timer.uuid }"
          @click="selectTimer(timer.uuid)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-gray-900">{{ timer.name }}</h3>
                <Badge :variant="getStatusVariant(timer.status)" class="text-xs">
                  {{ getStatusText(timer.status) }}
                </Badge>
              </div>
              <p class="text-sm font-mono text-gray-500">{{ getTriggerTypeText(timer.trigger_type) }}</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Right Panel - Detail & Logs -->
      <div class="lg:col-span-2 space-y-4">
        <!-- No Selection -->
        <Card v-if="!selectedTimerUuid">
          <div class="text-center py-12">
            <p class="text-gray-500">👈 请选择一个定时任务查看详情</p>
          </div>
        </Card>

        <Card v-else-if="detailLoading">
          <p class="text-gray-500">加载中...</p>
        </Card>

        <template v-else-if="selectedTimer">
          <!-- Timer Header -->
          <Card>
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <h2 class="text-xl font-medium text-gray-900">{{ selectedTimer.name }}</h2>
                  <Badge :variant="getStatusVariant(selectedTimer.status)">
                    {{ getStatusText(selectedTimer.status) }}
                  </Badge>
                </div>
                <p v-if="selectedTimer.description" class="text-gray-500">{{ selectedTimer.description }}</p>
              </div>
              <div class="flex gap-2">
                <Button
                  v-if="selectedTimer.status === 'active'"
                  variant="gray"
                  :disabled="actionLoading === selectedTimer.uuid"
                  @click="pauseTimer(selectedTimer.uuid)"
                >
                  暂停
                </Button>
                <Button
                  v-else
                  variant="gray"
                  :disabled="actionLoading === selectedTimer.uuid"
                  @click="resumeTimer(selectedTimer.uuid)"
                >
                  恢复
                </Button>
                <Button
                  variant="white"
                  :disabled="actionLoading === selectedTimer.uuid"
                  @click="triggerTimer(selectedTimer.uuid)"
                >
                  触发
                </Button>
                <Button variant="gray" @click="startEdit">编辑</Button>
                <Button variant="gray" @click="showDeleteConfirm = true">删除</Button>
              </div>
            </div>

            <!-- Timer Info -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">类型</p>
                <p class="font-medium text-gray-900">{{ getTriggerTypeText(selectedTimer.trigger_type) }}</p>
              </div>
              <div v-if="selectedTimer.trigger_type === 'cron'" class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">Cron 表达式</p>
                <p class="font-medium text-gray-900 font-mono">{{ selectedTimer.cron_expr }}</p>
              </div>
              <div v-else-if="selectedTimer.trigger_type === 'periodic'" class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">间隔</p>
                <p class="font-medium text-gray-900">{{ formatInterval((selectedTimer as any).interval_seconds || 0) }}</p>
              </div>
              <div v-else-if="selectedTimer.trigger_type === 'delayed'" class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">延迟</p>
                <p class="font-medium text-gray-900">{{ formatInterval((selectedTimer as any).delay_seconds || 0) }}</p>
              </div>
              <div class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">下次执行</p>
                <p class="font-medium text-gray-900">{{ formatTime(selectedTimer.next_run_at) }}</p>
              </div>
              <div class="p-4 bg-gray-50" style="border-radius: 12px;">
                <p class="text-sm text-gray-500 mb-1">上次执行</p>
                <p class="font-medium text-gray-900">{{ formatTime(selectedTimer.last_run_at) }}</p>
              </div>
            </div>
          </Card>

          <!-- Logs -->
          <Card>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">执行日志</h3>
              <Button variant="gray" @click="loadLogs(selectedTimer.uuid)">刷新</Button>
            </div>

            <div v-if="logsLoading" class="text-center py-8 text-gray-500">加载中...</div>
            <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-500">暂无执行日志</div>
            <div v-else class="space-y-3 max-h-96 overflow-auto">
              <div
                v-for="log in logs"
                :key="log.id"
                class="p-4 bg-gray-50 border border-gray-200"
                style="border-radius: 12px;"
              >
                <div class="flex items-center justify-between mb-2">
                  <Badge :variant="log.status === 'success' ? 'green' : 'red'">
                    {{ log.status === 'success' ? 'Success' : 'Failed' }}
                  </Badge>
                  <span class="text-xs text-gray-400">{{ formatTime(log.created_at) }}</span>
                </div>
                <div class="text-sm text-gray-600 mb-1">
                  耗时: {{ formatDuration(log.duration) }}
                </div>
                <div v-if="log.output" class="text-sm text-gray-700 mb-1">
                  <span class="font-medium">输出: </span>{{ log.output }}
                </div>
                <div v-if="log.error" class="text-sm text-red-600">
                  <span class="font-medium">错误: </span>{{ log.error }}
                </div>
              </div>
            </div>
          </Card>
        </template>
      </div>
    </div>

    <!-- Create Form Modal -->
    <Modal v-model="showCreateForm" title="新增定时任务" class="max-w-2xl">
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">任务名称 *</label>
          <Input v-model="formData.name" placeholder="输入任务名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <Input v-model="formData.description" placeholder="任务描述（可选）" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">类型 *</label>
          <Select v-model="formData.trigger_type" :options="triggerTypeOptions" />
        </div>

        <!-- Cron Fields -->
        <template v-if="formData.trigger_type === 'cron'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">快速选择</label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="preset in cronPresets"
                :key="preset.value"
                variant="gray"
                class="text-sm"
                @click="applyPreset(preset.value)"
              >
                {{ preset.label }}
              </Button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cron 表达式</label>
            <div class="grid grid-cols-5 gap-2 mb-2">
              <div>
                <label class="text-xs text-gray-500">分 (0-59)</label>
                <Input v-model="cronMinute" placeholder="0" />
              </div>
              <div>
                <label class="text-xs text-gray-500">时 (0-23)</label>
                <Input v-model="cronHour" placeholder="*" />
              </div>
              <div>
                <label class="text-xs text-gray-500">日 (1-31)</label>
                <Input v-model="cronDay" placeholder="*" />
              </div>
              <div>
                <label class="text-xs text-gray-500">月 (1-12)</label>
                <Input v-model="cronMonth" placeholder="*" />
              </div>
              <div>
                <label class="text-xs text-gray-500">周 (0-6)</label>
                <Input v-model="cronWeek" placeholder="*" />
              </div>
            </div>
            <p class="text-xs text-gray-500">
              当前: <span class="font-mono">{{ buildCronExpression() }}</span>
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">时区</label>
            <Select v-model="formData.timezone" :options="timezoneOptions" />
          </div>
        </template>

        <!-- Periodic Fields -->
        <template v-if="formData.trigger_type === 'periodic'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">间隔预设</label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="preset in intervalPresets"
                :key="preset.value"
                variant="gray"
                class="text-sm"
                @click="formData.interval_seconds = preset.value"
              >
                {{ preset.label }}
              </Button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">间隔 (秒) *</label>
            <Input v-model.number="formData.interval_seconds" type="number" placeholder="3600" />
          </div>
        </template>

        <!-- Delayed Fields -->
        <template v-if="formData.trigger_type === 'delayed'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">延迟 (秒) *</label>
            <Input v-model.number="formData.delay_seconds" type="number" placeholder="60" />
          </div>
        </template>

        <!-- Common Fields -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">回调 URL *</label>
          <Input v-model="formData.callback_url" placeholder="https://example.com/webhook" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">HTTP 方法</label>
          <Select v-model="formData.callback_method" :options="httpMethodOptions" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">请求体</label>
          <textarea
            v-model="formData.callback_body"
            placeholder='{"key": "value"}'
            class="w-full h-24 bg-white border border-gray-200 outline-none p-3 text-sm"
            style="border-radius: 12px;"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="gray" @click="showCreateForm = false">取消</Button>
          <Button variant="black" :loading="submitLoading" @click="submitCreateForm">创建</Button>
        </div>
      </div>
    </Modal>

    <!-- Edit Form Modal -->
    <Modal v-model="showEditForm" title="编辑定时任务" class="max-w-2xl">
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">任务名称 *</label>
          <Input v-model="formData.name" placeholder="输入任务名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <Input v-model="formData.description" placeholder="任务描述（可选）" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">类型 *</label>
          <Select v-model="formData.trigger_type" :options="triggerTypeOptions" />
        </div>

        <!-- Cron Fields -->
        <template v-if="formData.trigger_type === 'cron'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cron 表达式</label>
            <div class="grid grid-cols-5 gap-2 mb-2">
              <div>
                <label class="text-xs text-gray-500">分</label>
                <Input v-model="cronMinute" />
              </div>
              <div>
                <label class="text-xs text-gray-500">时</label>
                <Input v-model="cronHour" />
              </div>
              <div>
                <label class="text-xs text-gray-500">日</label>
                <Input v-model="cronDay" />
              </div>
              <div>
                <label class="text-xs text-gray-500">月</label>
                <Input v-model="cronMonth" />
              </div>
              <div>
                <label class="text-xs text-gray-500">周</label>
                <Input v-model="cronWeek" />
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">时区</label>
            <Select v-model="formData.timezone" :options="timezoneOptions" />
          </div>
        </template>

        <!-- Periodic Fields -->
        <template v-if="formData.trigger_type === 'periodic'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">间隔 (秒)</label>
            <Input v-model.number="formData.interval_seconds" type="number" />
          </div>
        </template>

        <!-- Delayed Fields -->
        <template v-if="formData.trigger_type === 'delayed'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">延迟 (秒)</label>
            <Input v-model.number="formData.delay_seconds" type="number" />
          </div>
        </template>

        <!-- Common Fields -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">回调 URL *</label>
          <Input v-model="formData.callback_url" placeholder="https://example.com/webhook" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">HTTP 方法</label>
          <Select v-model="formData.callback_method" :options="httpMethodOptions" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">请求体</label>
          <textarea
            v-model="formData.callback_body"
            placeholder='{"key": "value"}'
            class="w-full h-24 bg-white border border-gray-200 outline-none p-3 text-sm"
            style="border-radius: 12px;"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="gray" @click="showEditForm = false">取消</Button>
          <Button variant="black" :loading="submitLoading" @click="submitEditForm">保存</Button>
        </div>
      </div>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="showDeleteConfirm" title="确认删除">
      <div class="text-center py-4">
        <p class="text-gray-700 mb-4">确定要删除 "{{ selectedTimer?.name }}" 吗？</p>
        <p class="text-sm text-gray-500">此操作不可撤销。</p>
      </div>
      <div class="flex justify-center gap-4">
        <Button variant="gray" @click="showDeleteConfirm = false">取消</Button>
        <Button variant="black" @click="deleteTimer">确认删除</Button>
      </div>
    </Modal>
  </div>
</template>
