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
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label || 'Value',
        data: props.data,
        borderColor: '#000000',
        backgroundColor: '#fafafa',
        borderWidth: 1,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#000000',
        pointRadius: 3
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
