<template>
  <q-dialog 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="custom-report-dialog">
      <!-- 對話框標題 -->
      <q-card-section class="dialog-header">
        <div class="header-content">
          <div class="header-title">
            <q-icon name="analytics" size="1.5rem" color="primary" />
            <h4>{{ isEditMode ? '編輯報表' : '建立自訂報表' }}</h4>
          </div>
          <q-btn 
            flat 
            round 
            dense 
            icon="close" 
            @click="handleClose"
          />
        </div>
        
        <!-- 步驟指示器 -->
        <div class="step-indicator">
          <q-stepper 
            v-model="currentStep" 
            color="white" 
            flat
            header-nav
            class="transparent-stepper"
          >
            <q-step 
              :name="1" 
              title="資料來源"
              icon="database"
              :done="currentStep > 1"
              header-class="step-header"
            />
            <q-step 
              :name="2" 
              title="統計維度"
              icon="category"
              :done="currentStep > 2"
              header-class="step-header"
            />
            <q-step 
              :name="3" 
              title="聚合方式"
              icon="functions"
              :done="currentStep > 3"
              header-class="step-header"
            />
            <q-step 
              :name="4" 
              title="圖表類型"
              icon="bar_chart"
              :done="currentStep > 4"
              header-class="step-header"
            />
            <q-step 
              :name="5" 
              title="樣式設定"
              icon="palette"
              :done="currentStep > 5"
              header-class="step-header"
            />
            <q-step 
              :name="6" 
              title="預覽確認"
              icon="preview"
              header-class="step-header"
            />
          </q-stepper>
        </div>
      </q-card-section>
      
      <!-- 主要內容區 -->
      <q-card-section class="dialog-content">
        <div class="content-layout">
          <!-- 左側配置面板 -->
          <div class="config-panel">
            <q-stepper-navigation class="step-navigation">
              <!-- 步驟 1: 資料來源 -->
              <div v-show="currentStep === 1" class="step-content">
                <div class="step-title">
                  <q-icon name="database" />
                  <h5>選擇資料來源</h5>
                </div>
                
                <q-form @submit.prevent="nextStep">
                  <div class="form-section">
                    <q-input
                      v-model="reportConfig.name"
                      label="報表名稱 *"
                      outlined
                      dense
                      :rules="[val => !!val || '請輸入報表名稱']"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-input
                      v-model="reportConfig.description"
                      label="報表描述"
                      outlined
                      dense
                      type="textarea"
                      rows="2"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-select
                      v-model="reportConfig.projectId"
                      :options="projectOptions"
                      label="專案範圍"
                      outlined
                      dense
                      emit-value
                      map-options
                    />
                  </div>
                </q-form>
              </div>
              
              <!-- 步驟 2: 統計維度 -->
              <div v-show="currentStep === 2" class="step-content">
                <div class="step-title">
                  <q-icon name="category" />
                  <h5>選擇統計維度</h5>
                </div>
                
                <div class="dimension-grid">
                  <q-card
                    v-for="option in dimensionOptions"
                    :key="option.value"
                    class="dimension-card"
                    :class="{ 'selected': reportConfig.dimension === option.value }"
                    clickable
                    @click="selectDimension(option.value)"
                  >
                    <q-card-section class="text-center">
                      <q-icon :name="option.icon" size="2rem" />
                      <div class="dimension-label">{{ option.label }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                
                <!-- 自訂欄位選擇 -->
                <div v-if="reportConfig.dimension === 'customField'" class="custom-field-section">
                  <q-select
                    v-model="reportConfig.customFieldId"
                    :options="customFieldOptions"
                    label="選擇自訂欄位"
                    outlined
                    dense
                    emit-value
                    map-options
                    :loading="isLoadingFields"
                  />
                </div>
              </div>
              
              <!-- 步驟 3: 聚合方式 -->
              <div v-show="currentStep === 3" class="step-content">
                <div class="step-title">
                  <q-icon name="functions" />
                  <h5>選擇聚合方式</h5>
                </div>
                
                <div class="aggregation-list">
                  <q-card
                    v-for="option in filteredAggregationOptions"
                    :key="option.value"
                    class="aggregation-card"
                    :class="{ 'selected': reportConfig.aggregation === option.value }"
                    clickable
                    @click="reportConfig.aggregation = option.value"
                  >
                    <q-card-section>
                      <div class="aggregation-title">{{ option.label }}</div>
                      <div class="aggregation-description">{{ option.description }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
              
              <!-- 步驟 4: 圖表類型 -->
              <div v-show="currentStep === 4" class="step-content">
                <div class="step-title">
                  <q-icon name="bar_chart" />
                  <h5>選擇圖表類型</h5>
                </div>
                
                <div class="chart-type-grid">
                  <q-card
                    v-for="option in chartTypeOptions"
                    :key="option.value"
                    class="chart-type-card"
                    :class="{ 'selected': reportConfig.chartType === option.value }"
                    clickable
                    @click="reportConfig.chartType = option.value"
                  >
                    <q-card-section class="text-center">
                      <q-icon :name="option.icon" size="2rem" />
                      <div class="chart-type-title">{{ option.label }}</div>
                      <div class="chart-type-description">{{ option.description }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
              
              <!-- 步驟 5: 樣式設定 -->
              <div v-show="currentStep === 5" class="step-content">
                <div class="step-title">
                  <q-icon name="palette" />
                  <h5>樣式設定</h5>
                </div>
                
                <div class="style-form">
                  <div class="form-section">
                    <q-select
                      v-model="reportConfig.chartOptions.colorScheme"
                      :options="colorSchemeOptions"
                      label="顏色方案"
                      outlined
                      dense
                      emit-value
                      map-options
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-input
                      v-model="reportConfig.chartOptions.height"
                      label="圖表高度"
                      outlined
                      dense
                      suffix="px"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-toggle
                      v-model="reportConfig.chartOptions.showTitle"
                      label="顯示標題"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-toggle
                      v-model="reportConfig.chartOptions.showLegend"
                      label="顯示圖例"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-toggle
                      v-model="reportConfig.chartOptions.showLabels"
                      label="顯示標籤"
                    />
                  </div>
                  
                  <div class="form-section">
                    <q-toggle
                      v-model="reportConfig.chartOptions.animationEnabled"
                      label="啟用動畫"
                    />
                  </div>
                </div>
              </div>
              
              <!-- 步驟 6: 預覽確認 -->
              <div v-show="currentStep === 6" class="step-content">
                <div class="step-title">
                  <q-icon name="preview" />
                  <h5>預覽與確認</h5>
                </div>
                
                <div class="preview-summary">
                  <div class="summary-item">
                    <strong>報表名稱：</strong>{{ reportConfig.name }}
                  </div>
                  <div v-if="reportConfig.description" class="summary-item">
                    <strong>描述：</strong>{{ reportConfig.description }}
                  </div>
                  <div class="summary-item">
                    <strong>統計維度：</strong>{{ getDimensionLabel(reportConfig.dimension) }}
                  </div>
                  <div class="summary-item">
                    <strong>聚合方式：</strong>{{ getAggregationLabel(reportConfig.aggregation) }}
                  </div>
                  <div class="summary-item">
                    <strong>圖表類型：</strong>{{ getChartTypeLabel(reportConfig.chartType) }}
                  </div>
                </div>
              </div>
            </q-stepper-navigation>
          </div>
          
          <!-- 右側預覽面板 -->
          <div class="preview-panel">
            <div class="preview-header">
              <h6>即時預覽</h6>
              <q-btn
                flat
                dense
                round
                icon="refresh"
                @click="generatePreview"
                :loading="isPreviewLoading"
              />
            </div>
            
            <div class="preview-content">
              <ReportRenderer
                :config="previewConfig"
                :auto-load="false"
                :show-header="false"
                :show-filters="false"
                chart-height="300px"
              />
            </div>
          </div>
        </div>
      </q-card-section>
      
      <!-- 對話框操作按鈕 -->
      <q-card-actions class="dialog-actions">
        <div class="actions-left">
          <q-btn
            v-if="currentStep > 1"
            flat
            color="grey-7"
            @click="previousStep"
          >
            上一步
          </q-btn>
        </div>
        
        <div class="actions-right">
          <q-btn
            flat
            color="grey-7"
            @click="handleClose"
          >
            取消
          </q-btn>
          
          <q-btn
            v-if="currentStep < 6"
            color="primary"
            @click="nextStep"
            :disable="!canProceed"
          >
            下一步
          </q-btn>
          
          <q-btn
            v-else
            color="primary"
            @click="handleSave"
            :loading="isSaving"
          >
            {{ isEditMode ? '更新報表' : '建立報表' }}
          </q-btn>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import ReportRenderer from './ReportRenderer.vue'
import { statisticsService } from '@/services/domain/statistics.service'
import { 
  DIMENSION_OPTIONS, 
  AGGREGATION_OPTIONS, 
  CHART_TYPE_OPTIONS,
  COLOR_SCHEMES,
  DEFAULT_CHART_OPTIONS
} from '@/types/report'
import type { 
  ReportConfig, 
  ReportDimension,
  ReportAggregation,
  ChartType
} from '@/types/report'
import { nanoid } from 'nanoid'

interface Props {
  modelValue: boolean
  config?: ReportConfig
  projectId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

interface Emits {
  'update:modelValue': [value: boolean]
  'save': [config: ReportConfig]
  'cancel': []
}

const emit = defineEmits<Emits>()

const $q = useQuasar()

// 響應式狀態
const currentStep = ref(1)
const isPreviewLoading = ref(false)
const isSaving = ref(false)
const isLoadingFields = ref(false)

const reportConfig = ref<Partial<ReportConfig>>({
  name: '',
  description: '',
  projectId: props.projectId || 'all',
  dimension: 'assigneeId',
  aggregation: 'count',
  chartType: 'bar',
  chartOptions: { ...DEFAULT_CHART_OPTIONS }
})

// 計算屬性
const isEditMode = computed(() => !!props.config)

const previewConfig = computed((): ReportConfig | undefined => {
  if (!reportConfig.value.name || !reportConfig.value.dimension || 
      !reportConfig.value.aggregation || !reportConfig.value.chartType) {
    return undefined
  }
  
  return {
    id: props.config?.id || nanoid(),
    name: reportConfig.value.name,
    description: reportConfig.value.description,
    chartType: reportConfig.value.chartType,
    dimension: reportConfig.value.dimension,
    aggregation: reportConfig.value.aggregation,
    customFieldId: reportConfig.value.customFieldId,
    chartOptions: reportConfig.value.chartOptions,
    projectId: reportConfig.value.projectId,
    createdBy: 'current-user', // 實際應該從用戶狀態獲取
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: false,
    isPublic: false,
    order: 0,
    isActive: true
  } as ReportConfig
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return !!reportConfig.value.name
    case 2:
      return !!reportConfig.value.dimension && 
        (reportConfig.value.dimension !== 'customField' || !!reportConfig.value.customFieldId)
    case 3:
      return !!reportConfig.value.aggregation
    case 4:
      return !!reportConfig.value.chartType
    case 5:
      return true
    case 6:
      return true
    default:
      return false
  }
})

const projectOptions = ref([
  { label: '所有專案', value: 'all' },
  // 實際應該從專案服務載入
])

const customFieldOptions = ref([
  // 實際應該從自訂欄位服務載入
])

const dimensionOptions = computed(() => DIMENSION_OPTIONS)

const filteredAggregationOptions = computed(() => {
  // 根據選擇的維度和自訂欄位類型篩選聚合選項
  const baseOptions = [...AGGREGATION_OPTIONS]
  
  if (reportConfig.value.dimension !== 'customField' || !reportConfig.value.customFieldId) {
    // 沒有自訂欄位時，只能使用計數和百分比
    return baseOptions.filter(opt => ['count', 'percentage'].includes(opt.value))
  }
  
  return baseOptions
})

const chartTypeOptions = computed(() => CHART_TYPE_OPTIONS)

const colorSchemeOptions = computed(() => 
  Object.keys(COLOR_SCHEMES).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key
  }))
)

// 方法
function nextStep(): void {
  if (canProceed.value && currentStep.value < 6) {
    currentStep.value++
    if (currentStep.value >= 3) {
      generatePreview()
    }
  }
}

function previousStep(): void {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function selectDimension(dimension: ReportDimension): void {
  reportConfig.value.dimension = dimension
  
  // 載入自訂欄位
  if (dimension === 'customField') {
    void loadCustomFields()
  }
}

async function loadCustomFields(): Promise<void> {
  isLoadingFields.value = true
  try {
    const fields = await statisticsService.getAvailableCustomFields(reportConfig.value.projectId)
    customFieldOptions.value = fields.map(field => ({
      label: field.name,
      value: field.fieldId
    }))
  } catch (error) {
    console.error('載入自訂欄位失敗:', error)
    $q.notify({
      type: 'negative',
      message: '載入自訂欄位失敗'
    })
  } finally {
    isLoadingFields.value = false
  }
}

function generatePreview(): void {
  if (!previewConfig.value) return
  
  isPreviewLoading.value = true
  // 預覽邏輯會由 ReportRenderer 處理
  setTimeout(() => {
    isPreviewLoading.value = false
  }, 1000)
}

function handleSave(): void {
  if (!previewConfig.value) return
  
  isSaving.value = true
  
  setTimeout(() => {
    emit('save', previewConfig.value!)
    handleClose()
    isSaving.value = false
  }, 500)
}

function handleClose(): void {
  emit('update:modelValue', false)
  emit('cancel')
  
  // 重置狀態
  setTimeout(() => {
    currentStep.value = 1
    if (!isEditMode.value) {
      reportConfig.value = {
        name: '',
        description: '',
        projectId: props.projectId || 'all',
        dimension: 'assigneeId',
        aggregation: 'count',
        chartType: 'bar',
        chartOptions: { ...DEFAULT_CHART_OPTIONS }
      }
    }
  }, 300)
}

function getDimensionLabel(dimension?: ReportDimension): string {
  if (!dimension) return ''
  const option = DIMENSION_OPTIONS.find(opt => opt.value === dimension)
  return option?.label || dimension
}

function getAggregationLabel(aggregation?: ReportAggregation): string {
  if (!aggregation) return ''
  const option = AGGREGATION_OPTIONS.find(opt => opt.value === aggregation)
  return option?.label || aggregation
}

function getChartTypeLabel(chartType?: ChartType): string {
  if (!chartType) return ''
  const option = CHART_TYPE_OPTIONS.find(opt => opt.value === chartType)
  return option?.label || chartType
}

// 監聽器
watch(() => props.config, (newConfig) => {
  if (newConfig && props.modelValue) {
    reportConfig.value = { ...newConfig }
  }
}, { immediate: true, deep: true })

watch(() => props.modelValue, (show) => {
  if (show && isEditMode.value && props.config) {
    reportConfig.value = { ...props.config }
  }
})

onMounted(() => {
  // 載入專案選項等初始資料
  void generatePreview()
})
</script>

<style scoped lang="scss">
.custom-report-dialog {
  height: 100vh;
  display: flex;
  flex-direction: column;
  
  .dialog-header {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
    padding: 0.5rem 1rem;
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      
      .header-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        
        h4 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 500;
        }
      }
    }
    
    .step-indicator {
      :deep(.transparent-stepper) {
        background: transparent;
        
        .q-stepper__header {
          background: transparent;
          padding: 0;
        }
        
        .q-stepper__tab {
          color: rgba(255, 255, 255, 0.8);
          opacity: 1;
          
          &.q-stepper__tab--active {
            color: white;
          }
          
          &.q-stepper__tab--done {
            color: white;
          }
          
          .q-stepper__dot {
            background: rgba(255, 255, 255, 0.4);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.6);
            
            .q-icon {
              color: inherit;
            }
            
            &.q-stepper__dot--active {
              background: white;
              color: #1976d2;
              border-color: white;
              
              .q-icon {
                color: #1976d2;
              }
            }
            
            &.q-stepper__dot--done {
              background: white;
              color: #1976d2;
              border-color: white;
              
              .q-icon {
                color: #1976d2;
              }
            }
          }
          
          .q-stepper__label {
            color: inherit;
            font-size: 0.75rem;
            font-weight: 500;
          }
        }
        
        .q-stepper__line {
          background: rgba(255, 255, 255, 0.3);
          
          &.q-stepper__line--active {
            background: rgba(255, 255, 255, 0.8);
          }
        }
      }
      
      // 確保步驟標籤文字可見
      :deep(.step-header) {
        color: white !important;
      }
      
      // 額外的選擇器確保所有文字可見
      :deep(.q-stepper__tab .q-stepper__label) {
        color: white !important;
      }
      
      :deep(.q-stepper__tab .q-stepper__title) {
        color: white !important;
      }
    }
  }
  
  .dialog-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    
    .content-layout {
      display: flex;
      height: 100%;
      
      .config-panel {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
        background: #f8f9fa;
        border-right: 1px solid #e1e5e9;
        
        .step-content {
          .step-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            
            h5 {
              margin: 0;
              font-size: 1.125rem;
              color: #333;
            }
          }
          
          .form-section {
            margin-bottom: 1rem;
          }
          
          .dimension-grid,
          .chart-type-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          
          .dimension-card,
          .chart-type-card {
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
            
            &:hover {
              border-color: #1976d2;
              transform: translateY(-2px);
            }
            
            &.selected {
              border-color: #1976d2;
              background: #e3f2fd;
            }
            
            .dimension-label,
            .chart-type-title {
              font-weight: 500;
              margin-top: 0.5rem;
            }
            
            .chart-type-description {
              font-size: 0.75rem;
              color: #666;
              margin-top: 0.25rem;
            }
          }
          
          .aggregation-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            
            .aggregation-card {
              cursor: pointer;
              transition: all 0.2s ease;
              border: 2px solid transparent;
              
              &:hover {
                border-color: #1976d2;
              }
              
              &.selected {
                border-color: #1976d2;
                background: #e3f2fd;
              }
              
              .aggregation-title {
                font-weight: 500;
                margin-bottom: 0.25rem;
              }
              
              .aggregation-description {
                font-size: 0.875rem;
                color: #666;
              }
            }
          }
          
          .style-form {
            .form-section {
              margin-bottom: 1.5rem;
            }
          }
          
          .preview-summary {
            .summary-item {
              padding: 0.5rem 0;
              border-bottom: 1px solid #eee;
              
              &:last-child {
                border-bottom: none;
              }
            }
          }
        }
      }
      
      .preview-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: white;
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e1e5e9;
          
          h6 {
            margin: 0;
            font-size: 1rem;
            color: #333;
          }
        }
        
        .preview-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }
      }
    }
  }
  
  .dialog-actions {
    background: #f8f9fa;
    border-top: 1px solid #e1e5e9;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    
    .actions-left,
    .actions-right {
      display: flex;
      gap: 0.75rem;
    }
  }
}

@media (max-width: 1024px) {
  .custom-report-dialog .dialog-content .content-layout {
    flex-direction: column;
    
    .config-panel {
      border-right: none;
      border-bottom: 1px solid #e1e5e9;
    }
    
    .preview-panel {
      min-height: 400px;
    }
  }
}

@media (max-width: 768px) {
  .custom-report-dialog {
    .dialog-header {
      padding: 0.75rem 1rem;
      
      .step-indicator {
        display: none; // 隱藏步驟指示器在小螢幕上
      }
    }
    
    .dialog-content .content-layout .config-panel {
      padding: 0.75rem;
      
      .dimension-grid,
      .chart-type-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  }
}
</style>