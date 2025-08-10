<template>
  <div class="task-status-chart">
    <div class="chart-header q-mb-md">
      <div class="text-h6">任務狀態分佈</div>
      <div class="text-caption text-grey-6">{{ subtitle }}</div>
    </div>
    <BaseChart
      type="doughnut"
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

const subtitle = computed(() => {
  return `總共 ${props.statistics.total} 個任務，完成率 ${props.statistics.completionRate.toFixed(1)}%`
})

const chartData = computed(() => {
  const colors = {
    todo: '#9E9E9E',       // 灰色
    'in-progress': '#FF9800', // 橙色
    done: '#4CAF50',       // 綠色
    archived: '#607D8B'     // 藍灰色
  }

  const labels = {
    todo: '待辦',
    'in-progress': '進行中',
    done: '已完成',
    archived: '已封存'
  }

  const statusData = props.statistics.byStatus
  const chartLabels = Object.keys(statusData).map(status => labels[status as keyof typeof labels])
  const values = Object.values(statusData)
  const backgroundColors = Object.keys(statusData).map(status => colors[status as keyof typeof colors])

  return {
    labels: chartLabels,
    datasets: [{
      label: '任務數量',
      data: values,
      backgroundColor: backgroundColors,
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true
      }
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const total = props.statistics.total
          const value = context.parsed
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  cutout: '50%'
}))
</script>

<style scoped lang="scss">
.task-status-chart {
  .chart-header {
    text-align: center;
  }
}
</style>