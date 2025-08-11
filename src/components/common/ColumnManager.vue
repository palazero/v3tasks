<template>
  <q-dialog v-model="dialogVisible" persistent @show="initializeColumns">
    <q-card style="min-width: 700px; max-width: 900px">
      <!-- 標題列 -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <q-icon name="view_column" size="sm" class="q-mr-sm" />
        <div class="text-h6">欄位管理</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- 說明文字 -->
      <q-card-section class="q-pt-sm q-pb-sm bg-grey-1">
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
      <q-card-section class="q-pt-sm q-pb-sm">
        <div class="row q-gutter-sm">
          <q-btn
            flat
            dense
            icon="visibility"
            label="全部顯示"
            size="sm"
            color="primary"
            @click="showAllColumns"
          />
          <q-btn
            flat
            dense
            icon="visibility_off"
            label="僅顯示必要"
            size="sm"
            @click="showRequiredOnly"
          />
          <q-btn
            flat
            dense
            icon="unfold_more"
            label="展開全部"
            size="sm"
            @click="expandAll = true"
          />
          <q-btn
            flat
            dense
            icon="unfold_less"
            label="收合全部"
            size="sm"
            @click="expandAll = false"
          />
          <q-separator vertical />
          <q-btn
            flat
            dense
            icon="refresh"
            label="重置順序"
            size="sm"
            @click="resetColumnOrder"
          />
          <q-btn
            flat
            dense
            icon="settings_backup_restore"
            label="恢復預設"
            size="sm"
            @click="restoreDefaults"
          />
        </div>
      </q-card-section>

      <q-separator />

      <!-- 欄位列表 -->
      <q-card-section class="column-list-container q-pa-sm">
        <!-- 系統欄位組 -->
        <q-expansion-item
          v-model="expandAll"
          icon="settings"
          label="系統欄位"
          header-class="text-subtitle1 text-weight-medium"
          class="q-mb-sm"
        >
          <transition-group name="drag-list" tag="div" class="column-list q-pa-sm">
            <div
              v-for="(column, index) in systemColumns"
              :key="column.key"
              class="column-item"
              :class="{
                'dragging': draggedIndex === index && draggedGroup === 'system',
                'drag-over': dragOverIndex === index && dragOverGroup === 'system',
                'disabled': column.required
              }"
              :draggable="!column.required"
              @dragstart="handleDragStart(index, 'system', $event)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver(index, 'system', $event)"
              @drop="handleDrop(index, 'system', $event)"
            >
              <!-- 拖拽手柄 -->
              <div class="drag-handle" :class="{ 'invisible': column.required }">
                <q-icon name="drag_indicator" size="sm" />
              </div>

              <!-- 欄位資訊 -->
              <div class="column-info">
                <div class="column-label">
                  {{ column.label }}
                  <q-badge v-if="column.required" color="orange" class="q-ml-xs">
                    必要
                  </q-badge>
                </div>
                <div class="column-key text-caption text-grey-6">
                  {{ column.description || column.key }}
                </div>
              </div>

              <!-- 欄位設定 -->
              <div class="column-settings">
                <!-- 寬度調整 -->
                <q-input
                  v-if="supportsWidth && !['actions', 'checkbox'].includes(column.key)"
                  :model-value="column.width"
                  @update:model-value="updateColumnWidth('system', index, $event)"
                  type="number"
                  dense
                  outlined
                  suffix="px"
                  class="width-input"
                  :min="column.minWidth || 10"
                  :max="column.maxWidth || 500"
                  step="10"
                />
                <div v-else-if="supportsWidth" class="width-placeholder"></div>

                <!-- 顯示切換 -->
                <q-toggle
                  :model-value="column.visible"
                  @update:model-value="toggleColumnVisibility('system', index, $event)"
                  :disable="column.required"
                  color="primary"
                  size="sm"
                />
              </div>
            </div>
          </transition-group>
        </q-expansion-item>

        <!-- 自訂欄位組 -->
        <q-expansion-item
          v-if="customColumns.length > 0"
          v-model="expandAll"
          icon="dashboard_customize"
          :label="`自訂欄位 (${customColumns.length})`"
          header-class="text-subtitle1 text-weight-medium"
        >
          <transition-group name="drag-list" tag="div" class="column-list q-pa-sm">
            <div
              v-for="(column, index) in customColumns"
              :key="column.key"
              class="column-item"
              :class="{
                'dragging': draggedIndex === index && draggedGroup === 'custom',
                'drag-over': dragOverIndex === index && dragOverGroup === 'custom',
                'disabled': column.required
              }"
              :draggable="!column.required"
              @dragstart="handleDragStart(index, 'custom', $event)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver(index, 'custom', $event)"
              @drop="handleDrop(index, 'custom', $event)"
            >
              <!-- 拖拽手柄 -->
              <div class="drag-handle" :class="{ 'invisible': column.required }">
                <q-icon name="drag_indicator" size="sm" />
              </div>

              <!-- 欄位資訊 -->
              <div class="column-info">
                <div class="column-label">
                  {{ column.label }}
                  <q-badge v-if="column.required" color="orange" class="q-ml-xs">
                    必要
                  </q-badge>
                  <q-badge color="purple" class="q-ml-xs">
                    自訂
                  </q-badge>
                </div>
                <div class="column-key text-caption text-grey-6">
                  {{ column.description || `類型: ${column.renderType}` }}
                </div>
              </div>

              <!-- 欄位設定 -->
              <div class="column-settings">
                <!-- 寬度調整 -->
                <q-input
                  v-if="supportsWidth"
                  :model-value="column.width"
                  @update:model-value="updateColumnWidth('custom', index, $event)"
                  type="number"
                  dense
                  outlined
                  suffix="px"
                  class="width-input"
                  :min="column.minWidth || 10"
                  :max="column.maxWidth || 500"
                  step="10"
                />
                <div v-else-if="supportsWidth" class="width-placeholder"></div>

                <!-- 顯示切換 -->
                <q-toggle
                  :model-value="column.visible"
                  @update:model-value="toggleColumnVisibility('custom', index, $event)"
                  :disable="column.required"
                  color="primary"
                  size="sm"
                />
              </div>
            </div>
          </transition-group>
        </q-expansion-item>

        <!-- 空狀態 -->
        <div v-if="!systemColumns.length && !customColumns.length" 
             class="empty-state text-center q-pa-lg">
          <q-icon name="view_column" size="48px" color="grey-5" />
          <div class="text-subtitle2 text-grey-6 q-mt-md">沒有可用的欄位</div>
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
import type { ColumnConfig } from '@/types'
import type { FieldDefinition } from '@/config/columnDefinitions'

// Props
interface ColumnManagerProps {
  modelValue: boolean
  viewType: 'table' | 'list' | 'gantt' | 'board'
  columns: ColumnConfig[]
  fieldDefinitions: FieldDefinition[]
}

const props = defineProps<ColumnManagerProps>()

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

// 本地欄位配置
const systemColumns = ref<(ColumnConfig & FieldDefinition)[]>([])
const customColumns = ref<(ColumnConfig & FieldDefinition)[]>([])
const originalColumns = ref<ColumnConfig[]>([])

// 拖拽狀態
const draggedIndex = ref<number | null>(null)
const draggedGroup = ref<'system' | 'custom' | null>(null)
const dragOverIndex = ref<number | null>(null)
const dragOverGroup = ref<'system' | 'custom' | null>(null)

// 展開/收合狀態
const expandAll = ref(true)

// 統計資訊
const visibleCount = computed(() => {
  return [...systemColumns.value, ...customColumns.value]
    .filter(col => col.visible).length
})

const totalCount = computed(() => {
  return systemColumns.value.length + customColumns.value.length
})

// 初始化欄位
function initializeColumns(): void {
  // 分離系統欄位和自訂欄位
  const systemFields: (ColumnConfig & FieldDefinition)[] = []
  const customFields: (ColumnConfig & FieldDefinition)[] = []
  
  // 建立欄位定義映射
  const fieldDefMap = new Map<string, FieldDefinition>()
  props.fieldDefinitions.forEach(def => {
    fieldDefMap.set(def.key, def)
  })
  
  // 處理現有配置
  props.columns.forEach(col => {
    const fieldDef = fieldDefMap.get(col.key)
    if (fieldDef) {
      const mergedColumn = {
        ...fieldDef,
        ...col,
        width: col.width || fieldDef.defaultWidth
      }
      
      if (fieldDef.type === 'system') {
        systemFields.push(mergedColumn)
      } else {
        customFields.push(mergedColumn)
      }
      
      // 從映射中移除已處理的欄位
      fieldDefMap.delete(col.key)
    }
  })
  
  // 添加未配置的欄位（新欄位）
  fieldDefMap.forEach(fieldDef => {
    const newColumn = {
      ...fieldDef,
      key: fieldDef.key,
      label: fieldDef.label,
      visible: fieldDef.defaultVisible,
      width: fieldDef.defaultWidth,
      order: fieldDef.type === 'system' ? systemFields.length : customFields.length
    }
    
    if (fieldDef.type === 'system') {
      systemFields.push(newColumn)
    } else {
      customFields.push(newColumn)
    }
  })
  
  // 排序
  systemColumns.value = systemFields.sort((a, b) => (a.order || 0) - (b.order || 0))
  customColumns.value = customFields.sort((a, b) => (a.order || 0) - (b.order || 0))
  
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
  const allColumns: ColumnConfig[] = []
  
  // 處理系統欄位
  systemColumns.value.forEach((col, index) => {
    allColumns.push({
      key: col.key,
      label: col.label,
      visible: col.visible,
      width: col.width,
      order: index,
      required: col.required
    })
  })
  
  // 處理自訂欄位（順序接續系統欄位）
  customColumns.value.forEach((col, index) => {
    allColumns.push({
      key: col.key,
      label: col.label,
      visible: col.visible,
      width: col.width,
      order: systemColumns.value.length + index,
      required: col.required
    })
  })
  
  return allColumns
}

// 拖拽處理
function handleDragStart(index: number, group: 'system' | 'custom', event: DragEvent): void {
  const column = group === 'system' ? systemColumns.value[index] : customColumns.value[index]
  if (column?.required) {
    event.preventDefault()
    return
  }
  
  draggedIndex.value = index
  draggedGroup.value = group
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${group}:${index}`)
  }
}

function handleDragEnd(): void {
  draggedIndex.value = null
  draggedGroup.value = null
  dragOverIndex.value = null
  dragOverGroup.value = null
}

function handleDragOver(index: number, group: 'system' | 'custom', event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
  dragOverGroup.value = group
}

function handleDrop(targetIndex: number, targetGroup: 'system' | 'custom', event: DragEvent): void {
  event.preventDefault()
  
  if (draggedIndex.value === null || draggedGroup.value === null) {
    return
  }
  
  // 不允許跨組拖拽
  if (draggedGroup.value !== targetGroup) {
    handleDragEnd()
    return
  }
  
  // 同位置不處理
  if (draggedIndex.value === targetIndex) {
    handleDragEnd()
    return
  }
  
  // 移動欄位
  const columns = targetGroup === 'system' ? systemColumns.value : customColumns.value
  const [movedColumn] = columns.splice(draggedIndex.value, 1)
  columns.splice(targetIndex, 0, movedColumn)
  
  // 更新順序
  columns.forEach((col, index) => {
    col.order = index
  })
  
  // 重置拖拽狀態
  handleDragEnd()
}

// 更新欄位寬度
function updateColumnWidth(group: 'system' | 'custom', index: number, width: string | number | null): void {
  const columns = group === 'system' ? systemColumns.value : customColumns.value
  if (width && columns[index]) {
    const numWidth = typeof width === 'string' ? parseInt(width) : width
    const column = columns[index]
    const minWidth = column.minWidth || 10
    const maxWidth = column.maxWidth || 500
    
    if (!isNaN(numWidth) && numWidth >= minWidth && numWidth <= maxWidth) {
      columns[index].width = numWidth
    }
  }
}

// 切換欄位顯示
function toggleColumnVisibility(group: 'system' | 'custom', index: number, visible: boolean): void {
  const columns = group === 'system' ? systemColumns.value : customColumns.value
  if (columns[index] && !columns[index].required) {
    columns[index].visible = visible
  }
}

// 快速操作
function showAllColumns(): void {
  [...systemColumns.value, ...customColumns.value].forEach(col => {
    if (!col.required) {
      col.visible = true
    }
  })
}

function showRequiredOnly(): void {
  [...systemColumns.value, ...customColumns.value].forEach(col => {
    col.visible = col.required || false
  })
}

function resetColumnOrder(): void {
  // 重新初始化以恢復原始順序
  initializeColumns()
}

function restoreDefaults(): void {
  // 恢復預設配置
  [...systemColumns.value, ...customColumns.value].forEach(col => {
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
.column-list-container {
  max-height: 500px;
  overflow-y: auto;
}

.column-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f5f5f5;
    border-color: #c0c0c0;
  }
  
  &.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }
  
  &.drag-over {
    background: #e3f2fd;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
  }
  
  &.disabled {
    cursor: default;
    
    .drag-handle {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
}

.drag-handle {
  display: flex;
  align-items: center;
  color: #757575;
  cursor: move;
  min-width: 24px;
  
  &:hover {
    color: #424242;
  }
  
  &.invisible {
    visibility: hidden;
  }
}

.column-info {
  flex: 1;
  min-width: 0;
  
  .column-label {
    font-weight: 500;
    line-height: 1.4;
    display: flex;
    align-items: center;
  }
  
  .column-key {
    line-height: 1.2;
    margin-top: 2px;
  }
}

.column-settings {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .width-input {
    width: 100px;
    
    :deep(.q-field__control) {
      height: 32px;
    }
    
    :deep(input) {
      text-align: right;
    }
  }
  
  .width-placeholder {
    width: 100px;
  }
}

.empty-state {
  padding: 48px 24px;
}

// 拖拽動畫
.drag-list-move {
  transition: transform 0.2s;
}

.drag-list-enter-active,
.drag-list-leave-active {
  transition: all 0.2s;
}

.drag-list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.drag-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

// Quasar 覆寫
:deep(.q-expansion-item__content) {
  padding: 0;
}

:deep(.q-badge) {
  padding: 2px 6px;
  font-size: 10px;
}
</style>