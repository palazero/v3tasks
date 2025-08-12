<template>
  <div class="project-completion-chart">
    <div class="chart-header q-mb-md">
      <div class="text-h6">專案完成率</div>
      <div class="text-caption text-grey-6">各專案任務完成情況</div>
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
import type { ProjectStatistics } from '@/services/domain/statistics.service'

interface Props {
  statistics: ProjectStatistics
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px'
})

const chartData = computed(() => {
  // 取前8個專案以避免圖表過於擁擠
  const topProjects = props.statistics.completionRates.slice(0, 8)
  
  const labels = topProjects.map(project => 
    project.projectName.length > 10 
      ? project.projectName.substring(0, 10) + '...'
      : project.projectName
  )
  
  const rates = topProjects.map(project => project.rate)
  
  // 根據完成率設定顏色
  const backgroundColors = rates.map(rate => {
    if (rate >= 80) return '#4CAF50' + '80'  // 綠色 - 完成度高
    if (rate >= 60) return '#8BC34A' + '80'  // 淺綠色
    if (rate >= 40) return '#FFC107' + '80'  // 黃色
    if (rate >= 20) return '#FF9800' + '80'  // 橙色
    return '#F44336' + '80'                  // 紅色 - 完成度低
  })

  const borderColors = backgroundColors.map(color => color.replace('80', ''))

  return {
    labels,
    datasets: [{
      label: '完成率 (%)',
      data: rates,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 2,
      borderRadius: 4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const, // 水平條形圖
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        title: (context: Array<{ dataIndex: number }>): string => {
          const index = context[0].dataIndex
          return props.statistics.completionRates[index]?.projectName || 'Unknown'
        },
        label: (context: { parsed: { x: number } }): string => {
          const value = context.parsed.x
          return `完成率: ${value.toFixed(1)}%`
        }
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: number | string): string => `${value}%`
      },
      title: {
        display: true,
        text: '完成率 (%)'
      }
    },
    y: {
      title: {
        display: true,
        text: '專案'
      }
    }
  }
}))
</script>

<style scoped lang="scss">
.project-completion-chart {
  .chart-header {
    text-align: center;
  }
}
</style>