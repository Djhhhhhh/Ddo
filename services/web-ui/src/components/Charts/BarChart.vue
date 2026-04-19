<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps<{
  labels: string[]
  data: number[]
  label?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

function renderChart() {
  if (!canvasRef.value) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label || 'Value',
        data: props.data,
        backgroundColor: '#e5e5e5',
        borderColor: '#000000',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#737373'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#fafafa'
          },
          ticks: {
            color: '#737373'
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
  <div class="h-48">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
