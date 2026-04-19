/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ollama Design System Grayscale Palette
        'gray-50': '#fafafa',
        'gray-100': '#f5f5f5',
        'gray-200': '#e5e5e5',
        'gray-300': '#d4d4d4',
        'gray-400': '#a3a3a3',
        'gray-500': '#737373',
        'gray-600': '#525252',
        'gray-700': '#404040',
        'gray-800': '#262626',
        'gray-900': '#090909',
        'gray-950': '#030303',
      },
      fontFamily: {
        // SF Pro Rounded for display headings (macOS/iOS fallback to system-ui)
        'display': ['"SF Pro Rounded"', 'system-ui', '-apple-system', 'sans-serif'],
        // Standard system sans for body text
        'sans': ['system-ui', '-apple-system', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'sans-serif'],
        // Monospace for code
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        // Ollama binary radius system
        'container': '12px',  // For containers, cards, code blocks
        'pill': '9999px',     // For all interactive elements
      },
      spacing: {
        // Base unit: 8px scale
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      }
    },
  },
  plugins: [],
}