<template>
  <div class="custom-chart" :class="{ 'chart-loading': isLoading }">
    <!-- 圖表標題 -->
    <div v-if="showTitle && config?.name" class="chart-title">
      <div class="title-text">{{ config.name }}</div>
      <div v-if="config.description" class="title-description">
        {{ config.description }}
      </div>
    </div>
    
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="chart-loading-overlay">
      <q-spinner-dots size="2rem" color="primary" />
      <div class="loading-text">正在生成報表...</div>
    </div>
    
    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="chart-error">
      <q-icon name="error_outline" size="2rem" color="negative" />
      <div class="error-text">{{ error }}</div>
      <q-btn 
        flat 
        color="primary" 
        @click="$emit('retry')"
        :loading="isLoading"
      >
        重新載入
      </q-btn>
    </div>
    
    <!-- 空資料狀態 -->
    <div v-else-if="!reportData || reportData.datasets.length === 0" class="chart-empty">
      <q-icon name="assessment" size="3rem" color="grey-5" />
      <div class="empty-text">無資料可顯示</div>
      <div class="empty-subtitle">請調整篩選條件或檢查資料來源</div>
    </div>
    
    <!-- 圖表內容 -->
    <div v-else class="chart-container">
      <!-- Chart.js 圖表 -->
      <BaseChart
        v-if="isChartJsType"
        :type="chartJsType"
        :data="chartJsData"
        :options="chartJsOptions"
        :height="effectiveHeight"
        :width="effectiveWidth"
      />
      
      <!-- 自訂圖表類型 -->
      <component 
        v-else
        :is="customChartComponent"
        :data="reportData"
        :config="config"
        :height="effectiveHeight"
        :width="effectiveWidth"
        v-bind="chartOptions"
      />
      
      <!-- 統計摘要 -->
      <div v-if="showSummary && reportData.summary" class="chart-summary">
        <div class="summary-item">
          <span class="summary-label">總計</span>
          <span class="summary-value">{{ formatValue(reportData.summary.total) }}</span>
        </div>
        <div v-if="reportData.summary.average !== undefined" class="summary-item">
          <span class="summary-label">平均</span>
          <span class="summary-value">{{ formatValue(reportData.summary.average) }}</span>
        </div>
        <div v-if="reportData.summary.min !== undefined" class="summary-item">
          <span class="summary-label">最小</span>
          <span class="summary-value">{{ formatValue(reportData.summary.min) }}</span>
        </div>
        <div v-if="reportData.summary.max !== undefined" class="summary-item">
          <span class="summary-label">最大</span>
          <span class="summary-value">{{ formatValue(reportData.summary.max) }}</span>
        </div>
      </div>
      
      <!-- 圖表操作按鈕 -->
      <div v-if="showActions" class="chart-actions">
        <q-btn
          flat
          round
          dense
          icon="refresh"
          @click="$emit('refresh')"
          :loading="isLoading"
        >
          <q-tooltip>刷新數據</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="download"
          @click="handleExport"
        >
          <q-tooltip>匯出圖表</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="settings"
          @click="$emit('configure')"
        >
          <q-tooltip>設定</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseChart from './BaseChart.vue'
import type { ChartConfiguration, ChartType as ChartJSType } from 'chart.js'
import type { 
  ReportConfig, 
  ReportData, 
  ReportChartOptions,
  ChartType
} from '@/types/report'
import { COLOR_SCHEMES, DEFAULT_CHART_OPTIONS } from '@/types/report'

interface Props {
  config?: ReportConfig
  reportData?: ReportData
  isLoading?: boolean
  error?: string
  
  // 顯示選項
  showTitle?: boolean
  showSummary?: boolean
  showActions?: boolean
  
  // 尺寸選項
  height?: string
  width?: string
  
  // 圖表選項覆寫
  chartOptions?: Partial<ReportChartOptions>
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  showTitle: true,
  showSummary: true,
  showActions: true,
  height: '400px',
  width: '100%'
})

interface Emits {
  retry: []
  refresh: []
  configure: []
  export: [format: string]
}

const emit = defineEmits<Emits>()

// 計算屬性
const effectiveHeight = computed(() => {
  return props.config?.chartOptions?.height || props.height
})

const effectiveWidth = computed(() => {
  return props.config?.chartOptions?.width || props.width
})

const mergedChartOptions = computed((): ReportChartOptions => {
  return {
    ...DEFAULT_CHART_OPTIONS,
    ...props.config?.chartOptions,
    ...props.chartOptions
  }
})

// Chart.js 支援的圖表類型
const chartJsTypes = ['bar', 'pie', 'doughnut', 'line', 'horizontalBar', 'stackedBar', 'scatter'] as const
const isChartJsType = computed(() => {
  return props.config?.chartType && chartJsTypes.includes(props.config.chartType as typeof chartJsTypes[number])
})

const chartJsType = computed((): ChartJSType => {
  if (!props.config?.chartType) return 'bar'
  
  // 映射自定義圖表類型到 Chart.js 類型
  const typeMapping: Record<ChartType, ChartJSType> = {
    'bar': 'bar',
    'pie': 'pie',
    'doughnut': 'doughnut',
    'line': 'line',
    'area': 'line',
    'horizontalBar': 'bar',
    'stackedBar': 'bar',
    'scatter': 'scatter'
  }
  
  return typeMapping[props.config.chartType] || 'bar'
})

const customChartComponent = computed(() => {
  // 為自訂圖表類型返回對應的元件
  if (props.config?.chartType === 'area') {
    return 'AreaChart' // 需要實作
  }
  return null
})

// Chart.js 資料格式轉換
const chartJsData = computed((): ChartConfiguration['data'] => {
  if (!props.reportData) {
    return { labels: [], datasets: [] }
  }
  
  const { datasets, labels } = props.reportData
  const _chartOptions = mergedChartOptions.value
  
  // 處理顏色
  const colors = getColors(datasets[0]?.data.length || 0)
  
  const transformedDatasets = datasets.map(dataset => {
    const baseDataset = {
      label: dataset.label,
      data: dataset.data.map(point => point.value),
      backgroundColor: dataset.backgroundColor || colors,
      borderColor: dataset.borderColor || colors.map(c => c + 'CC'),
      borderWidth: dataset.borderWidth || 1
    }
    
    // 特殊圖表類型處理
    if (props.config?.chartType === 'horizontalBar') {
      return {
        ...baseDataset,
        indexAxis: 'y' as const
      }
    }
    
    if (props.config?.chartType === 'stackedBar') {
      return {
        ...baseDataset,
        stack: 'stack1'
      }
    }
    
    if (props.config?.chartType === 'area') {
      return {
        ...baseDataset,
        fill: true,
        backgroundColor: colors[0] + '40', // 透明度
        borderColor: colors[0]
      }
    }
    
    return baseDataset
  })
  
  return {
    labels,
    datasets: transformedDatasets
  }
})

// Chart.js 選項配置
const chartJsOptions = computed((): ChartConfiguration['options'] => {
  const _options = mergedChartOptions.value
  
  const baseOptions: ChartConfiguration['options'] = {
    responsive: _options.responsive,
    maintainAspectRatio: _options.maintainAspectRatio,
    animation: {
      duration: _options.animationEnabled ? _options.animationDuration : 0
    },
    plugins: {
      legend: {
        display: _options.showLegend,
        position: 'bottom'
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y || context.parsed
            const formattedValue = formatValue(value)
            return `${context.dataset.label}: ${formattedValue}`
          }
        }
      }
    }
  }
  
  // 座標軸配置（僅適用於有座標軸的圖表）
  if (['bar', 'line', 'horizontalBar', 'stackedBar', 'scatter'].includes(props.config?.chartType || '')) {
    baseOptions.scales = {
      x: {
        display: _options.showGrid,
        title: {
          display: !!_options.xAxisLabel,
          text: _options.xAxisLabel
        },
        stacked: props.config?.chartType === 'stackedBar'
      },
      y: {
        display: _options.showGrid,
        beginAtZero: true,
        title: {
          display: !!_options.yAxisLabel,
          text: _options.yAxisLabel
        },
        stacked: props.config?.chartType === 'stackedBar'
      }
    }
    
    // 水平長條圖的座標軸交換
    if (props.config?.chartType === 'horizontalBar') {
      baseOptions.indexAxis = 'y'
    }
  }
  
  return baseOptions
})

// 顏色生成
function getColors(count: number): string[] {
  const options = mergedChartOptions.value
  
  if (options.customColors && options.customColors.length > 0) {
    const colors: string[] = []
    for (let i = 0; i < count; i++) {
      colors.push(options.customColors[i % options.customColors.length]!)
    }
    return colors
  }
  
  const scheme = options.colorScheme || 'default'
  const schemeColors = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.default
  
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(schemeColors[i % schemeColors.length]!)
  }
  return colors
}

// 數值格式化
function formatValue(value: number): string {
  if (props.config?.aggregation === 'percentage') {
    return `${value.toFixed(1)}%`
  }
  
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  
  return value.toFixed(2)
}

// 匯出處理
function handleExport(): void {
  // 簡單實作，可以擴展支援更多格式
  emit('export', 'png')
}

// 監聽配置變化重新渲染
watch(() => props.config, () => {
  // 圖表會自動重新渲染
}, { deep: true })
</script>

<style scoped lang="scss">
.custom-chart {
  position: relative;
  width: 100%;
  
  &.chart-loading {
    pointer-events: none;
  }
  
  .chart-title {
    margin-bottom: 1rem;
    text-align: center;
    
    .title-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.25rem;
    }
    
    .title-description {
      font-size: 0.875rem;
      color: #666;
    }
  }
  
  .chart-loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    z-index: 10;
    
    .loading-text {
      font-size: 0.875rem;
      color: #666;
    }
  }
  
  .chart-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    min-height: 200px;
    
    .error-text {
      font-size: 0.875rem;
      color: #666;
      text-align: center;
    }
  }
  
  .chart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    min-height: 200px;
    
    .empty-text {
      font-size: 1rem;
      font-weight: 500;
      color: #666;
    }
    
    .empty-subtitle {
      font-size: 0.875rem;
      color: #999;
      text-align: center;
    }
  }
  
  .chart-container {
    position: relative;
    
    .chart-summary {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      
      .summary-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        
        .summary-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: #333;
        }
      }
    }
    
    .chart-actions {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    &:hover .chart-actions {
      opacity: 1;
    }
  }
}

@media (max-width: 600px) {
  .custom-chart {
    .chart-title .title-text {
      font-size: 1.125rem;
    }
    
    .chart-container .chart-summary {
      flex-wrap: wrap;
      gap: 1rem;
      
      .summary-item {
        min-width: 80px;
      }
    }
  }
}
</style>