<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps<{
  data: { name: string; value: number }[]
  height?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

function renderChart() {
  if (!canvasRef.value) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  // Use a refined grayscale palette with better contrast
  const colors = [
    '#1a1a1a',  // Near black - primary
    '#4a4a4a',  // Dark gray - secondary
    '#8a8a8a',  // Mid gray - tertiary
    '#b0b0b0',  // Light gray - quaternary
    '#d5d5d5'   // Very light gray - quinary
  ]

  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',  // Use doughnut for a more modern look
    data: {
      labels: props.data.map(d => d.name),
      datasets: [{
        data: props.data.map(d => d.value),
        backgroundColor: props.data.map((_, i) => colors[i % colors.length]),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',  // Make the doughnut ring thinner
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#525252',
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: 13,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const value = context.raw as number
              const percentage = ((value / total) * 100).toFixed(1)
              return ` ${context.label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

onMounted(renderChart)
watch(() => props.data, renderChart, { deep: true })
</script>

<template>
  <div :style="{ height: height || '220px' }" class="flex items-center justify-center">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
