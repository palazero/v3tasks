<template>
  <q-dialog 
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="report-templates-dialog">
      <!-- 對話框標題 -->
      <q-card-section class="dialog-header">
        <div class="header-content">
          <div class="header-title">
            <q-icon name="dashboard" size="1.5rem" />
            <h4>報表範本庫</h4>
          </div>
          <q-btn 
            flat 
            round 
            dense 
            icon="close" 
            @click="$emit('update:modelValue', false)"
          />
        </div>
        
        <!-- 搜尋和篩選 -->
        <div class="header-filters">
          <q-input
            v-model="searchQuery"
            placeholder="搜尋範本..."
            outlined
            dense
            clearable
            class="search-input"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          
          <q-select
            v-model="selectedCategory"
            :options="categoryOptions"
            label="分類"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="category-select"
          />
          
          <q-btn
            flat
            icon="filter_list"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            進階篩選
          </q-btn>
        </div>
        
        <!-- 進階篩選 -->
        <q-slide-transition>
          <div v-show="showAdvancedFilters" class="advanced-filters">
            <div class="filter-row">
              <q-select
                v-model="filterChartType"
                :options="chartTypeFilterOptions"
                label="圖表類型"
                outlined
                dense
                multiple
                emit-value
                map-options
                clearable
              />
              
              <q-select
                v-model="filterDimension"
                :options="dimensionFilterOptions"
                label="統計維度"
                outlined
                dense
                multiple
                emit-value
                map-options
                clearable
              />
              
              <q-toggle
                v-model="showBuiltInOnly"
                label="僅顯示內建範本"
                color="primary"
              />
            </div>
          </div>
        </q-slide-transition>
      </q-card-section>
      
      <!-- 主要內容 -->
      <q-card-section class="dialog-content">
        <!-- 載入狀態 -->
        <div v-if="isLoading" class="loading-state">
          <q-spinner-dots size="2rem" color="primary" />
          <div>載入範本中...</div>
        </div>
        
        <!-- 空狀態 -->
        <div v-else-if="filteredTemplates.length === 0" class="empty-state">
          <q-icon name="search_off" size="4rem" color="grey-5" />
          <h4>找不到符合條件的範本</h4>
          <p>嘗試調整搜尋條件或篩選器</p>
        </div>
        
        <!-- 範本網格 -->
        <div v-else class="templates-grid">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
          >
            <q-card 
              class="template-item"
              :class="{ 'popular': template.usageCount > 50 }"
            >
              <!-- 範本標籤 -->
              <div class="template-badges">
                <q-badge 
                  v-if="template.isBuiltIn" 
                  color="positive" 
                  label="內建"
                />
                <q-badge 
                  v-if="template.usageCount > 50" 
                  color="orange" 
                  label="熱門"
                />
              </div>
              
              <!-- 範本預覽 -->
              <q-card-section class="template-preview">
                <div class="preview-placeholder">
                  <q-icon 
                    :name="getChartIcon(template.config.chartType)" 
                    size="3rem" 
                    :color="getChartColor(template.config.chartType)"
                  />
                </div>
              </q-card-section>
              
              <!-- 範本資訊 -->
              <q-card-section class="template-info">
                <h5 class="template-title">{{ template.name }}</h5>
                <p class="template-description">{{ template.description }}</p>
                
                <div class="template-meta">
                  <div class="meta-chips">
                    <q-chip 
                      dense 
                      color="primary" 
                      text-color="white"
                      size="sm"
                    >
                      {{ getChartTypeLabel(template.config.chartType) }}
                    </q-chip>
                    <q-chip 
                      dense 
                      color="secondary" 
                      text-color="white"
                      size="sm"
                    >
                      {{ getDimensionLabel(template.config.dimension) }}
                    </q-chip>
                    <q-chip 
                      dense 
                      color="grey-6" 
                      text-color="white"
                      size="sm"
                    >
                      {{ getAggregationLabel(template.config.aggregation) }}
                    </q-chip>
                  </div>
                  
                  <div class="usage-stats">
                    <q-icon name="trending_up" size="1rem" />
                    <span>{{ template.usageCount }} 次使用</span>
                  </div>
                </div>
                
                <!-- 標籤 -->
                <div v-if="template.tags && template.tags.length > 0" class="template-tags">
                  <q-chip
                    v-for="tag in template.tags"
                    :key="tag"
                    dense
                    outline
                    size="sm"
                    color="grey-7"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </q-card-section>
              
              <!-- 範本操作 -->
              <q-card-actions class="template-actions">
                <q-btn
                  flat
                  color="primary"
                  @click="previewTemplate(template)"
                >
                  預覽
                </q-btn>
                <q-btn
                  color="primary"
                  @click="selectTemplate(template)"
                >
                  使用此範本
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-card-section>
      
      <!-- 預覽對話框 -->
      <q-dialog v-model="showPreviewDialog" maximized>
        <q-card class="template-preview-dialog">
          <q-card-section class="preview-header">
            <div class="header-content">
              <div class="preview-title">
                <h4>{{ previewingTemplate?.name }}</h4>
                <p>{{ previewingTemplate?.description }}</p>
              </div>
              <div class="header-actions">
                <q-btn
                  color="primary"
                  @click="selectTemplate(previewingTemplate!)"
                >
                  使用此範本
                </q-btn>
                <q-btn 
                  flat 
                  round 
                  dense 
                  icon="close" 
                  @click="showPreviewDialog = false"
                />
              </div>
            </div>
          </q-card-section>
          
          <q-card-section class="preview-content">
            <ReportRenderer
              v-if="previewConfig"
              :config="previewConfig"
              :auto-load="true"
              :show-header="false"
              chart-height="500px"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import ReportRenderer from './ReportRenderer.vue'
import { 
  DIMENSION_OPTIONS,
  CHART_TYPE_OPTIONS,
  AGGREGATION_OPTIONS,
  type ReportTemplate,
  type ReportConfig,
  type ReportTemplateCategory
} from '@/types/report'
import { DEFAULT_REPORT_TEMPLATES } from '@/data/defaultReportTemplates'
import { nanoid } from 'nanoid'

interface Props {
  modelValue: boolean
  projectId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

interface Emits {
  'update:modelValue': [value: boolean]
  'select': [template: ReportTemplate]
}

const emit = defineEmits<Emits>()

const $q = useQuasar()

// 響應式狀態
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<ReportTemplateCategory>()
const showAdvancedFilters = ref(false)
const filterChartType = ref<string[]>([])
const filterDimension = ref<string[]>([])
const showBuiltInOnly = ref(false)

const templates = ref<ReportTemplate[]>([])
const previewingTemplate = ref<ReportTemplate>()
const showPreviewDialog = ref(false)

// 計算屬性
const categoryOptions = computed(() => [
  { label: '任務分析', value: 'task-analysis' },
  { label: '團隊績效', value: 'team-performance' },
  { label: '專案總覽', value: 'project-overview' },
  { label: '時間追蹤', value: 'time-tracking' }
])

const chartTypeFilterOptions = computed(() => 
  CHART_TYPE_OPTIONS.map(opt => ({
    label: opt.label,
    value: opt.value
  }))
)

const dimensionFilterOptions = computed(() => 
  DIMENSION_OPTIONS.map(opt => ({
    label: opt.label,
    value: opt.value
  }))
)

const filteredTemplates = computed(() => {
  let result = templates.value

  // 文字搜尋
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      (template.tags || []).some(tag => tag.toLowerCase().includes(query))
    )
  }

  // 分類篩選
  if (selectedCategory.value) {
    result = result.filter(template => template.category === selectedCategory.value)
  }

  // 圖表類型篩選
  if (filterChartType.value.length > 0) {
    result = result.filter(template => 
      filterChartType.value.includes(template.config.chartType)
    )
  }

  // 統計維度篩選
  if (filterDimension.value.length > 0) {
    result = result.filter(template => 
      filterDimension.value.includes(template.config.dimension)
    )
  }

  // 內建範本篩選
  if (showBuiltInOnly.value) {
    result = result.filter(template => template.isBuiltIn)
  }

  return result.sort((a, b) => b.usageCount - a.usageCount)
})

const previewConfig = computed((): ReportConfig | undefined => {
  if (!previewingTemplate.value) return undefined
  
  return {
    id: nanoid(),
    name: previewingTemplate.value.name,
    description: previewingTemplate.value.description,
    ...previewingTemplate.value.config,
    projectId: props.projectId || 'all',
    createdBy: 'current-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: false,
    isPublic: false,
    order: 0,
    isActive: true
  }
})

// 方法
async function loadTemplates(): Promise<void> {
  isLoading.value = true

  try {
    // 模擬載入時間
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 使用預設範本資料
    templates.value = [...DEFAULT_REPORT_TEMPLATES]
    
    // 載入用戶自訂範本（如果有的話）
    const userTemplates = JSON.parse(localStorage.getItem('userReportTemplates') || '[]') as ReportTemplate[]
    templates.value.push(...userTemplates)
    
  } catch (error) {
    console.error('載入範本失敗:', error)
    $q.notify({
      type: 'negative',
      message: '載入範本失敗'
    })
  } finally {
    isLoading.value = false
  }
}

function previewTemplate(template: ReportTemplate): void {
  previewingTemplate.value = template
  showPreviewDialog.value = true
}

function selectTemplate(template: ReportTemplate): void {
  // 增加使用次數
  template.usageCount++
  
  emit('select', template)
  emit('update:modelValue', false)
  
  $q.notify({
    type: 'positive',
    message: `已選擇範本: ${template.name}`
  })
}

// 工具函數
function getChartIcon(chartType: string): string {
  const iconMap: Record<string, string> = {
    'bar': 'bar_chart',
    'pie': 'pie_chart',
    'doughnut': 'donut_large',
    'line': 'show_chart',
    'area': 'area_chart',
    'horizontalBar': 'list',
    'stackedBar': 'stacked_bar_chart',
    'scatter': 'scatter_plot'
  }
  return iconMap[chartType] || 'bar_chart'
}

function getChartColor(chartType: string): string {
  const colorMap: Record<string, string> = {
    'bar': 'primary',
    'pie': 'secondary',
    'doughnut': 'positive',
    'line': 'info',
    'area': 'warning',
    'horizontalBar': 'purple',
    'stackedBar': 'orange',
    'scatter': 'pink'
  }
  return colorMap[chartType] || 'primary'
}

function getChartTypeLabel(chartType: string): string {
  const option = CHART_TYPE_OPTIONS.find(opt => opt.value === chartType)
  return option?.label || chartType
}

function getDimensionLabel(dimension: string): string {
  const option = DIMENSION_OPTIONS.find(opt => opt.value === dimension)
  return option?.label || dimension
}

function getAggregationLabel(aggregation: string): string {
  const option = AGGREGATION_OPTIONS.find(opt => opt.value === aggregation)
  return option?.label || aggregation
}

// 生命週期
onMounted(() => {
  void loadTemplates()
})
</script>

<style scoped lang="scss">
.report-templates-dialog {
  height: 100vh;
  display: flex;
  flex-direction: column;

  .dialog-header {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
    padding: 1.5rem;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      .header-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        h4 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 500;
        }
      }
    }

    .header-filters {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;

      .search-input {
        flex: 2;
      }

      .category-select {
        flex: 1;
      }

      :deep(.q-field__control) {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      :deep(.q-field__native) {
        color: white;
      }
    }

    .advanced-filters {
      .filter-row {
        display: flex;
        gap: 1rem;
        align-items: center;

        > * {
          flex: 1;
        }
      }
    }
  }

  .dialog-content {
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

      h4 {
        margin: 1rem 0 0.5rem 0;
        color: #333;
      }

      p {
        margin: 0;
        color: #666;
      }
    }

    .templates-grid {
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;

      .template-card {
        .template-item {
          position: relative;
          height: 100%;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }

          &.popular {
            border: 2px solid #ff9800;
          }

          .template-badges {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            z-index: 2;
            display: flex;
            gap: 0.5rem;
          }

          .template-preview {
            padding: 1.5rem;
            background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
            text-align: center;

            .preview-placeholder {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 60px;
            }
          }

          .template-info {
            .template-title {
              margin: 0 0 0.5rem 0;
              font-size: 1.125rem;
              font-weight: 600;
              color: #333;
            }

            .template-description {
              margin: 0 0 1rem 0;
              color: #666;
              line-height: 1.5;
              font-size: 0.875rem;
            }

            .template-meta {
              margin-bottom: 1rem;

              .meta-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
              }

              .usage-stats {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.75rem;
                color: #666;
              }
            }

            .template-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 0.25rem;
            }
          }

          .template-actions {
            justify-content: space-between;
            padding: 1rem;
          }
        }
      }
    }
  }

  .template-preview-dialog {
    height: 100vh;

    .preview-header {
      background: #1976d2;
      color: white;

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        .preview-title {
          flex: 1;

          h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
          }

          p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.875rem;
          }
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
      }
    }

    .preview-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}

@media (max-width: 768px) {
  .report-templates-dialog {
    .dialog-header {
      .header-filters {
        flex-direction: column;
        align-items: stretch;

        .search-input,
        .category-select {
          flex: none;
        }
      }

      .advanced-filters .filter-row {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .dialog-content .templates-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem;
    }
  }
}
</style>