<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: {
    name: string
    description: string
    cron_expr: string
    timezone: string
    callback_url: string
    callback_method: string
    callback_headers: string
    callback_body: string
  }): void
}>()

const name = ref('')
const description = ref('')
const cron_expr = ref('')
const timezone = ref('Asia/Shanghai')
const callback_enabled = ref(false)
const callback_url = ref('')
const callback_method = ref('POST')
const callback_headers = ref('')
const callback_body = ref('')

const isValid = computed(() => {
  if (!name.value.trim()) return false
  if (!cron_expr.value.trim()) return false
  if (callback_enabled.value && !callback_url.value.trim()) return false
  return true
})

function submit() {
  if (!isValid.value) return
  emit('submit', {
    name: name.value.trim(),
    description: description.value.trim(),
    cron_expr: cron_expr.value.trim(),
    timezone: timezone.value,
    callback_url: callback_enabled.value ? callback_url.value.trim() : '',
    callback_method: callback_method.value,
    callback_headers: callback_enabled.value ? callback_headers.value.trim() : '',
    callback_body: callback_enabled.value ? callback_body.value.trim() : ''
  })
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-5">
    <!-- Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">任务名称 *</label>
      <Input
        v-model="name"
        placeholder="输入定时任务名称"
      />
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
      <Input
        v-model="description"
        placeholder="输入定时任务描述"
      />
    </div>

    <!-- Cron Expression -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Cron 表达式 *</label>
      <Input
        v-model="cron_expr"
        placeholder="例如: 0 * * * * (每小时的第0分钟)"
      />
      <p class="mt-1 text-xs text-gray-500">
        格式: 分 时 日 月 周，例如 "0 9 * * *" 表示每天 9:00
      </p>
    </div>

    <!-- Timezone -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">时区</label>
      <Select
        v-model="timezone"
        :options="[
          { label: 'Asia/Shanghai (UTC+8)', value: 'Asia/Shanghai' },
          { label: 'UTC', value: 'UTC' },
          { label: 'America/New_York (UTC-5)', value: 'America/New_York' },
          { label: 'Europe/London (UTC+0)', value: 'Europe/London' }
        ]"
      />
    </div>

    <!-- Callback Config -->
    <div class="space-y-4 border border-gray-200 p-4" style="border-radius: 12px;">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900">回调配置</p>
          <p class="text-xs text-gray-500">配置定时任务触发后是否发送 HTTP 回调请求</p>
        </div>
        <input v-model="callback_enabled" type="checkbox" class="h-4 w-4" />
      </div>

      <template v-if="callback_enabled">
        <!-- Callback URL -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">回调 URL *</label>
          <Input
            v-model="callback_url"
            placeholder="例如: https://example.com/webhook"
          />
        </div>

        <!-- Callback Method -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">HTTP 方法</label>
          <Select
            v-model="callback_method"
            :options="[
              { label: 'POST', value: 'POST' },
              { label: 'GET', value: 'GET' },
              { label: 'PUT', value: 'PUT' }
            ]"
          />
        </div>

        <!-- Callback Headers -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">请求头</label>
          <Input
            v-model="callback_headers"
            placeholder='JSON 格式，例如: {"Authorization": "Bearer xxx"}'
          />
        </div>

        <!-- Callback Body -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">请求体</label>
          <textarea
            v-model="callback_body"
            placeholder="JSON 格式的请求体"
            class="w-full bg-white border border-gray-200 outline-none transition-colors duration-150 resize-none"
            style="border-radius: 12px; padding: 10px 20px; min-height: 80px;"
            :class="{
              'focus:ring-2 focus:ring-blue-500/50 focus:border-gray-300': true
            }"
          />
        </div>
      </template>
    </div>

    <!-- Submit -->
    <div class="flex justify-end">
      <Button
        type="submit"
        variant="black"
        :disabled="!isValid || loading"
      >
        {{ loading ? '创建中...' : '创建' }}
      </Button>
    </div>
  </form>
</template>
