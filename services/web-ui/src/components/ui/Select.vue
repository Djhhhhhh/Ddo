<script setup lang="ts">
defineProps<{
  modelValue: string | undefined
  options: { label: string; value: string }[]
  placeholder?: string
  disabled?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <select
    :value="modelValue"
    :disabled="disabled"
    class="w-full bg-white border border-gray-200 outline-none transition-colors duration-150 appearance-none cursor-pointer"
    style="border-radius: 9999px; padding: 10px 36px 10px 20px; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%23737373%27 d=%27M2 4l4 4 4-4%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 14px center;"
    :class="{
      'focus:ring-2 focus:ring-blue-500/50 focus:border-gray-300': !disabled,
      'bg-gray-50 text-gray-400 cursor-not-allowed': disabled
    }"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
    >
      {{ opt.label }}
    </option>
  </select>
</template>
