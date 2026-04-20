<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'

const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: {
    name: string
    description: string
    type: 'stdio' | 'http' | 'sse'
    command: string
    args: string
    env: string
    url: string
    headers: string
  }): void
}>()

const name = ref('')
const description = ref('')
const type = ref<'stdio' | 'http' | 'sse'>('stdio')
const command = ref('')
const args = ref('')
const env = ref('')
const url = ref('')
const headers = ref('')

const isValid = computed(() => {
  if (!name.value.trim()) return false
  if (type.value === 'stdio' && !command.value.trim()) return false
  if (type.value !== 'stdio' && !url.value.trim()) return false
  return true
})

watch(type, () => {
  command.value = ''
  args.value = ''
  env.value = ''
  url.value = ''
  headers.value = ''
})

function submit() {
  if (!isValid.value) return
  emit('submit', {
    name: name.value.trim(),
    description: description.value.trim(),
    type: type.value,
    command: command.value.trim(),
    args: args.value.trim(),
    env: env.value.trim(),
    url: url.value.trim(),
    headers: headers.value.trim()
  })
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-5">
    <!-- Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">名称 *</label>
      <Input
        v-model="name"
        placeholder="输入 MCP 配置名称"
      />
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
      <Input
        v-model="description"
        placeholder="输入 MCP 配置描述"
      />
    </div>

    <!-- Type -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">类型 *</label>
      <Select
        v-model="type"
        :options="[
          { label: 'Stdio (本地进程)', value: 'stdio' },
          { label: 'HTTP', value: 'http' },
          { label: 'SSE', value: 'sse' }
        ]"
        placeholder="选择 MCP 类型"
      />
    </div>

    <!-- Stdio Fields -->
    <template v-if="type === 'stdio'">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">命令 *</label>
        <Input
          v-model="command"
          placeholder="例如: npx, python"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">参数</label>
        <Input
          v-model="args"
          placeholder="用逗号分隔参数，例如: -m, mcp_server"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">环境变量</label>
        <Input
          v-model="env"
          placeholder="用逗号分隔，例如: API_KEY=xxx, DEBUG=true"
        />
      </div>
    </template>

    <!-- HTTP/SSE Fields -->
    <template v-else>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">URL *</label>
        <Input
          v-model="url"
          placeholder="例如: https://api.example.com/mcp"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">请求头</label>
        <Input
          v-model="headers"
          placeholder="JSON 格式，例如: {&quot;Authorization&quot;: &quot;Bearer xxx&quot;}"
        />
      </div>
    </template>

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
