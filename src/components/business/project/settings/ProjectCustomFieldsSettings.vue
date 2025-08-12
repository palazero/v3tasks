<template>
  <div class="project-custom-fields-settings">
    <!-- 標題區域 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <q-icon name="tune" color="primary" size="24px" />
        </div>
        <div class="header-text">
          <h5 class="header-title">自訂欄位管理</h5>
          <p class="header-subtitle">
            為專案任務建立自訂欄位，以滿足特定的專案管理需求
          </p>
        </div>
      </div>
      
      <!-- 主要操作按鈕 -->
      <div class="header-actions">
        <q-btn
          unelevated
          color="primary"
          icon="add"
          label="新增欄位"
          class="primary-btn"
          @click="showCreateFieldDialog"
        />
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="loading-container">
      <q-spinner-dots size="3em" color="primary" />
      <div class="loading-text">載入自訂欄位中...</div>
    </div>

    <!-- 自訂欄位列表 -->
    <div v-else-if="customFields.length > 0" class="fields-container">
      <!-- 工具列 -->
      <div class="form-section">
        <div class="section-header">
          <q-icon name="build" color="primary" size="20px" />
          <span class="section-title">工具操作</span>
        </div>
        <div class="section-content">
          <div class="toolbar-actions">
            <q-btn
              flat
              icon="refresh"
              label="重新整理"
              class="toolbar-btn"
              @click="refreshFields"
            />
            <q-btn
              flat
              icon="download"
              label="匯出欄位"
              class="toolbar-btn"
              @click="exportFields"
            />
            <q-btn
              flat
              icon="upload"
              label="匯入欄位"
              class="toolbar-btn"
              @click="showImportDialog"
            />
          </div>
        </div>
      </div>

      <!-- 欄位列表 -->
      <div class="form-section">
        <div class="section-header">
          <q-icon name="list" color="primary" size="20px" />
          <span class="section-title">欄位清單</span>
          <q-chip 
            size="sm" 
            color="primary" 
            text-color="white" 
            :label="`${customFields.length} 個欄位`"
            class="field-count-chip"
          />
        </div>
        <div class="section-content">
          <div class="compact-fields-list">
            <div 
              v-for="field in customFields" 
              :key="field.fieldId" 
              class="compact-field-item"
            >
              <div class="field-main">
                <!-- 欄位資訊 -->
                <div class="field-info">
                  <q-icon
                    :name="getFieldTypeIcon(field.type)"
                    :color="getFieldTypeColor(field.type)"
                    size="18px"
                    class="field-type-icon"
                  />
                  <div class="field-details">
                    <div class="field-name-row">
                      <span class="field-name">{{ field.name }}</span>
                      <!-- 欄位狀態標記 -->
                      <div class="field-badges">
                        <q-badge 
                          v-if="field.isRequired" 
                          color="red" 
                          label="必填"
                          class="field-badge"
                        />
                        <q-badge 
                          v-if="field.isSystem" 
                          color="grey" 
                          label="系統"
                          class="field-badge"
                        />
                        <q-badge 
                          :color="field.isVisible ? 'green' : 'grey'" 
                          :label="field.isVisible ? '顯示' : '隱藏'"
                          class="field-badge"
                        />
                      </div>
                    </div>
                    <div class="field-meta">
                      <span class="field-type">{{ getFieldTypeLabel(field.type) }}</span>
                      <span v-if="field.description" class="field-description">{{ field.description }}</span>
                    </div>
                  </div>
                </div>

                <!-- 操作按鈕 -->
                <div class="field-actions">
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :icon="field.isVisible ? 'visibility' : 'visibility_off'"
                    :color="field.isVisible ? 'primary' : 'grey'"
                    class="action-btn"
                    @click="toggleFieldVisibility(field)"
                  >
                    <q-tooltip>{{ field.isVisible ? '隱藏' : '顯示' }}</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="content_copy"
                    color="blue"
                    class="action-btn"
                    @click="duplicateField(field)"
                  >
                    <q-tooltip>複製</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="edit"
                    color="orange"
                    class="action-btn"
                    @click="editField(field)"
                  >
                    <q-tooltip>編輯</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="delete"
                    color="negative"
                    class="action-btn"
                    :disable="field.isSystem"
                    @click="deleteField(field)"
                  >
                    <q-tooltip>{{ field.isSystem ? '系統欄位無法刪除' : '刪除' }}</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state-container">
      <div class="empty-state">
        <div class="empty-icon">
          <q-icon name="dynamic_form" size="4em" color="grey-4" />
        </div>
        <div class="empty-title">尚未建立自訂欄位</div>
        <div class="empty-subtitle">建立自訂欄位來滿足專案的特殊需求，提升任務管理的靈活性</div>
        
        <div class="empty-actions">
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="建立第一個欄位"
            class="primary-btn"
            @click="showCreateFieldDialog"
          />
          <q-btn
            outline
            color="secondary"
            icon="auto_fix_high"
            label="初始化預設欄位"
            class="secondary-btn"
            @click="initializeDefaultFields"
          />
        </div>
      </div>
    </div>

    <!-- 欄位統計 -->
    <div v-if="customFields.length > 0" class="form-section">
      <div class="section-header">
        <q-icon name="analytics" color="primary" size="20px" />
        <span class="section-title">統計資訊</span>
      </div>
      <div class="section-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value text-primary">{{ totalFieldsCount }}</div>
            <div class="stat-label">
              <q-icon name="list" size="xs" class="q-mr-xs" />
              總欄位數
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-value text-orange">{{ requiredFieldsCount }}</div>
            <div class="stat-label">
              <q-icon name="priority_high" size="xs" class="q-mr-xs" />
              必填欄位
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-value text-green">{{ visibleFieldsCount }}</div>
            <div class="stat-label">
              <q-icon name="visibility" size="xs" class="q-mr-xs" />
              顯示欄位
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-value text-purple">{{ fieldTypesCount }}</div>
            <div class="stat-label">
              <q-icon name="category" size="xs" class="q-mr-xs" />
              欄位類型
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 建立欄位對話框 -->
    <CustomFieldEditDialog
      v-model="showFieldDialog"
      :field="editingField"
      :groups="[]"
      :project-id="props.projectId"
      @save="onFieldSave"
    />

    <!-- 匯入對話框 -->
    <q-dialog v-model="showImportModal">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">匯入自訂欄位</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            匯入之前匯出的自訂欄位配置 JSON 檔案
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-file
            v-model="importFile"
            accept=".json"
            label="選擇 JSON 檔案"
            outlined
            @update:model-value="onImportFileSelect"
          />

          <q-input
            v-if="importData"
            v-model="importData"
            type="textarea"
            label="匯入資料預覽"
            outlined
            rows="8"
            readonly
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn
            unelevated
            label="匯入"
            color="primary"
            :disable="!importData"
            @click="performImport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { CustomField, FieldType } from '@/types'
import { useCustomFields } from '@/composables/useCustomFields'
import CustomFieldRenderer from '@/components/business/shared/CustomFieldRenderer.vue'
import CustomFieldEditDialog from '@/components/ui/dialogs/CustomFieldEditDialog.vue'

// Props
const props = defineProps<{
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'change': []
}>()

const $q = useQuasar()
const {
  fields: customFields,
  isLoading,
  error,
  loadCustomFields,
  updateCustomField,
  deleteCustomField,
  duplicateCustomField,
  getFieldDefaultValue,
  exportCustomFields,
  importCustomFields,
  initializeDefaultFields: initializeDefaultFieldsService
} = useCustomFields(props.projectId)

// 對話框狀態
const showFieldDialog = ref(false)
const showImportModal = ref(false)
const editingField = ref<CustomField | null>(null)

// 匯入相關
const importFile = ref<File | null>(null)
const importData = ref('')

// 欄位類型配置
const fieldTypeConfig = {
  text: { icon: 'text_fields', color: 'blue', label: '文字' },
  number: { icon: 'numbers', color: 'green', label: '數字' },
  date: { icon: 'calendar_today', color: 'purple', label: '日期' },
  select: { icon: 'arrow_drop_down', color: 'orange', label: '單選' },
  multiSelect: { icon: 'checklist', color: 'red', label: '多選' },
  user: { icon: 'person', color: 'indigo', label: '用戶' },
  checkbox: { icon: 'check_box', color: 'teal', label: '核取方塊' }
}

// 計算屬性
const totalFieldsCount = computed(() => customFields.value.length)
const requiredFieldsCount = computed(() =>
  customFields.value.filter(field => field.isRequired).length
)
const visibleFieldsCount = computed(() =>
  customFields.value.filter(field => field.isVisible).length
)
const fieldTypesCount = computed(() => {
  const types = new Set(customFields.value.map(field => field.type))
  return types.size
})

// 初始化載入
onMounted(async () => {
  console.log('ProjectCustomFieldsSettings mounted with projectId:', props.projectId)
  
  if (!props.projectId) {
    console.error('ProjectId is required for custom fields')
    return
  }
  
  try {
    console.log('Loading custom fields...')
    await loadCustomFields()
    console.log('Custom fields loaded:', customFields.value)
  } catch (err) {
    console.error('Failed to load custom fields:', err)
  }
})

// 欄位類型相關函數
function getFieldTypeIcon(type: FieldType): string {
  return fieldTypeConfig[type]?.icon || 'help'
}

function getFieldTypeColor(type: FieldType): string {
  return fieldTypeConfig[type]?.color || 'grey'
}

function getFieldTypeLabel(type: FieldType): string {
  return fieldTypeConfig[type]?.label || '未知'
}

// 工具列操作
function refreshFields(): void {
  void loadCustomFields()
}

// 欄位操作
function showCreateFieldDialog(): void {
  editingField.value = null
  showFieldDialog.value = true
}

function editField(field: CustomField): void {
  editingField.value = field
  showFieldDialog.value = true
}

function deleteField(field: CustomField): void {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除欄位「${field.name}」嗎？此操作無法復原。`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void deleteCustomField(field.fieldId)
    emit('change')
  })
}

function toggleFieldVisibility(field: CustomField): void {
  void updateCustomField(field.fieldId, { isVisible: !field.isVisible })
  emit('change')
}

function duplicateField(field: CustomField): void {
  $q.dialog({
    title: '複製欄位',
    message: '請輸入新欄位名稱：',
    prompt: {
      model: `${field.name} (副本)`,
      type: 'text'
    },
    cancel: true,
    persistent: true
  }).onOk((newName: string) => {
    if (newName.trim()) {
      void duplicateCustomField(field.fieldId, newName.trim())
      emit('change')
    }
  })
}


// 對話框事件
function onFieldSave(): void {
  showFieldDialog.value = false
  editingField.value = null
  void loadCustomFields()
  emit('change')
}

// 匯入匯出
function exportFields(): void {
  void exportCustomFields()
    .then(data => {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `custom-fields-${props.projectId}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      $q.notify({
        type: 'positive',
        message: '自訂欄位已匯出'
      })
    })
    .catch(err => {
      $q.notify({
        type: 'negative',
        message: '匯出失敗：' + err.message
      })
    })
}

function showImportDialog(): void {
  importFile.value = null
  importData.value = ''
  showImportModal.value = true
}

function onImportFileSelect(file: File | null): void {
  if (!file) {
    importData.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e): void => {
    importData.value = e.target?.result as string
  }
  reader.readAsText(file)
}

function performImport(): void {
  if (!importData.value) return

  void importCustomFields(importData.value)
    .then(result => {
      $q.notify({
        type: 'positive',
        message: `匯入成功：${result.fieldsCount} 個欄位`
      })
      showImportModal.value = false
      importData.value = ''
      importFile.value = null
      emit('change')
    })
    .catch(err => {
      $q.notify({
        type: 'negative',
        message: '匯入失敗：' + err.message
      })
    })
}

// 初始化預設欄位
async function initializeDefaultFields(): Promise<void> {
  console.log('🚀 開始初始化預設欄位...')
  
  try {
    $q.loading.show({
      message: '正在初始化預設欄位...'
    })
    
    console.log('📞 調用 initializeDefaultFieldsService...')
    await initializeDefaultFieldsService()
    console.log('✅ 初始化完成')
    
    $q.notify({
      type: 'positive',
      message: '預設欄位已初始化',
      position: 'top'
    })
    
    emit('change')
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
    $q.notify({
      type: 'negative',
      message: `初始化預設欄位失敗: ${error.message || error}`,
      position: 'top'
    })
  } finally {
    $q.loading.hide()
  }
}

// 錯誤處理
if (error.value) {
  $q.notify({
    type: 'negative',
    message: error.value
  })
}
</script>

<style scoped lang="scss">
.project-custom-fields-settings {
  padding: 0;
  
  // 頁面標題
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding: 24px 0 16px;
    border-bottom: 1px solid #e0e0e0;
    
    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex: 1;
      
      .header-icon {
        margin-top: 2px;
      }
      
      .header-text {
        .header-title {
          margin: 0 0 4px;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          line-height: 1.2;
        }
        
        .header-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }
      }
    }
    
    .header-actions {
      .primary-btn {
        min-width: 120px;
        font-weight: 500;
      }
    }
  }

  // 載入狀態
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    
    .loading-text {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
    }
  }

  // 表單區段
  .form-section {
    background: white;
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #c0c0c0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
      border-bottom: 1px solid #e0e0e0;
      
      .section-title {
        font-weight: 600;
        color: #333;
        font-size: 15px;
        flex: 1;
      }
      
      .field-count-chip {
        margin-left: auto;
      }
    }
    
    .section-content {
      padding: 20px;
    }
  }

  // 工具列操作
  .toolbar-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    
    .toolbar-btn {
      border-radius: 6px;
      padding: 8px 16px;
      transition: all 0.2s ease;
      
      &:hover {
        background: #f0f0f0;
      }
    }
  }

  // 緊湑欄位列表
  .compact-fields-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  // 緊湊欄位項目
  .compact-field-item {
    background: white;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    transition: all 0.15s ease;
    
    &:hover {
      border-color: #1976d2;
      box-shadow: 0 1px 4px rgba(25, 118, 210, 0.08);
      background: #fafbfc;
    }
    
    .field-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      min-height: 48px;
    }
    
    .field-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
      
      .field-type-icon {
        flex-shrink: 0;
      }
      
      .field-details {
        flex: 1;
        min-width: 0;
        
        .field-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
          
          .field-name {
            font-weight: 600;
            font-size: 14px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .field-badges {
            display: flex;
            gap: 4px;
            flex-shrink: 0;
            
            .field-badge {
              font-size: 10px;
              padding: 1px 6px;
              border-radius: 8px;
            }
          }
        }
        
        .field-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #666;
          
          .field-type {
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-weight: 500;
            flex-shrink: 0;
          }
          
          .field-description {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            
            &::before {
              content: '• ';
              margin-right: 2px;
            }
          }
        }
      }
    }
    
    .field-actions {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
      
      .action-btn {
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-radius: 4px;
        
        &:hover {
          transform: scale(1.1);
        }
      }
    }
  }

  // 空狀態
  .empty-state-container {
    padding: 40px 20px;
    
    .empty-state {
      max-width: 480px;
      margin: 0 auto;
      text-align: center;
      
      .empty-icon {
        margin-bottom: 24px;
      }
      
      .empty-title {
        font-size: 20px;
        font-weight: 600;
        color: #666;
        margin-bottom: 8px;
      }
      
      .empty-subtitle {
        font-size: 14px;
        color: #888;
        line-height: 1.5;
        margin-bottom: 32px;
      }
      
      .empty-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        
        .primary-btn {
          min-width: 160px;
          font-weight: 500;
        }
        
        .secondary-btn {
          min-width: 160px;
          font-weight: 500;
        }
      }
    }
  }

  // 統計網格
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  // 統計卡片
  .stat-card {
    background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px 16px;
    text-align: center;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
      line-height: 1;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }
  }

  // 響應式設計
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      gap: 20px;
      align-items: stretch;
      
      .header-actions {
        align-self: stretch;
        
        .primary-btn {
          width: 100%;
        }
      }
    }
    
    .compact-fields-list {
      // 移動裝置上保持相同佈局
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .empty-actions {
      flex-direction: column;
      
      .primary-btn,
      .secondary-btn {
        width: 100%;
      }
    }
  }
}
</style>