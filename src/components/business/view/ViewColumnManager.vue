<template>
  <q-dialog v-model="dialogVisible" persistent @show="initializeColumns">
    <q-card style="min-width: 700px; max-width: 900px">
      <!-- 標題列 -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white compact-header">
        <q-icon name="view_column" size="xs" class="q-mr-xs" />
        <div class="text-subtitle1">欄位管理</div>
        <q-space />
        <q-btn icon="close" flat round dense size="sm" v-close-popup />
      </q-card-section>

      <!-- 說明文字 -->
      <q-card-section class="compact-info-section bg-grey-1">
        <div class="row items-center justify-between">
          <div class="text-caption text-grey-7">
            <q-icon name="info" size="xs" class="q-mr-xs" />
            拖拽欄位可調整順序，勾選可控制顯示/隱藏
            <span v-if="supportsWidth">，可調整欄位寬度</span>
          </div>
          <div class="text-caption text-grey-7">
            已選擇 {{ visibleCount }} / {{ totalCount }} 個欄位
          </div>
        </div>
      </q-card-section>

      <!-- 快速操作 -->
      <q-card-section class="compact-action-section">
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="visibility"
            label="全部顯示"
            size="sm"
            color="primary"
            @click="showAllColumns"
            class="compact-btn"
          />
          <q-btn
            flat
            dense
            icon="visibility_off"
            label="僅顯示必要"
            size="sm"
            @click="showRequiredOnly"
            class="compact-btn"
          />
          <q-separator vertical />
          <q-btn
            flat
            dense
            icon="refresh"
            label="重置順序"
            size="sm"
            @click="resetColumnOrder"
            class="compact-btn"
          />
          <q-btn
            flat
            dense
            icon="settings_backup_restore"
            label="恢復預設"
            size="sm"
            @click="restoreDefaults"
            class="compact-btn"
          />
        </div>
      </q-card-section>

      <q-separator />

      <!-- 欄位列表 -->
      <q-card-section class="column-list-container">
        <VueDraggable
          v-model="allColumns"
          :animation="150"
          handle=".drag-handle"
          ghost-class="column-ghost"
          chosen-class="column-chosen"
          drag-class="column-drag"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <div
            v-for="(column, index) in allColumns"
            :key="column.key"
            class="column-item-compact"
            :class="{
              'column-required': column.required,
              'column-system': column.fieldType === 'system',
              'column-custom': column.fieldType === 'custom'
            }"
          >
            <!-- 拖拽手柄 -->
            <div class="drag-handle" :class="{ 'invisible': column.required }">
              <q-icon name="drag_indicator" size="xs" />
            </div>

            <!-- 欄位資訊 -->
            <div class="column-info">
              <div class="column-label">
                {{ column.label }}
                <q-badge v-if="column.required" color="orange" class="compact-badge">
                  必要
                </q-badge>
                <q-badge 
                  v-if="column.fieldType === 'system'" 
                  color="blue-5" 
                  class="compact-badge"
                >
                  系統
                </q-badge>
                <q-badge 
                  v-else
                  color="purple" 
                  class="compact-badge"
                >
                  自訂
                </q-badge>
              </div>
              <div class="column-description">
                {{ column.description || column.key }}
              </div>
            </div>

            <!-- 欄位設定 -->
            <div class="column-settings">
              <!-- 寬度調整 -->
              <q-input
                v-if="supportsWidth && !['actions', 'checkbox'].includes(column.key)"
                v-model.number="column.width"
                type="number"
                dense
                outlined
                suffix="px"
                class="width-input-compact"
                :min="column.minWidth || 10"
                :max="column.maxWidth || 500"
                step="10"
              />
              <div v-else-if="supportsWidth" class="width-placeholder"></div>

              <!-- 顯示切換 -->
              <q-toggle
                v-model="column.visible"
                :disable="column.required"
                color="primary"
                size="xs"
              />
            </div>
          </div>
        </VueDraggable>

        <!-- 空狀態 -->
        <div v-if="!allColumns.length"
              class="empty-state text-center">
          <q-icon name="view_column" size="32px" color="grey-5" />
          <div class="text-caption text-grey-6 q-mt-sm">沒有可用的欄位</div>
        </div>
      </q-card-section>

      <!-- 操作按鈕 -->
      <q-card-actions align="right" class="bg-grey-1">
        <q-btn flat label="取消" @click="handleCancel" />
        <q-btn
          color="primary"
          label="套用"
          @click="handleApply"
          :disable="!hasChanges"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { ColumnConfig } from '@/types'
import type { FieldDefinition } from '@/config/columnDefinitions'

// Props
interface ViewColumnManagerProps {
  modelValue: boolean
  viewType: 'table' | 'list' | 'gantt' | 'board'
  columns: ColumnConfig[]
  fieldDefinitions: FieldDefinition[]
}

const props = defineProps<ViewColumnManagerProps>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'apply': [columns: ColumnConfig[]]
  'cancel': []
}>()

// 對話框顯示狀態
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 是否支援寬度調整（Table 和 Gantt 視圖支援）
const supportsWidth = computed(() =>
  props.viewType === 'table' || props.viewType === 'gantt'
)

// 合併的欄位類型
interface MergedColumn extends ColumnConfig, FieldDefinition {
  fieldType: 'system' | 'custom'
}

// 本地欄位配置
const allColumns = ref<MergedColumn[]>([])
const originalColumns = ref<ColumnConfig[]>([])

// 統計資訊
const visibleCount = computed(() => {
  return allColumns.value.filter(col => col.visible).length
})

const totalCount = computed(() => {
  return allColumns.value.length
})

// 初始化欄位
function initializeColumns(): void {
  const mergedFields: MergedColumn[] = []

  // 建立欄位定義映射
  const fieldDefMap = new Map<string, FieldDefinition>()
  props.fieldDefinitions.forEach(def => {
    fieldDefMap.set(def.key, def)
  })

  // 處理現有配置
  props.columns.forEach(col => {
    const fieldDef = fieldDefMap.get(col.key)
    if (fieldDef) {
      const mergedColumn: MergedColumn = {
        ...fieldDef,
        ...col,
        width: col.width || fieldDef.defaultWidth,
        fieldType: fieldDef.type === 'system' ? 'system' : 'custom'
      }
      mergedFields.push(mergedColumn)
      // 從映射中移除已處理的欄位
      fieldDefMap.delete(col.key)
    }
  })

  // 添加未配置的欄位（新欄位）
  fieldDefMap.forEach(fieldDef => {
    const newColumn: MergedColumn = {
      ...fieldDef,
      key: fieldDef.key,
      label: fieldDef.label,
      visible: fieldDef.defaultVisible,
      width: fieldDef.defaultWidth,
      order: mergedFields.length,
      fieldType: fieldDef.type === 'system' ? 'system' : 'custom'
    }
    mergedFields.push(newColumn)
  })

  // 按 order 排序
  allColumns.value = mergedFields.sort((a, b) => (a.order || 0) - (b.order || 0))

  // 保存原始配置用於比較
  originalColumns.value = JSON.parse(JSON.stringify(props.columns))
}

// 檢查是否有變更
const hasChanges = computed(() => {
  const currentColumns = getAllColumns()
  return JSON.stringify(currentColumns) !== JSON.stringify(originalColumns.value)
})

// 取得所有欄位配置
function getAllColumns(): ColumnConfig[] {
  return allColumns.value.map((col, index) => ({
    key: col.key,
    label: col.label,
    visible: col.visible,
    width: col.width,
    order: index,
    required: col.required
  }))
}

// VueDraggable 事件處理
function onDragStart(event: any): void {
  // 檢查是否為必要欄位
  const draggedElement = event.item
  const isRequired = draggedElement?.classList.contains('column-required')
  
  if (isRequired) {
    // 阻止必要欄位的拖拽
    event.preventDefault()
    return false
  }
}

function onDragEnd(): void {
  // 拖拽結束後更新順序
  allColumns.value.forEach((col, index) => {
    col.order = index
  })
}

// 快速操作
function showAllColumns(): void {
  allColumns.value.forEach(col => {
    if (!col.required) {
      col.visible = true
    }
  })
}

function showRequiredOnly(): void {
  allColumns.value.forEach(col => {
    col.visible = col.required || false
  })
}

function resetColumnOrder(): void {
  // 重新初始化以恢復原始順序
  initializeColumns()
}

function restoreDefaults(): void {
  // 恢復預設配置
  allColumns.value.forEach(col => {
    col.visible = col.defaultVisible || col.required || false
    col.width = col.defaultWidth
  })
}

// 處理套用
function handleApply(): void {
  const allColumns = getAllColumns()
  emit('apply', allColumns)
  dialogVisible.value = false
}

// 處理取消
function handleCancel(): void {
  emit('cancel')
  dialogVisible.value = false
}

// 監聽欄位變化，重新初始化
watch(() => props.columns, () => {
  if (dialogVisible.value) {
    initializeColumns()
  }
}, { deep: true })
</script>

<style scoped lang="scss">
// 緊湊樣式設計
.compact-header {
  padding: 6px 12px;
}

.compact-info-section {
  padding: 4px 12px;
}

.compact-action-section {
  padding: 6px 12px;
}

.compact-btn {
  height: 24px;
  font-size: 11px;
  padding: 0 8px;
}

.column-list-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

// 緊湊的欄位項目
.column-item-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
  min-height: 24px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  margin-bottom: 2px;
  transition: all 0.15s ease;

  &:hover {
    background: #f8f8f8;
    border-color: #bdbdbd;
  }

  &.column-required {
    .drag-handle {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &.column-system {
    border-left: 2px solid #2196f3;
  }

  &.column-custom {
    border-left: 2px solid #9c27b0;
  }
}

// VueDraggable 拖拽效果
.column-ghost {
  opacity: 0.4;
  background: #f0f0f0;
}

.column-chosen {
  background: #e3f2fd !important;
  border-color: #2196f3 !important;
}

.column-drag {
  opacity: 0;
}

// 拖拽手柄
.drag-handle {
  display: flex;
  align-items: center;
  color: #9e9e9e;
  cursor: move;
  min-width: 16px;

  &:hover {
    color: #616161;
  }

  &.invisible {
    visibility: hidden;
  }
}

// 欄位資訊
.column-info {
  flex: 1;
  min-width: 0;

  .column-label {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .column-description {
    font-size: 10px;
    color: #757575;
    line-height: 1.1;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 緊湊徽章
.compact-badge {
  padding: 1px 4px;
  font-size: 9px;
  line-height: 1;
  min-height: 12px;
}

// 欄位設定
.column-settings {
  display: flex;
  align-items: center;
  gap: 8px;

  .width-input-compact {
    width: 80px;

    :deep(.q-field__control) {
      height: 24px;
      min-height: 24px;
    }

    :deep(input) {
      font-size: 11px;
      text-align: right;
      padding: 2px 4px;
    }

    :deep(.q-field__suffix) {
      font-size: 10px;
      padding: 0 2px;
    }
  }

  .width-placeholder {
    width: 80px;
  }
}

// 空狀態
.empty-state {
  padding: 24px;
}

// Quasar 覆寫
:deep(.q-dialog__inner) {
  padding: 16px;
}

:deep(.q-toggle) {
  &.q-toggle--xs {
    .q-toggle__inner {
      width: 28px;
      height: 16px;
    }
    
    .q-toggle__thumb {
      width: 12px;
      height: 12px;
    }
  }
}

:deep(.q-btn) {
  &.compact-btn {
    .q-btn__content {
      font-size: 11px;
    }
  }
}
</style>
