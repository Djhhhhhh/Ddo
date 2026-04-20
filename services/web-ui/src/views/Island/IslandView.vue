<script setup lang="ts">
import { onMounted } from 'vue'
import DingIslandCard from '@/components/DingIsland/DingIslandCard.vue'

onMounted(() => {
  console.log('[IslandView] mounted')
})
</script>

<template>
  <div class="island-container">
    <DingIslandCard />
  </div>
</template>

<style scoped>
.island-container {
  min-height: 100vh;
  background: transparent;
  margin: 0;
  padding: 0;
}
</style>

<style>
/* Global styles for island window */
html, body {
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
