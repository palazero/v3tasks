<template>
  <div class="task-priority-chart">
    <div class="chart-header q-mb-md">
      <div class="text-h6">任務優先級分佈</div>
      <div class="text-caption text-grey-6">按優先級分類的任務數量</div>
    </div>
    <BaseChart
      type="bar"
      :data="chartData"
      :options="chartOptions"
      :height="height!"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { TaskStatistics } from '@/services/statisticsService'

interface Props {
  statistics: TaskStatistics
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px'
})

const chartData = computed(() => {
  const colors = {
    urgent: '#F44336',     // 紅色
    high: '#FF9800',       // 橙色
    medium: '#FFC107',     // 黃色
    low: '#4CAF50'         // 綠色
  }

  const labels = {
    urgent: '緊急',
    high: '高',
    medium: '中',
    low: '低'
  }

  const priorityData = props.statistics.byPriority
  const chartLabels = Object.keys(priorityData).map(priority => labels[priority as keyof typeof labels])
  const values = Object.values(priorityData)
  const backgroundColors = Object.keys(priorityData).map(priority => colors[priority as keyof typeof colors])

  return {
    labels: chartLabels,
    datasets: [{
      label: '任務數量',
      data: values,
      backgroundColor: backgroundColors.map(color => color + '80'), // 添加透明度
      borderColor: backgroundColors,
      borderWidth: 2,
      borderRadius: 4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false // 隱藏圖例，顏色已經很清楚了
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const total = props.statistics.total
          const value = context.parsed.y
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `任務數量: ${value} (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    }
  }
}))
</script>

<style scoped lang="scss">
.task-priority-chart {
  .chart-header {
    text-align: center;
  }
}
</style>