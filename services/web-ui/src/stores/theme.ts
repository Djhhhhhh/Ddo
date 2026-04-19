import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const isDark = ref(false)

  function init() {
    // Load saved preference
    const saved = localStorage.getItem('ddo_theme') as ThemeMode | null
    if (saved) {
      mode.value = saved
    }
    updateTheme()
  }

  function updateTheme() {
    let dark = false

    if (mode.value === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      dark = mode.value === 'dark'
    }

    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.backgroundColor = dark ? '#090909' : '#ffffff'
  }

  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem('ddo_theme', newMode)
    updateTheme()
  }

  function toggleTheme() {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = modes.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    setTheme(modes[nextIndex])
  }

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') {
        updateTheme()
      }
    })
  }

  // Watch for mode changes
  watch(mode, updateTheme)

  return {
    mode,
    isDark,
    init,
    setTheme,
    toggleTheme
  }
})
