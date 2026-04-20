<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const themeStore = useThemeStore()

const navItems = [
  { path: '/', label: 'Help' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/mcp', label: 'MCP' },
  { path: '/timer', label: 'Timer' },
  { path: '/knowledge', label: 'Knowledge' }
]

function toggleTheme() {
  themeStore.toggleTheme()
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="h-14 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
      <router-link to="/" class="flex items-center gap-2">
        <div class="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">D</span>
        </div>
        <span class="font-medium text-gray-900">Ddo</span>
      </router-link>

      <div class="flex items-center gap-5">
        <nav class="flex items-center gap-4">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150"
            active-class="text-gray-900"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <button
          @click="toggleTheme"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-150"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-6 py-10">
      <router-view />
    </main>
  </div>
</template>