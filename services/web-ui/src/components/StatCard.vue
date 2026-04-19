<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  subtitle?: string
}>()
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-6">
    <p class="text-sm text-gray-500 mb-1">{{ title }}</p>
    <p class="text-2xl font-medium text-gray-900">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
  </div>
</template>
