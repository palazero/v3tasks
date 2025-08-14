<template>
  <div class="report-renderer">
    <!-- 報表標題區 -->
    <div v-if="showHeader" class="report-header">
      <div class="header-content">
        <div class="report-info">
          <h3 class="report-title">{{ config?.name || '未命名報表' }}</h3>
          <p v-if="config?.description" class="report-description">
            {{ config.description }}
          </p>
          <div class="report-meta">
            <span v-if="reportData" class="data-count">
              共 {{ reportData.totalCount }} 筆資料
            </span>
            <span v-if="reportData" class="generated-time">
              更新於 {{ formatDateTime(reportData.generatedAt) }}
            </span>
          </div>
        </div>
        
        <div class="report-actions">
          <q-btn
            flat
            round
            icon="refresh"
            @click="handleRefresh"
            :loading="isLoading"
            :disable="isLoading"
          >
            <q-tooltip>刷新資料</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="download"
            @click="handleExport"
            :disable="isLoading || !reportData"
          >
            <q-tooltip>匯出報表</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="settings"
            @click="handleConfigure"
            :disable="isLoading"
          >
            <q-tooltip>設定報表</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
    
    <!-- 篩選器區域 -->
    <div v-if="showFilters && config?.filters && config.filters.length > 0" class="report-filters">
      <div class="filters-header">
        <q-icon name="filter_list" size="1.2rem" />
        <span>篩選條件</span>
      </div>
      <div class="filters-content">
        <div 
          v-for="(filter, index) in config.filters" 
          :key="index"
          class="filter-chip"
        >
          <q-chip 
            removable
            color="primary"
            text-color="white"
            @remove="handleRemoveFilter(index)"
          >
            {{ formatFilterChip(filter) }}
          </q-chip>
        </div>
      </div>
    </div>
    
    <!-- 主要圖表區域 -->
    <div class="report-content" :class="{ 'content-loading': isLoading }">
      <!-- 載入狀態 -->
      <div v-if="isLoading" class="loading-overlay">
        <q-spinner-dots size="3rem" color="primary" />
        <div class="loading-text">正在生成報表資料...</div>
      </div>
      
      <!-- 錯誤狀態 -->
      <div v-else-if="error" class="error-state">
        <q-icon name="error_outline" size="4rem" color="negative" />
        <h4>報表生成失敗</h4>
        <p class="error-message">{{ error }}</p>
        <q-btn 
          color="primary"
          @click="handleRefresh"
          :loading="isLoading"
        >
          重新載入
        </q-btn>
      </div>
      
      <!-- 空資料狀態 -->
      <div v-else-if="!reportData || reportData.totalCount === 0" class="empty-state">
        <q-icon name="assessment" size="4rem" color="grey-5" />
        <h4>無資料可顯示</h4>
        <p>請調整篩選條件或檢查資料來源</p>
        <q-btn 
          flat
          color="primary"
          @click="handleConfigure"
        >
          調整設定
        </q-btn>
      </div>
      
      <!-- 圖表顯示 -->
      <div v-else class="chart-wrapper">
        <CustomChart
          :config="config"
          :report-data="reportData"
          :is-loading="isLoading"
          :error="error"
          :show-title="false"
          :show-summary="showSummary"
          :show-actions="false"
          :height="chartHeight"
          :width="chartWidth"
          @retry="handleRefresh"
          @refresh="handleRefresh"
          @configure="handleConfigure"
          @export="handleChartExport"
        />
      </div>
      
      <!-- 資料表格（可選） -->
      <div v-if="showDataTable && reportData" class="data-table-section">
        <div class="table-header">
          <h4>詳細資料</h4>
          <q-btn
            flat
            dense
            :icon="isTableExpanded ? 'expand_less' : 'expand_more'"
            @click="isTableExpanded = !isTableExpanded"
          >
            {{ isTableExpanded ? '收合' : '展開' }}
          </q-btn>
        </div>
        
        <q-slide-transition>
          <div v-show="isTableExpanded" class="table-content">
            <q-table
              :rows="tableRows"
              :columns="tableColumns"
              row-key="label"
              flat
              dense
              :pagination="{ rowsPerPage: 10 }"
            >
              <template #body-cell-value="props">
                <q-td :props="props">
                  <div class="value-cell">
                    <span class="value-text">{{ formatValue(props.value) }}</span>
                    <div 
                      class="value-bar"
                      :style="{ 
                        width: `${(props.value / maxValue) * 100}%`,
                        backgroundColor: getColorForRow(props.rowIndex)
                      }"
                    />
                  </div>
                </q-td>
              </template>
            </q-table>
          </div>
        </q-slide-transition>
      </div>
    </div>
    
    <!-- 匯出對話框 -->
    <q-dialog v-model="showExportDialog" position="bottom">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">匯出報表</div>
        </q-card-section>
        
        <q-card-section>
          <q-list>
            <q-item clickable v-close-popup @click="exportReport('png')">
              <q-item-section avatar>
                <q-icon name="image" />
              </q-item-section>
              <q-item-section>
                <q-item-label>PNG 圖片</q-item-label>
                <q-item-label caption>匯出為 PNG 圖片檔案</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item clickable v-close-popup @click="exportReport('pdf')">
              <q-item-section avatar>
                <q-icon name="picture_as_pdf" />
              </q-item-section>
              <q-item-section>
                <q-item-label>PDF 文件</q-item-label>
                <q-item-label caption>匯出為 PDF 文件</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item clickable v-close-popup @click="exportReport('excel')">
              <q-item-section avatar>
                <q-icon name="table_view" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Excel 檔案</q-item-label>
                <q-item-label caption>匯出資料為 Excel 檔案</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item clickable v-close-popup @click="exportReport('json')">
              <q-item-section avatar>
                <q-icon name="code" />
              </q-item-section>
              <q-item-section>
                <q-item-label>JSON 資料</q-item-label>
                <q-item-label caption>匯出原始 JSON 資料</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, readonly } from 'vue'
import { useQuasar } from 'quasar'
import CustomChart from '@/components/ui/charts/CustomChart.vue'
import { statisticsService } from '@/services/domain/statistics.service'
import type { 
  ReportConfig, 
  ReportData, 
  ReportFilter
} from '@/types/report'
import type { QTableColumn } from 'quasar'

interface Props {
  config?: ReportConfig
  autoLoad?: boolean
  showHeader?: boolean
  showFilters?: boolean
  showSummary?: boolean
  showDataTable?: boolean
  chartHeight?: string
  chartWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true,
  showHeader: true,
  showFilters: true,
  showSummary: true,
  showDataTable: false,
  chartHeight: '400px',
  chartWidth: '100%'
})

interface Emits {
  refresh: []
  configure: []
  export: [format: string, data: ReportData]
  filterRemoved: [index: number]
  error: [error: string]
}

const emit = defineEmits<Emits>()

const $q = useQuasar()

// 響應式狀態
const isLoading = ref(false)
const error = ref<string>('')
const reportData = ref<ReportData>()
const isTableExpanded = ref(false)
const showExportDialog = ref(false)

// 計算屬性
const tableRows = computed(() => {
  if (!reportData.value) return []
  
  return reportData.value.datasets[0]?.data.map((point, index) => ({
    label: point.label,
    value: point.value,
    index
  })) || []
})

const tableColumns = computed((): QTableColumn[] => [
  {
    name: 'label',
    label: '項目',
    field: 'label',
    align: 'left'
  },
  {
    name: 'value',
    label: getValueColumnLabel(),
    field: 'value',
    align: 'right',
    sortable: true,
    sort: (a, b) => b - a
  }
])

const maxValue = computed(() => {
  if (!reportData.value) return 1
  
  const values = reportData.value.datasets[0]?.data.map(point => point.value) || []
  return Math.max(...values) || 1
})

// 方法
async function loadReportData(): Promise<void> {
  if (!props.config) {
    error.value = '缺少報表配置'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    reportData.value = await statisticsService.generateReportData(props.config)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '載入報表資料失敗'
    error.value = errorMessage
    emit('error', errorMessage)
    
    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top'
    })
  } finally {
    isLoading.value = false
  }
}

function handleRefresh(): void {
  emit('refresh')
  void loadReportData()
}

function handleConfigure(): void {
  emit('configure')
}

function handleExport(): void {
  showExportDialog.value = true
}

function handleChartExport(format: string): void {
  if (reportData.value) {
    emit('export', format, reportData.value)
    exportReport(format)
  }
}

function handleRemoveFilter(index: number): void {
  emit('filterRemoved', index)
}

function exportReport(format: string): void {
  if (!reportData.value) return
  
  // 簡化的匯出邏輯，實際應用中可以更詳細實作
  switch (format) {
    case 'json':
      downloadJSON()
      break
    case 'excel':
      // 實際實作需要使用 xlsx 等程式庫
      $q.notify({
        type: 'info',
        message: 'Excel 匯出功能開發中...'
      })
      break
    case 'pdf':
      // 實際實作需要使用 jsPDF 等程式庫
      $q.notify({
        type: 'info',
        message: 'PDF 匯出功能開發中...'
      })
      break
    case 'png':
    default:
      // 實際實作需要將 canvas 轉換為圖片
      $q.notify({
        type: 'info',
        message: '圖片匯出功能開發中...'
      })
      break
  }
  
  if (reportData.value) {
    emit('export', format, reportData.value)
  }
}

function downloadJSON(): void {
  if (!reportData.value) return
  
  const dataStr = JSON.stringify(reportData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.config?.name || '報表資料'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
  
  $q.notify({
    type: 'positive',
    message: '資料已匯出為 JSON 檔案'
  })
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatFilterChip(filter: ReportFilter): string {
  // 簡化的篩選器顯示格式
  return `${filter.field} ${filter.operator} ${String(filter.value)}`
}

function formatValue(value: number): string {
  if (props.config?.aggregation === 'percentage') {
    return `${value.toFixed(1)}%`
  }
  
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  
  return value.toFixed(2)
}

function getValueColumnLabel(): string {
  if (!props.config) return '數值'
  
  const labels: Record<string, string> = {
    'count': '數量',
    'sum': '總計',
    'average': '平均值',
    'percentage': '百分比',
    'min': '最小值',
    'max': '最大值'
  }
  
  return labels[props.config.aggregation] || '數值'
}

function getColorForRow(index: number): string {
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', 
    '#0097a7', '#689f38', '#f9a825', '#c2185b', '#303f9f'
  ]
  
  return colors[index % colors.length] + '40' // 添加透明度
}

// 監聽配置變化
watch(() => props.config, () => {
  if (props.config && props.autoLoad) {
    void loadReportData()
  }
}, { immediate: true, deep: true })

// 組件掛載時載入資料
onMounted(() => {
  if (props.config && props.autoLoad) {
    void loadReportData()
  }
})

// 暴露方法供父組件使用
defineExpose({
  loadReportData,
  reportData: readonly(reportData),
  isLoading: readonly(isLoading),
  error: readonly(error)
})
</script>

<style scoped lang="scss">
.report-renderer {
  width: 100%;
  
  .report-header {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      
      .report-info {
        flex: 1;
        
        .report-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
        }
        
        .report-description {
          margin: 0 0 0.75rem 0;
          color: #666;
          line-height: 1.5;
        }
        
        .report-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #888;
          
          .data-count,
          .generated-time {
            &::before {
              content: '•';
              margin-right: 0.5rem;
            }
            
            &:first-child::before {
              display: none;
            }
          }
        }
      }
      
      .report-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
  }
  
  .report-filters {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #fff;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    
    .filters-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #666;
    }
    
    .filters-content {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
  
  .report-content {
    position: relative;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e1e5e9;
    
    &.content-loading {
      pointer-events: none;
    }
    
    .loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      z-index: 10;
      
      .loading-text {
        font-size: 0.875rem;
        color: #666;
      }
    }
    
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem 2rem;
      text-align: center;
      
      h4 {
        margin: 0;
        font-size: 1.25rem;
        color: #666;
      }
      
      p {
        margin: 0;
        color: #888;
        max-width: 400px;
        line-height: 1.5;
      }
    }
    
    .chart-wrapper {
      padding: 1rem;
    }
    
    .data-table-section {
      border-top: 1px solid #e1e5e9;
      
      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1rem 0 1rem;
        
        h4 {
          margin: 0;
          font-size: 1.125rem;
          color: #333;
        }
      }
      
      .table-content {
        padding: 0 1rem 1rem 1rem;
        
        .value-cell {
          position: relative;
          
          .value-text {
            position: relative;
            z-index: 2;
            font-weight: 500;
          }
          
          .value-bar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            min-width: 2px;
            opacity: 0.2;
            border-radius: 2px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .report-renderer {
    .report-header .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
      
      .report-actions {
        justify-content: center;
      }
    }
    
    .report-filters .filters-content {
      justify-content: center;
    }
  }
}
</style>