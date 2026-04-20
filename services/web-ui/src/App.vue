<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import Layout from '@/components/Layout/Layout.vue'
import DingIslandCard from '@/components/DingIsland/DingIslandCard.vue'

const themeStore = useThemeStore()
const route = useRoute()

// 判断是否为灵动岛独立窗口模式
const isIslandMode = computed(() => route.path === '/island')

onMounted(() => {
  // Apply theme class to document
  themeStore.init()
})
</script>

<template>
  <!-- 灵动岛独立窗口模式 -->
  <div v-if="isIslandMode" class="p-0">
    <DingIslandCard />
  </div>
  <!-- 普通 Web UI 模式 -->
  <Layout v-else />
</template>

<style>
/* Ollama Design System - Global Styles */
html {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #ffffff;
}

body {
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Display headings - SF Pro Rounded */
.font-display {
  font-family: "SF Pro Rounded", system-ui, -apple-system, sans-serif;
}

/* Monospace for code */
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Dark theme */
html.dark {
  background-color: #090909;
  color: #fafafa;
}

html.dark body {
  background-color: #090909;
}
</style>
