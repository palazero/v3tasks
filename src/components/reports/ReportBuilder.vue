<template>
  <div class="report-builder">
    <!-- 工具列 -->
    <div class="builder-toolbar">
      <div class="toolbar-left">
        <h3 class="page-title">
          <q-icon name="analytics" size="1.5rem" />
          報表建構器
        </h3>
        <q-separator vertical inset />
        <div class="toolbar-info">
          <span v-if="savedReports.length > 0" class="report-count">
            {{ savedReports.length }} 個自訂報表
          </span>
        </div>
      </div>
      
      <div class="toolbar-right">
        <q-btn
          color="primary"
          icon="add"
          @click="createNewReport"
          :loading="isCreating"
        >
          建立新報表
        </q-btn>
        
        <q-btn
          flat
          icon="dashboard"
          @click="showTemplates"
        >
          範本庫
        </q-btn>
        
        <q-btn
          flat
          icon="refresh"
          @click="loadSavedReports"
          :loading="isLoading"
        />
      </div>
    </div>
    
    <!-- 主要內容 -->
    <div class="builder-content">
      <!-- 載入狀態 -->
      <div v-if="isLoading" class="loading-state">
        <q-spinner-dots size="2rem" color="primary" />
        <div>載入報表資料中...</div>
      </div>
      
      <!-- 空狀態 -->
      <div v-else-if="savedReports.length === 0" class="empty-state">
        <div class="empty-illustration">
          <q-icon name="assessment" size="5rem" color="grey-5" />
        </div>
        <h4>尚未建立任何報表</h4>
        <p>建立您的第一個自訂報表來分析專案資料</p>
        
        <div class="empty-actions">
          <q-btn
            color="primary"
            size="lg"
            @click="createNewReport"
          >
            建立第一個報表
          </q-btn>
          <q-btn
            flat
            color="primary"
            @click="showTemplates"
          >
            瀏覽範本
          </q-btn>
        </div>
      </div>
      
      <!-- 報表列表 -->
      <div v-else class="reports-grid">
        <div class="grid-container">
          <div
            v-for="report in sortedReports"
            :key="report.id"
            class="report-card-wrapper"
          >
            <q-card 
              class="report-card"
              :class="{ 'card-selected': selectedReports.includes(report.id) }"
            >
              <!-- 卡片標題 -->
              <q-card-section class="card-header">
                <div class="header-content">
                  <div class="report-info">
                    <div class="report-title">{{ report.name }}</div>
                    <div v-if="report.description" class="report-description">
                      {{ report.description }}
                    </div>
                  </div>
                  
                  <div class="report-actions">
                    <q-btn
                      flat
                      round
                      dense
                      icon="more_vert"
                      @click.stop
                    >
                      <q-menu>
                        <q-list>
                          <q-item clickable @click="editReport(report)">
                            <q-item-section avatar>
                              <q-icon name="edit" />
                            </q-item-section>
                            <q-item-section>編輯</q-item-section>
                          </q-item>
                          <q-item clickable @click="handleDuplicateReport(report)">
                            <q-item-section avatar>
                              <q-icon name="content_copy" />
                            </q-item-section>
                            <q-item-section>複製</q-item-section>
                          </q-item>
                          <q-item clickable @click="exportReportConfig(report)">
                            <q-item-section avatar>
                              <q-icon name="download" />
                            </q-item-section>
                            <q-item-section>匯出設定</q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item clickable @click="handleDeleteReport(report)" class="text-negative">
                            <q-item-section avatar>
                              <q-icon name="delete" color="negative" />
                            </q-item-section>
                            <q-item-section>刪除</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </div>
                </div>
              </q-card-section>
              
              <!-- 報表預覽 -->
              <q-card-section class="card-preview">
                <div class="preview-container">
                  <ReportRenderer
                    :config="report"
                    :auto-load="true"
                    :show-header="false"
                    :show-filters="false"
                    :show-summary="false"
                    chart-height="200px"
                    @error="handlePreviewError"
                  />
                </div>
              </q-card-section>
              
              <!-- 卡片底部資訊 -->
              <q-card-section class="card-footer">
                <div class="footer-content">
                  <div class="report-meta">
                    <q-chip dense color="primary" text-color="white">
                      {{ getChartTypeLabel(report.chartType) }}
                    </q-chip>
                    <q-chip dense color="secondary" text-color="white">
                      {{ getDimensionLabel(report.dimension) }}
                    </q-chip>
                  </div>
                  
                  <div class="report-timestamp">
                    <q-icon name="schedule" size="1rem" />
                    <span>{{ formatDate(report.updatedAt) }}</span>
                  </div>
                </div>
              </q-card-section>
              
              <!-- 卡片操作按鈕 -->
              <q-card-actions class="card-actions">
                <q-btn
                  flat
                  color="primary"
                  @click="viewReport(report)"
                >
                  查看詳細
                </q-btn>
                <q-btn
                  flat
                  color="primary"
                  @click="editReport(report)"
                >
                  編輯
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 報表建構對話框 -->
    <CustomReportDialog
      v-model="showReportDialog"
      :config="editingReport"
      :project-id="currentProjectId"
      @save="handleSaveReport"
      @cancel="handleCancelEdit"
    />
    
    <!-- 範本庫對話框 -->
    <ReportTemplates
      v-model="showTemplateDialog"
      :project-id="currentProjectId"
      @select="handleSelectTemplate"
    />
    
    <!-- 報表詳細檢視對話框 -->
    <q-dialog v-model="showDetailDialog" maximized>
      <q-card class="report-detail-dialog">
        <q-card-section class="dialog-header">
          <div class="header-content">
            <h4>{{ viewingReport?.name }}</h4>
            <q-btn flat round dense icon="close" v-close-popup />
          </div>
        </q-card-section>
        
        <q-card-section class="dialog-content">
          <ReportRenderer
            v-if="viewingReport"
            :config="viewingReport"
            :auto-load="true"
            :show-header="true"
            :show-filters="true"
            :show-summary="true"
            :show-data-table="true"
            chart-height="500px"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    
    <!-- 批量操作工具列 -->
    <div v-if="selectedReports.length > 0" class="batch-toolbar">
      <div class="batch-info">
        已選擇 {{ selectedReports.length }} 個報表
      </div>
      
      <div class="batch-actions">
        <q-btn
          flat
          icon="content_copy"
          @click="batchDuplicate"
        >
          批量複製
        </q-btn>
        <q-btn
          flat
          icon="delete"
          color="negative"
          @click="batchDelete"
        >
          批量刪除
        </q-btn>
        <q-btn
          flat
          icon="close"
          @click="clearSelection"
        >
          取消選擇
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import CustomReportDialog from './CustomReportDialog.vue'
import ReportTemplates from './ReportTemplates.vue'
import ReportRenderer from './ReportRenderer.vue'
import { 
  DIMENSION_OPTIONS, 
  CHART_TYPE_OPTIONS,
  type ReportConfig,
  type CreateReportRequest
} from '@/types/report'
import { useReportManager } from '@/composables/useReportManager'

interface Props {
  projectId?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'report-created', report: ReportConfig): void
  (e: 'report-updated', report: ReportConfig): void
  (e: 'report-deleted', reportId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  projectId: 'all'
})

const emit = defineEmits<Emits>()

const $q = useQuasar()

// 計算屬性
const currentProjectId = computed(() => props.projectId)

// 使用報表管理器
const {
  reports: savedReports,
  loading: isLoading,
  hasReports,
  reportCount,
  createReport,
  updateReport,
  deleteReport: deleteReportService,
  duplicateReport,
  loadReports,
  getReportById
} = useReportManager({
  projectId: currentProjectId.value,
  autoLoad: true
})

// 其他響應式狀態
const isCreating = ref(false)
const selectedReports = ref<string[]>([])
const editingReport = ref<ReportConfig>()
const viewingReport = ref<ReportConfig>()

// 對話框狀態
const showReportDialog = ref(false)
const showTemplateDialog = ref(false)
const showDetailDialog = ref(false)

const sortedReports = computed(() => {
  return [...savedReports.value].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
})

// 方法
async function loadSavedReports(): Promise<void> {
  try {
    await loadReports()
  } catch (error) {
    console.error('載入報表失敗:', error)
    $q.notify({
      type: 'negative',
      message: '載入報表失敗'
    })
  }
}

function createNewReport(): void {
  editingReport.value = undefined
  showReportDialog.value = true
}

function editReport(report: ReportConfig): void {
  editingReport.value = { ...report }
  showReportDialog.value = true
}

async function handleDuplicateReport(report: ReportConfig): Promise<void> {
  try {
    const duplicated = await duplicateReport(report.id, `${report.name} (副本)`)
    emit('report-created', duplicated)
  } catch (error) {
    console.error('複製報表失敗:', error)
    $q.notify({
      type: 'negative', 
      message: '複製報表失敗'
    })
  }
}

function viewReport(report: ReportConfig): void {
  viewingReport.value = report
  showDetailDialog.value = true
}

function handleDeleteReport(report: ReportConfig): void {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除報表「${report.name}」嗎？此操作無法撤銷。`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteReportService(report.id)
      emit('report-deleted', report.id)
    } catch (error) {
      console.error('刪除報表失敗:', error)
      $q.notify({
        type: 'negative',
        message: '刪除報表失敗'
      })
    }
  })
}

function exportReportConfig(report: ReportConfig): void {
  const configStr = JSON.stringify(report, null, 2)
  const blob = new Blob([configStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.name}-config.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
  
  $q.notify({
    type: 'positive',
    message: '報表設定已匯出'
  })
}

function showTemplates(): void {
  showTemplateDialog.value = true
}

async function handleSaveReport(config: ReportConfig): Promise<void> {
  try {
    let finalReport: ReportConfig
    
    if (config.id && await getReportById(config.id)) {
      // 更新現有報表
      const updates = {
        name: config.name,
        description: config.description,
        chartType: config.chartType,
        dimension: config.dimension,
        aggregation: config.aggregation,
        customFieldId: config.customFieldId,
        customFieldType: config.customFieldType,
        filters: config.filters,
        chartOptions: config.chartOptions,
        isTemplate: config.isTemplate,
        isPublic: config.isPublic,
        order: config.order,
        isActive: config.isActive
      }
      
      finalReport = await updateReport(config.id, updates)
      emit('report-updated', finalReport)
    } else {
      // 新增報表
      const createRequest: CreateReportRequest = {
        name: config.name,
        description: config.description,
        chartType: config.chartType,
        dimension: config.dimension,
        aggregation: config.aggregation,
        customFieldId: config.customFieldId,
        customFieldType: config.customFieldType,
        filters: config.filters,
        chartOptions: config.chartOptions,
        createdBy: 'current-user', // 實際應用中應該使用當前用戶 ID
        isTemplate: config.isTemplate || false,
        isPublic: config.isPublic || false,
        projectId: config.projectId || currentProjectId.value,
        order: config.order || 0,
        isActive: config.isActive !== false
      }
      
      finalReport = await createReport(createRequest)
      emit('report-created', finalReport)
    }
    
  } catch (error) {
    console.error('儲存報表失敗:', error)
    throw error
  }
}

function handleCancelEdit(): void {
  editingReport.value = undefined
}

async function handleSelectTemplate(template: { name: string; config: Partial<ReportConfig>; description: string }): Promise<void> {
  try {
    // 從範本建立報表
    const createRequest: CreateReportRequest = {
      name: template.name,
      description: template.description,
      chartType: template.config.chartType || 'bar',
      dimension: template.config.dimension || 'statusId',
      aggregation: template.config.aggregation || 'count',
      customFieldId: template.config.customFieldId,
      customFieldType: template.config.customFieldType,
      filters: template.config.filters,
      chartOptions: template.config.chartOptions,
      createdBy: 'current-user', // 實際應用中應該使用當前用戶 ID
      isTemplate: false,
      isPublic: false,
      projectId: currentProjectId.value,
      order: savedReports.value.length,
      isActive: true
    }
    
    const newReport = await createReport(createRequest)
    emit('report-created', newReport)
    
    $q.notify({
      type: 'positive',
      message: `已從範本建立報表: ${template.name}`
    })
  } catch (error) {
    console.error('從範本建立報表失敗:', error)
    $q.notify({
      type: 'negative',
      message: '從範本建立報表失敗'
    })
  }
}

function handlePreviewError(error: string): void {
  console.warn('報表預覽錯誤:', error)
}

async function batchDuplicate(): Promise<void> {
  try {
    const selectedConfigs = savedReports.value.filter(r => selectedReports.value.includes(r.id))
    
    const promises = selectedConfigs.map(report => 
      duplicateReport(report.id, `${report.name} (副本)`)
    )
    
    await Promise.all(promises)
    clearSelection()
    
    $q.notify({
      type: 'positive',
      message: `已複製 ${selectedConfigs.length} 個報表`
    })
  } catch (error) {
    console.error('批量複製失敗:', error)
    $q.notify({
      type: 'negative',
      message: '批量複製失敗'
    })
  }
}

function batchDelete(): void {
  $q.dialog({
    title: '確認批量刪除',
    message: `確定要刪除選中的 ${selectedReports.value.length} 個報表嗎？此操作無法撤銷。`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const promises = selectedReports.value.map(reportId => deleteReportService(reportId))
      await Promise.all(promises)
      
      clearSelection()
      
      $q.notify({
        type: 'positive',
        message: '選中的報表已刪除'
      })
    } catch (error) {
      console.error('批量刪除失敗:', error)
      $q.notify({
        type: 'negative',
        message: '批量刪除失敗'
      })
    }
  })
}

function clearSelection(): void {
  selectedReports.value = []
}

// 工具函數
function getChartTypeLabel(chartType: string): string {
  const option = CHART_TYPE_OPTIONS.find(opt => opt.value === chartType)
  return option?.label || chartType
}

function getDimensionLabel(dimension: string): string {
  const option = DIMENSION_OPTIONS.find(opt => opt.value === dimension)
  return option?.label || dimension
}

function formatDate(date: string | number | Date): string {
  const dateObj = new Date(date)
  
  // 檢查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '無效日期'
  }
  
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

// 生命週期 - 使用 ReportManager 自動載入，無需手動調用
</script>

<style scoped lang="scss">
.report-builder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .builder-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: white;
    border-bottom: 1px solid #e1e5e9;
    
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      .page-title {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.25rem;
        color: #333;
      }
      
      .toolbar-info {
        color: #666;
        font-size: 0.875rem;
      }
    }
    
    .toolbar-right {
      display: flex;
      gap: 0.5rem;
    }
  }
  
  .builder-content {
    flex: 1;
    overflow-y: auto;
    background: #f8f9fa;
    
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      gap: 1rem;
      color: #666;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      
      .empty-illustration {
        margin-bottom: 1.5rem;
      }
      
      h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        color: #333;
      }
      
      p {
        margin: 0 0 2rem 0;
        color: #666;
        max-width: 400px;
        line-height: 1.5;
      }
      
      .empty-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
      }
    }
    
    .reports-grid {
      padding: 1.5rem;
      
      .grid-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      
      .report-card {
        transition: all 0.2s ease;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        &.card-selected {
          border: 2px solid #1976d2;
          background: #e3f2fd;
        }
        
        .card-header {
          padding: 0.75rem 0.75rem 0.25rem 0.75rem;
          
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            
            .report-info {
              flex: 1;
              
              .report-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 0.25rem;
              }
              
              .report-description {
                font-size: 0.875rem;
                color: #666;
                line-height: 1.4;
              }
            }
          }
        }
        
        .card-preview {
          padding: 0.5rem 0.75rem;
          
          .preview-container {
            min-height: 160px;
            background: white;
            border-radius: 4px;
            overflow: hidden;
          }
        }
        
        .card-footer {
          padding: 0.5rem 0.75rem;
          
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            
            .report-meta {
              display: flex;
              gap: 0.5rem;
            }
            
            .report-timestamp {
              display: flex;
              align-items: center;
              gap: 0.25rem;
              font-size: 0.75rem;
              color: #666;
            }
          }
        }
        
        .card-actions {
          padding: 0 0.75rem 0.75rem 0.75rem;
          justify-content: flex-end;
        }
      }
    }
  }
  
  .batch-toolbar {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 1rem 2rem;
    border-radius: 25px;
    display: flex;
    align-items: center;
    gap: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    
    .batch-info {
      font-weight: 500;
    }
    
    .batch-actions {
      display: flex;
      gap: 0.5rem;
    }
  }
  
  .report-detail-dialog {
    height: 100vh;
    
    .dialog-header {
      background: #1976d2;
      color: white;
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        h4 {
          margin: 0;
          font-size: 1.25rem;
        }
      }
    }
    
    .dialog-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}

// 動畫效果
.report-card-enter-active,
.report-card-leave-active {
  transition: all 0.3s ease;
}

.report-card-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.report-card-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@media (max-width: 768px) {
  .report-builder {
    .builder-toolbar {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
      
      .toolbar-right {
        justify-content: center;
      }
    }
    
    .builder-content .reports-grid .grid-container {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .batch-toolbar {
      bottom: 1rem;
      left: 1rem;
      right: 1rem;
      transform: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      flex-direction: column;
      gap: 0.75rem;
      
      .batch-actions {
        justify-content: center;
      }
    }
  }
}
</style>