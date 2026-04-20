<script setup lang="ts">
defineProps<{
  variant?: 'gray' | 'white' | 'black'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}>()
</script>

<template>
  <button
    class="inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
    :class="{
      'text-sm': size === 'sm' || !size,
      'text-base': size === 'md',
      'text-lg': size === 'lg',
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200': variant === 'gray' || !variant,
      'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50': variant === 'white',
      'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800': variant === 'black'
    }"
    :style="{
      borderRadius: '9999px',
      padding: size === 'sm' ? '6px 14px' : size === 'md' ? '8px 18px' : '10px 22px'
    }"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="animate-spin">⟳</span>
    <slot />
  </button>
</template>
