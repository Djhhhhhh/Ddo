<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import Layout from '@/components/Layout/Layout.vue'

const themeStore = useThemeStore()

onMounted(() => {
  // Apply theme class to document
  themeStore.init()
})
</script>

<template>
  <Layout />
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
