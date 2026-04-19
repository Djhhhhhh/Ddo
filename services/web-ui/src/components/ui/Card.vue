<script setup lang="ts">
defineProps<{
  hoverable?: boolean
}>()
</script>

<template>
  <div
    class="bg-white border border-gray-200 p-6 transition-colors duration-150"
    style="border-radius: 12px;"
    :class="{ 'hover:border-gray-300': hoverable }"
  >
    <slot />
  </div>
</template>