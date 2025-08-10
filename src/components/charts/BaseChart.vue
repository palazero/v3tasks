<template>
  <div :id="chartId" class="base-chart" :style="{ width: width, height: height }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
} from 'chart.js'
import type { ChartConfiguration, ChartType, ChartData, ChartOptions } from 'chart.js'
import { nanoid } from 'nanoid'

// 註冊 Chart.js 組件
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
)

interface Props {
  type: ChartType
  data: ChartConfiguration['data']
  options?: ChartConfiguration['options']
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '300px'
})

const chartId = ref(`chart-${nanoid()}`)
const canvasRef = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

const defaultOptions: ChartConfiguration['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

function createChart(): void {
  if (!canvasRef.value) return

  const config: ChartConfiguration = {
    type: props.type,
    data: props.data,
    options: {
      ...defaultOptions,
      ...props.options
    }
  }

  chartInstance = new Chart(canvasRef.value, config)
}

function updateChart(): void {
  if (!chartInstance) return

  chartInstance.data = props.data
  if (props.options) {
    chartInstance.options = {
      ...defaultOptions,
      ...props.options
    }
  }
  chartInstance.update()
}

function destroyChart(): void {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

// 監聽資料變化
watch(
  [(): ChartData => props.data, (): ChartOptions => props.options],
  (): void => {
    if (chartInstance) {
      updateChart()
    }
  },
  { deep: true }
)

// 監聽圖表類型變化
watch(
  (): ChartType => props.type,
  (): void => {
    destroyChart()
    void nextTick(() => {
      createChart()
    })
  }
)

onMounted(() => {
  void nextTick(() => {
    createChart()
  })
})

onUnmounted(() => {
  destroyChart()
})

// 導出方法供父組件使用
defineExpose({
  chart: chartInstance,
  update: updateChart,
  destroy: destroyChart
})
</script>

<style scoped lang="scss">
.base-chart {
  position: relative;
  
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
}
</style>