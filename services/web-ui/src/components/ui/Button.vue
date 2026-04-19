<script setup lang="ts">
defineProps<{
  variant?: 'gray' | 'white' | 'black'
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="{
      'bg-gray-200 text-gray-800 border border-gray-200 hover:bg-gray-300': variant === 'gray' || !variant,
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400': variant === 'white',
      'bg-black text-white border border-black hover:bg-gray-900': variant === 'black'
    }"
    style="border-radius: 9999px; padding: 10px 24px;"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>