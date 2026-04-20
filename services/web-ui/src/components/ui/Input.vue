<script setup lang="ts">
defineProps<{
  modelValue: string | number
  placeholder?: string
  type?: string
  disabled?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <input
    :type="type || 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full bg-white border border-gray-200 outline-none transition-colors duration-150"
    style="border-radius: 9999px; padding: 10px 20px;"
    :class="{
      'focus:ring-2 focus:ring-blue-500/50 focus:border-gray-300': !disabled,
      'placeholder:text-gray-400': !disabled,
      'bg-gray-50 text-gray-400 cursor-not-allowed': disabled
    }"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>