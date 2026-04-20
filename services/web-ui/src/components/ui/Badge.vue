<script setup lang="ts">
defineProps<{
  variant?: 'gray' | 'green' | 'red'
}>()
</script>

<template>
  <span
    class="inline-flex items-center text-sm font-medium"
    style="border-radius: 9999px; padding: 4px 12px;"
    :class="{
      'bg-gray-100 text-gray-600': variant === 'gray' || !variant,
      'bg-green-100 text-green-700': variant === 'green',
      'bg-red-100 text-red-700': variant === 'red'
    }"
  >
    <slot />
  </span>
</template>
