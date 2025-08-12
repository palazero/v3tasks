<template>
  <q-dialog
    v-model="isDialogOpen"
    position="right"
    :maximized="$q.screen.lt.md"
    class="view-config-dialog"
  >
    <q-card class="view-config-card" style="width: 400px; max-width: 90vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">視圖配置</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-md">
        <!-- 視圖類型選擇 -->
        <div class="config-section q-mb-lg">
          <div class="text-subtitle1 q-mb-md">視圖類型</div>
          <q-option-group
            v-model="localConfig.viewType"
            :options="viewTypeOptions"
            color="primary"
            inline
            @update:model-value="onConfigChange"
          />
        </div>

        <!-- 表格視圖欄位配置 -->
        <div v-if="localConfig.viewType === 'table'" class="config-section q-mb-lg">
          <div class="text-subtitle1 q-mb-md">顯示欄位</div>
          <div class="column-config">
            <VueDraggable
              :model-value="localConfig.visibleColumns || []"
              @update:model-value="(value: NonNullable<ViewConfiguration['visibleColumns']>) => updateVisibleColumns(value)"
              :animation="200"
              ghost-class="column-ghost"
              handle=".column-handle"
              @change="onConfigChange"
            >
              <template #item="{ element: column }">
                <div class="column-item row items-center q-pa-sm q-mb-xs">
                  <q-icon
                    name="drag_indicator"
                    class="column-handle cursor-pointer text-grey-6 q-mr-sm"
                  />
                  <q-checkbox
                    :model-value="column.visible"
                    @update:model-value="toggleColumnVisible(column.key, $event)"
                    color="primary"
                    class="q-mr-sm"
                  />
                  <div class="column-info flex-1">
                    <div class="column-label">{{ column.label }}</div>
                    <div class="column-description text-caption text-grey-6">
                      {{ column.description }}
                    </div>
                  </div>
                  <q-input
                    v-if="column.visible"
                    v-model="column.width"
                    type="number"
                    dense
                    outlined
                    suffix="px"
                    style="width: 80px"
                    @update:model-value="onConfigChange"
                    class="q-ml-sm"
                  />
                </div>
              </template>
            </VueDraggable>
          </div>
        </div>

        <!-- 篩選器配置 -->
        <div class="config-section q-mb-lg">
          <div class="text-subtitle1 q-mb-md">篩選條件</div>
          <div class="filter-list">
            <div
              v-for="(filter, index) in localConfig.filters"
              :key="`filter-${index}`"
              class="filter-item q-pa-sm q-mb-sm bg-grey-1 rounded-borders"
            >
              <div class="row items-center q-gutter-sm">
                <q-select
                  v-model="filter.field"
                  :options="filterFieldOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  style="min-width: 100px"
                  @update:model-value="onConfigChange"
                />
                <q-select
                  v-model="filter.operator"
                  :options="getOperatorOptions(filter.field)"
                  emit-value
                  map-options
                  dense
                  outlined
                  style="min-width: 80px"
                  @update:model-value="onConfigChange"
                />
                <q-input
                  v-if="!isSelectField(filter.field)"
                  v-model="filter.value as string"
                  dense
                  outlined
                  placeholder="篩選值"
                  style="min-width: 100px"
                  @update:model-value="onConfigChange"
                />
                <q-select
                  v-else
                  v-model="filter.value"
                  :options="getFieldValueOptions(filter.field)"
                  emit-value
                  map-options
                  dense
                  outlined
                  placeholder="選擇值"
                  style="min-width: 100px"
                  @update:model-value="onConfigChange"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  size="sm"
                  @click="removeFilter(index)"
                />
              </div>
            </div>

            <q-btn
              flat
              dense
              icon="add"
              label="新增篩選條件"
              color="primary"
              @click="addFilter"
            />
          </div>
        </div>

        <!-- 排序配置 -->
        <div class="config-section q-mb-lg">
          <div class="text-subtitle1 q-mb-md">排序方式</div>
          <div class="row items-center q-gutter-sm">
            <q-select
              v-model="localConfig.sortBy"
              :options="sortFieldOptions"
              emit-value
              map-options
              dense
              outlined
              placeholder="選擇排序欄位"
              style="min-width: 150px"
              @update:model-value="onConfigChange"
            />
            <q-select
              v-model="localConfig.sortOrder"
              :options="sortOrderOptions"
              emit-value
              map-options
              dense
              outlined
              style="min-width: 100px"
              @update:model-value="onConfigChange"
            />
          </div>
        </div>

        <!-- 視圖預設 -->
        <div class="config-section">
          <div class="text-subtitle1 q-mb-md">預設配置</div>
          <div class="row q-gutter-sm">
            <q-select
              v-model="selectedPreset"
              :options="presetOptions"
              emit-value
              map-options
              dense
              outlined
              placeholder="選擇預設"
              style="min-width: 120px"
              @update:model-value="loadPreset"
            />
            <q-btn
              flat
              dense
              icon="save"
              label="儲存為預設"
              color="primary"
              @click="showSavePresetDialog"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="重設" color="grey" @click="resetToDefault" />
        <q-btn flat label="取消" color="grey" v-close-popup />
        <q-btn unelevated label="套用" color="primary" @click="applyConfig" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- 儲存預設對話框 -->
  <q-dialog v-model="showSaveDialog">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">儲存預設配置</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="presetName"
          dense
          outlined
          placeholder="輸入預設名稱"
          autofocus
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" color="grey" v-close-popup />
        <q-btn flat label="儲存" color="primary" @click="savePreset" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useQuasar } from 'quasar'
import type { ViewConfiguration } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'

// Props
const props = defineProps<{
  modelValue: boolean
  configuration: ViewConfiguration
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:configuration': [config: ViewConfiguration]
}>()

const $q = useQuasar()
const { availableUsers } = useCurrentUser()

// 對話框狀態
const isDialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 本地配置副本
const localConfig = ref<ViewConfiguration>({ ...props.configuration })

// 預設相關
const showSaveDialog = ref(false)
const presetName = ref('')
const selectedPreset = ref<string>('')

// 視圖類型選項
const viewTypeOptions = [
  { label: '列表', value: 'list' },
  { label: '表格', value: 'table' },
  { label: '看板', value: 'board' },
  { label: '甘特圖', value: 'gantt' }
]

// 可用欄位定義
const availableColumns = [
  { key: 'title', label: '任務標題', description: '任務的標題名稱', width: 200, visible: true },
  { key: 'status', label: '狀態', description: '任務當前狀態', width: 80, visible: true },
  { key: 'assignee', label: '指派人員', description: '負責執行任務的人員', width: 100, visible: true },
  { key: 'priority', label: '優先級', description: '任務重要程度', width: 80, visible: true },
  { key: 'deadline', label: '截止日期', description: '任務完成期限', width: 120, visible: true },
  { key: 'progress', label: '進度', description: '任務完成百分比', width: 100, visible: true },
  { key: 'creator', label: '建立者', description: '建立任務的人員', width: 80, visible: false },
  { key: 'createdAt', label: '建立時間', description: '任務建立日期', width: 120, visible: false },
  { key: 'updatedAt', label: '更新時間', description: '最後修改日期', width: 120, visible: false },
  { key: 'tags', label: '標籤', description: '任務分類標籤', width: 120, visible: false },
  { key: 'estimatedHours', label: '預估時數', description: '完成任務預估時間', width: 120, visible: false }
]

// 初始化本地配置的可見欄位
if (!localConfig.value.visibleColumns || localConfig.value.visibleColumns.length === 0) {
  localConfig.value.visibleColumns = [...availableColumns]
}

// 篩選欄位選項
const filterFieldOptions = [
  { label: '任務標題', value: 'title' },
  { label: '狀態', value: 'statusId' },
  { label: '指派人員', value: 'assigneeId' },
  { label: '優先級', value: 'priorityId' },
  { label: '建立者', value: 'creatorId' },
  { label: '標籤', value: 'tags' }
]

// 排序欄位選項
const sortFieldOptions = [
  { label: '任務標題', value: 'title' },
  { label: '狀態', value: 'statusId' },
  { label: '優先級', value: 'priorityId' },
  { label: '截止日期', value: 'endDateTime' },
  { label: '建立時間', value: 'createdAt' },
  { label: '更新時間', value: 'updatedAt' },
  { label: '排序', value: 'order' }
]

// 排序方向選項
const sortOrderOptions = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' }
]

// 預設配置選項
const presetOptions = computed(() => [
  { label: '預設視圖', value: 'default' },
  { label: '簡潔視圖', value: 'minimal' },
  { label: '詳細視圖', value: 'detailed' },
  { label: '專案管理', value: 'project-management' }
])

// 監聽配置變化
watch(() => props.configuration, (newConfig) => {
  localConfig.value = { ...newConfig }
  if (!localConfig.value.visibleColumns || localConfig.value.visibleColumns.length === 0) {
    localConfig.value.visibleColumns = [...availableColumns]
  }
}, { deep: true })

// 更新可見欄位
function updateVisibleColumns(columns: NonNullable<ViewConfiguration['visibleColumns']>): void {
  localConfig.value.visibleColumns = columns
  onConfigChange()
}

// 切換欄位顯示
function toggleColumnVisible(columnKey: string, visible: boolean): void {
  const column = localConfig.value.visibleColumns?.find(col => col.key === columnKey)
  if (column) {
    column.visible = visible
    onConfigChange()
  }
}

// 新增篩選條件
function addFilter(): void {
  if (!localConfig.value.filters) {
    localConfig.value.filters = []
  }

  localConfig.value.filters.push({
    field: 'title',
    operator: 'contains',
    value: ''
  })

  onConfigChange()
}

// 移除篩選條件
function removeFilter(index: number): void {
  if (localConfig.value.filters) {
    localConfig.value.filters.splice(index, 1)
    onConfigChange()
  }
}

// 取得運算子選項
function getOperatorOptions(field: string): Array<{ label: string; value: string }> {
  if (field === 'title' || field === 'tags') {
    return [
      { label: '包含', value: 'contains' },
      { label: '不包含', value: 'notContains' },
      { label: '等於', value: 'equals' },
      { label: '不等於', value: 'notEquals' }
    ]
  } else if (field === 'statusId' || field === 'assigneeId' || field === 'priorityId' || field === 'creatorId') {
    return [
      { label: '等於', value: 'equals' },
      { label: '不等於', value: 'notEquals' }
    ]
  }
  return []
}

// 是否為選擇類型欄位
function isSelectField(field: string): boolean {
  return ['statusId', 'assigneeId', 'priorityId', 'creatorId'].includes(field)
}

// 取得欄位值選項
function getFieldValueOptions(field: string): Array<{ label: string; value: string }> {
  if (field === 'statusId') {
    return [
      { label: '待辦', value: 'todo' },
      { label: '進行中', value: 'inProgress' },
      { label: '已完成', value: 'done' }
    ]
  } else if (field === 'assigneeId' || field === 'creatorId') {
    return availableUsers.value.map(user => ({
      label: user.name,
      value: user.userId
    }))
  } else if (field === 'priorityId') {
    return [
      { label: '低', value: 'low' },
      { label: '中', value: 'medium' },
      { label: '高', value: 'high' },
      { label: '緊急', value: 'urgent' }
    ]
  }
  return []
}

// 載入預設配置
function loadPreset(presetKey: string): void {
  if (presetKey === 'default') {
    localConfig.value = {
      viewType: 'table',
      visibleColumns: availableColumns.map(col => ({ ...col, visible: ['title', 'status', 'assignee', 'priority', 'deadline', 'progress'].includes(col.key) })),
      filters: [],
      sortBy: 'order',
      sortOrder: 'asc'
    }
  } else if (presetKey === 'minimal') {
    localConfig.value = {
      viewType: 'list',
      visibleColumns: availableColumns.map(col => ({ ...col, visible: ['title', 'status'].includes(col.key) })),
      filters: [],
      sortBy: 'title',
      sortOrder: 'asc'
    }
  } else if (presetKey === 'detailed') {
    localConfig.value = {
      viewType: 'table',
      visibleColumns: availableColumns.map(col => ({ ...col, visible: true })),
      filters: [],
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  } else if (presetKey === 'project-management') {
    localConfig.value = {
      viewType: 'gantt',
      visibleColumns: availableColumns.map(col => ({ ...col, visible: ['title', 'assignee', 'deadline', 'progress'].includes(col.key) })),
      filters: [],
      sortBy: 'deadline',
      sortOrder: 'asc'
    }
  }

  onConfigChange()
}

// 顯示儲存預設對話框
function showSavePresetDialog(): void {
  presetName.value = ''
  showSaveDialog.value = true
}

// 儲存預設
function savePreset(): void {
  if (!presetName.value.trim()) {
    $q.notify({
      type: 'warning',
      message: '請輸入預設名稱'
    })
    return
  }

  // TODO: 實作儲存到 IndexedDB
  $q.notify({
    type: 'positive',
    message: `預設「${presetName.value}」已儲存`
  })

  showSaveDialog.value = false
}

// 重設為預設值
function resetToDefault(): void {
  loadPreset('default')
}

// 配置變更通知
function onConfigChange(): void {
  emit('update:configuration', localConfig.value)
}

// 套用配置
function applyConfig(): void {
  emit('update:configuration', localConfig.value)
  isDialogOpen.value = false

  $q.notify({
    type: 'positive',
    message: '視圖配置已套用',
    position: 'top'
  })
}
</script>

<style scoped lang="scss">
.view-config-card {
  .config-section {
    .text-subtitle1 {
      color: $grey-8;
      font-weight: 600;
    }
  }

  .column-config {
    .column-item {
      background-color: white;
      border-radius: $border-radius;
      border: 1px solid $grey-4;
      transition: all 0.2s ease;

      &:hover {
        border-color: $primary;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .column-handle {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }

      .column-label {
        font-weight: 500;
      }
    }

    .column-ghost {
      opacity: 0.5;
      background-color: $primary;
      color: white;
    }
  }

  .filter-item {
    border: 1px solid $grey-4;

    &:hover {
      border-color: $grey-5;
    }
  }
}
</style>
