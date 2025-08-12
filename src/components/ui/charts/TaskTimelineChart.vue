<template>
  <div class="task-timeline-chart">
    <div class="chart-header q-mb-md">
      <div class="text-h6">任務趨勢 (近30天)</div>
      <div class="text-caption text-grey-6">任務創建與完成情況</div>
    </div>
    <BaseChart
      type="line"
      :data="chartData"
      :options="chartOptions"
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { TimelineData } from '@/services/domain/statistics.service'

interface Props {
  timeline: TimelineData[]
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px'
})

const chartData = computed(() => {
  const labels = props.timeline.map(item => {
    const date = new Date(item.date)
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  })

  return {
    labels,
    datasets: [
      {
        label: '新建任務',
        data: props.timeline.map(item => item.created),
        borderColor: '#2196F3',
        backgroundColor: '#2196F3' + '20',
        fill: false,
        tension: 0.3
      },
      {
        label: '完成任務',
        data: props.timeline.map(item => item.completed),
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50' + '20',
        fill: false,
        tension: 0.3
      },
      {
        label: '活躍任務',
        data: props.timeline.map(item => item.active),
        borderColor: '#FF9800',
        backgroundColor: '#FF9800' + '20',
        fill: true,
        tension: 0.3
      }
    ]
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
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        title: (context: Array<{ dataIndex: number }>): string => {
          const index = context[0].dataIndex
          const date = new Date(props.timeline[index].date)
          return date.toLocaleDateString('zh-TW', { 
            year: 'numeric',
            month: 'long', 
            day: 'numeric' 
          })
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: '日期'
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: '任務數量'
      },
      beginAtZero: true
    }
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false
  }
}))
</script>

<style scoped lang="scss">
.task-timeline-chart {
  .chart-header {
    text-align: center;
  }
}
</style>