<template>
  <div class="task-table-view">
    <!-- 表格工具欄 -->
    <div class="table-toolbar q-pa-md bg-white border-bottom">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            dense
            icon="add"
            label="新增任務"
            color="primary"
            @click="$emit('add-task')"
          />
          <q-separator vertical />
          <q-btn
            flat
            dense
            icon="expand_more"
            label="全部展開"
            @click="expandAll"
          />
          <q-btn
            flat
            dense
            icon="expand_less"
            label="全部收合"
            @click="collapseAll"
          />
        </div>
        <div class="row items-center q-gutter-sm">
          <q-input
            v-model="searchQuery"
            dense
            outlined
            placeholder="搜尋任務..."
            style="width: 200px"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>
    </div>

    <!-- 表格主體 -->
    <div class="table-container">
      <q-table
        :rows="filteredTasks"
        :columns="tableColumns"
        row-key="taskId"
        flat
        square
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :table-style="{ minHeight: '400px' }"
        class="task-table"
      >
        <!-- 任務標題欄（支援樹狀結構） -->
        <template v-slot:body-cell-title="props">
          <q-td :props="props" class="task-title-cell">
            <div 
              class="task-title-wrapper"
              :style="{ paddingLeft: `${(props.row.level || 0) * 24}px` }"
            >
              <!-- 展開/收合按鈕 -->
              <q-btn
                v-if="hasChildren(props.row)"
                :icon="props.row.isExpanded ? 'expand_more' : 'chevron_right'"
                flat
                dense
                size="sm"
                @click="toggleExpanded(props.row)"
                class="expand-btn"
              />
              <div v-else class="expand-btn-spacer" />

              <!-- 任務標題（行內編輯） -->
              <div 
                v-if="!isEditing(props.row.taskId, 'title')"
                class="task-title-display cursor-pointer"
                @click="startEdit(props.row.taskId, 'title', props.row.title)"
              >
                {{ props.row.title }}
              </div>
              <q-input
                v-else
                v-model="editingValue"
                dense
                autofocus
                @blur="saveEdit(props.row.taskId, 'title')"
                @keyup.enter="saveEdit(props.row.taskId, 'title')"
                @keyup.esc="cancelEdit"
                class="task-title-input"
              />
            </div>
          </q-td>
        </template>

        <!-- 狀態欄 -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs no-wrap">
              <!-- 快速切換按鈕 -->
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="getStatusIcon(props.row.statusId)"
                :color="getStatusColor(props.row.statusId)"
                @click="cycleStatus(props.row)"
                class="status-btn"
              >
                <q-tooltip>{{ getStatusLabel(props.row.statusId) }} (點擊切換)</q-tooltip>
              </q-btn>
              
              <!-- 下拉選單（備選） -->
              <q-select
                :model-value="props.row.statusId"
                :options="statusOptions"
                emit-value
                map-options
                dense
                borderless
                @update:model-value="updateTask(props.row.taskId, { statusId: $event })"
                class="status-select"
                style="min-width: 80px;"
              >
                <template v-slot:selected>
                  <span class="text-caption">{{ getStatusLabel(props.row.statusId) }}</span>
                </template>
              </q-select>
            </div>
          </q-td>
        </template>

        <!-- 指派人員欄 -->
        <template v-slot:body-cell-assignee="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.assigneeId"
              :options="assigneeOptions"
              emit-value
              map-options
              dense
              outlined
              clearable
              @update:model-value="updateTask(props.row.taskId, { assigneeId: $event })"
              class="assignee-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs">
                  <q-avatar size="20px" color="primary" text-color="white">
                    {{ getUserInitials(scope.opt.value) }}
                  </q-avatar>
                  <span>{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 優先級欄 -->
        <template v-slot:body-cell-priority="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.priorityId"
              :options="priorityOptions"
              emit-value
              map-options
              dense
              outlined
              @update:model-value="updateTask(props.row.taskId, { priorityId: $event })"
              class="priority-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs">
                  <q-icon
                    :name="getPriorityIcon(scope.opt.value)"
                    :color="getPriorityColor(scope.opt.value)"
                    size="sm"
                  />
                  <span>{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 截止日期欄 -->
        <template v-slot:body-cell-deadline="props">
          <q-td :props="props">
            <q-input
              :model-value="formatDateForInput(props.row.endDateTime)"
              type="datetime-local"
              dense
              outlined
              @update:model-value="updateTaskDate(props.row.taskId, $event)"
              class="deadline-input"
            />
          </q-td>
        </template>

        <!-- 進度欄 -->
        <template v-slot:body-cell-progress="props">
          <q-td :props="props">
            <div class="progress-cell">
              <q-slider
                :model-value="props.row.progress || 0"
                :min="0"
                :max="100"
                :step="10"
                label
                label-always
                @update:model-value="$event != null && updateTask(props.row.taskId, { progress: $event })"
                class="progress-slider"
              />
            </div>
          </q-td>
        </template>

        <!-- 建立者欄 -->
        <template v-slot:body-cell-creator="props">
          <q-td :props="props">
            <div class="row items-center justify-center q-gutter-xs">
              <q-avatar size="24px" color="primary" text-color="white">
                {{ getUserInitials(props.row.creatorId) }}
              </q-avatar>
              <span class="text-caption">{{ getUserName(props.row.creatorId) }}</span>
            </div>
          </q-td>
        </template>

        <!-- 建立時間欄 -->
        <template v-slot:body-cell-createdAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.createdAt) }}
            </div>
          </q-td>
        </template>

        <!-- 更新時間欄 -->
        <template v-slot:body-cell-updatedAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.updatedAt) }}
            </div>
          </q-td>
        </template>

        <!-- 自訂欄位欄 -->
        <template 
          v-for="field in visibleCustomFields" 
          :key="`custom_${field.fieldId}`"
          #[`body-cell-custom_${field.fieldId}`]="props"
        >
          <q-td :props="props">
            <CustomFieldRenderer
              :field="field"
              :value="getCustomFieldValue(props.row.customFields, field.fieldId)"
              :readonly="true"
              :show-label="false"
              :show-help="false"
              dense
            />
          </q-td>
        </template>

        <!-- 操作欄 -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-xs">
              <q-btn
                flat
                dense
                icon="add"
                size="sm"
                color="primary"
                @click="addSubtask(props.row)"
              >
                <q-tooltip>新增子任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="edit"
                size="sm"
                color="orange"
                @click="editTask(props.row)"
              >
                <q-tooltip>編輯任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="delete"
                size="sm"
                color="negative"
                @click="deleteTask(props.row)"
              >
                <q-tooltip>刪除任務</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Task, View, ViewConfiguration, FilterCondition } from '@/types'
import { useNestedTasks } from '@/composables/useNestedTasks'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCustomFields, useCustomFieldUtils } from '@/composables/useCustomFields'
import CustomFieldRenderer from '@/components/fields/CustomFieldRenderer.vue'

// Props
const props = defineProps<{
  view: View
  tasks: Task[]
  projectId: string
  configuration?: ViewConfiguration
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
  'add-task': []
  'add-subtask': [parentTask: Task]
  'edit-task': [task: Task]
  'delete-task': [task: Task]
}>()

const { buildTaskTree } = useNestedTasks()
const { availableUsers } = useCurrentUser()
const { visibleFields: visibleCustomFields } = useCustomFields(props.projectId)
const { getCustomFieldDisplayValue, getCustomFieldValue } = useCustomFieldUtils()

// 搜尋查詢
const searchQuery = ref('')

// 行內編輯狀態
const editingCell = ref<{ taskId: string; field: string } | null>(null)
const editingValue = ref('')

// 所有可用欄位定義
const availableColumns = [
  {
    name: 'title',
    required: true,
    label: '任務標題',
    align: 'left' as const,
    field: 'title',
    sortable: true,
    style: 'width: 300px'
  },
  {
    name: 'status',
    label: '狀態',
    align: 'center' as const,
    field: 'statusId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'assignee',
    label: '指派人員',
    align: 'center' as const,
    field: 'assigneeId',
    sortable: true,
    style: 'width: 150px'
  },
  {
    name: 'priority',
    label: '優先級',
    align: 'center' as const,
    field: 'priorityId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'deadline',
    label: '截止日期',
    align: 'center' as const,
    field: 'endDateTime',
    sortable: true,
    style: 'width: 180px'
  },
  {
    name: 'progress',
    label: '進度',
    align: 'center' as const,
    field: 'progress',
    sortable: true,
    style: 'width: 150px'
  },
  {
    name: 'creator',
    label: '建立者',
    align: 'center' as const,
    field: 'creatorId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'createdAt',
    label: '建立時間',
    align: 'center' as const,
    field: 'createdAt',
    sortable: true,
    style: 'width: 160px'
  },
  {
    name: 'updatedAt',
    label: '更新時間',
    align: 'center' as const,
    field: 'updatedAt',
    sortable: true,
    style: 'width: 160px'
  },
  {
    name: 'actions',
    label: '操作',
    align: 'center' as const,
    field: 'actions',
    style: 'width: 150px'
  }
]

// 表格欄位定義（根據配置篩選）
const tableColumns = computed(() => {
  let systemColumns = availableColumns
  
  if (!props.configuration?.visibleColumns) {
    // 預設顯示的欄位
    systemColumns = availableColumns.filter(col => 
      ['title', 'status', 'assignee', 'priority', 'deadline', 'progress', 'actions'].includes(col.name)
    )
  } else {
    // 根據配置顯示欄位
    const visibleColumnKeys = props.configuration.visibleColumns
      .filter(col => col.visible)
      .map(col => col.key)
    
    systemColumns = availableColumns.filter(col => 
      visibleColumnKeys.includes(col.name) || col.name === 'actions'
    )
    
    // 套用自訂寬度
    systemColumns = systemColumns.map(col => {
      const configCol = props.configuration?.visibleColumns?.find(c => c.key === col.name)
      return {
        ...col,
        style: configCol?.width ? `width: ${configCol.width}px` : col.style
      }
    })
  }

  // 添加自訂欄位欄
  const customFieldColumns = visibleCustomFields.value.map(field => ({
    name: `custom_${field.fieldId}`,
    label: field.name,
    align: 'left' as const,
    field: (row: Task): string => getCustomFieldDisplayValue(row.customFields, field.fieldId),
    sortable: true,
    style: `width: ${field.type === 'text' ? '200' : '150'}px`
  }))

  // 找到 actions 欄位的索引
  const actionsIndex = systemColumns.findIndex(col => col.name === 'actions')
  
  if (actionsIndex >= 0) {
    // 在 actions 欄位前插入自訂欄位
    return [
      ...systemColumns.slice(0, actionsIndex),
      ...customFieldColumns,
      ...systemColumns.slice(actionsIndex)
    ]
  } else {
    // 如果沒有 actions 欄位，直接添加到最後
    return [...systemColumns, ...customFieldColumns]
  }
})

// 狀態選項
const statusOptions = [
  { label: '待辦', value: 'todo' },
  { label: '進行中', value: 'inProgress' },
  { label: '已完成', value: 'done' }
]

// 指派人員選項
const assigneeOptions = computed(() => 
  availableUsers.value.map(user => ({
    label: user.name,
    value: user.userId
  }))
)

// 優先級選項
const priorityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '緊急', value: 'urgent' }
]

// 樹狀結構任務
const nestedTasks = computed(() => buildTaskTree(props.tasks))

// 篩選後的任務（扁平化顯示，但保留層級信息）
const filteredTasks = computed(() => {
  const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
    const result: Task[] = []
    
    tasks.forEach(task => {
      const taskWithLevel = { ...task, level }
      
      // 基本搜尋篩選
      let passesSearch = true
      if (searchQuery.value) {
        passesSearch = task.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      }
      
      // 配置篩選
      let passesConfigFilters = true
      if (props.configuration?.filters && props.configuration.filters.length > 0) {
        passesConfigFilters = props.configuration.filters.every(filter => {
          return applyFilter(task, filter)
        })
      }
      
      // 隱藏已完成任務篩選
      let passesCompletedFilter = true
      if (props.configuration?.hideCompleted && task.statusId === 'done') {
        passesCompletedFilter = false
      }
      
      if (passesSearch && passesConfigFilters && passesCompletedFilter) {
        result.push(taskWithLevel)
      }
      
      // 如果有子任務且展開
      if (task.children && task.children.length > 0 && task.isExpanded) {
        result.push(...flattenWithLevel(task.children, level + 1))
      }
    })
    
    return result
  }
  
  let result = flattenWithLevel(nestedTasks.value)
  
  // 排序
  if (props.configuration?.sortBy) {
    result = applySorting(result, props.configuration.sortBy, props.configuration.sortOrder || 'asc')
  }
  
  return result
})

// 是否有子任務
function hasChildren(task: Task): boolean {
  return !!(task.children && task.children.length > 0)
}

// 切換展開狀態
function toggleExpanded(task: Task): void {
  emit('task-update', task.taskId, { isExpanded: !task.isExpanded })
}

// 全部展開
function expandAll(): void {
  props.tasks.forEach(task => {
    if (hasChildren(task) && !task.isExpanded) {
      emit('task-update', task.taskId, { isExpanded: true })
    }
  })
}

// 全部收合
function collapseAll(): void {
  props.tasks.forEach(task => {
    if (hasChildren(task) && task.isExpanded) {
      emit('task-update', task.taskId, { isExpanded: false })
    }
  })
}

// 行內編輯相關
function isEditing(taskId: string, field: string): boolean {
  return editingCell.value?.taskId === taskId && editingCell.value?.field === field
}

function startEdit(taskId: string, field: string, currentValue: string): void {
  editingCell.value = { taskId, field }
  editingValue.value = currentValue
}

function saveEdit(taskId: string, field: string): void {
  if (editingValue.value !== undefined && editingValue.value !== null) {
    emit('task-update', taskId, { [field]: editingValue.value })
  }
  cancelEdit()
}

function cancelEdit(): void {
  editingCell.value = null
  editingValue.value = ''
}

// 更新任務
function updateTask(taskId: string, updates: Partial<Task>): void {
  emit('task-update', taskId, updates)
}

// 狀態相關函數
function getStatusIcon(statusId: string): string {
  const iconMap: Record<string, string> = {
    todo: 'radio_button_unchecked',
    inProgress: 'play_circle',
    done: 'check_circle',
    cancelled: 'cancel'
  }
  return iconMap[statusId] || 'radio_button_unchecked'
}

function getStatusColor(statusId: string): string {
  const colorMap: Record<string, string> = {
    todo: 'grey',
    inProgress: 'blue',
    done: 'green',
    cancelled: 'red'
  }
  return colorMap[statusId] || 'grey'
}

function getStatusLabel(statusId: string): string {
  const labelMap: Record<string, string> = {
    todo: '待辦',
    inProgress: '進行中',
    done: '已完成',
    cancelled: '已取消'
  }
  return labelMap[statusId] || '待辦'
}

function cycleStatus(task: Task): void {
  const statusCycle = ['todo', 'inProgress', 'done']
  const currentIndex = statusCycle.indexOf(task.statusId || 'todo')
  const nextIndex = (currentIndex + 1) % statusCycle.length
  const newStatus = statusCycle[nextIndex]
  
  updateTask(task.taskId, { statusId: newStatus })
}

// 更新日期
function updateTaskDate(taskId: string, dateString: string | number | null): void {
  const date = dateString ? new Date(dateString) : null
  emit('task-update', taskId, { endDateTime: date })
}

// 格式化日期給輸入框使用
function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm 格式
}

// 取得優先級圖標
function getPriorityIcon(priority: string): string {
  const icons = {
    'urgent': 'keyboard_double_arrow_up',
    'high': 'keyboard_arrow_up',
    'medium': 'remove',
    'low': 'keyboard_arrow_down'
  }
  return icons[priority as keyof typeof icons] || 'remove'
}

// 取得優先級顏色
function getPriorityColor(priority: string): string {
  const colors = {
    'urgent': 'red',
    'high': 'orange', 
    'medium': 'grey',
    'low': 'blue'
  }
  return colors[priority as keyof typeof colors] || 'grey'
}

// 取得用戶姓名縮寫
function getUserInitials(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '??'
  }
  
  const user = availableUsers.value.find(u => u.userId === userId)
  
  if (user && user.name && user.name.length > 0) {
    return user.name.substring(0, 2).toUpperCase()
  }
  
  // 如果沒有找到用戶或用戶名為空，使用 userId 的前兩個字符
  if (userId.length > 0) {
    return userId.substring(0, 2).toUpperCase()
  }
  
  return '??'
}

// 取得用戶姓名
function getUserName(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '未指派'
  }
  
  const user = availableUsers.value.find(u => u.userId === userId)
  return user && user.name ? user.name : userId
}

// 格式化日期時間
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 套用篩選條件
function applyFilter(task: Task, filter: FilterCondition): boolean {
  const fieldValue = getTaskFieldValue(task, filter.field)
  
  if (filter.operator === 'equals') {
    return fieldValue === filter.value
  } else if (filter.operator === 'notEquals') {
    return fieldValue !== filter.value
  } else if (filter.operator === 'contains') {
    if (typeof fieldValue === 'string' && typeof filter.value === 'string') {
      return fieldValue.toLowerCase().includes(filter.value.toLowerCase())
    }
    return false
  } else if (filter.operator === 'notContains') {
    if (typeof fieldValue === 'string' && typeof filter.value === 'string') {
      return !fieldValue.toLowerCase().includes(filter.value.toLowerCase())
    }
    return true
  }
  
  return true
}

// 取得任務欄位值
function getTaskFieldValue(task: Task, field: string): string | number | Date | null {
  const fieldMap: Record<string, string | number | Date | null> = {
    'title': task.title,
    'statusId': task.statusId,
    'assigneeId': task.assigneeId || null,
    'priorityId': task.priorityId || null,
    'creatorId': task.creatorId,
    'createdAt': task.createdAt,
    'updatedAt': task.updatedAt,
    'endDateTime': task.endDateTime || null,
    'startDateTime': task.startDateTime || null,
    'progress': task.progress || 0
  }
  
  return fieldMap[field] || null
}

// 套用排序
function applySorting(tasks: Task[], sortBy: string, sortOrder: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    const aValue = getTaskFieldValue(a, sortBy)
    const bValue = getTaskFieldValue(b, sortBy)
    
    // 處理 null/undefined 值
    if (aValue === null && bValue === null) return 0
    if (aValue === null) return sortOrder === 'asc' ? 1 : -1
    if (bValue === null) return sortOrder === 'asc' ? -1 : 1
    
    let comparison = 0
    if (aValue < bValue) {
      comparison = -1
    } else if (aValue > bValue) {
      comparison = 1
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

// 操作功能
function addSubtask(parentTask: Task): void {
  emit('add-subtask', parentTask)
}

function editTask(task: Task): void {
  emit('edit-task', task)
}

function deleteTask(task: Task): void {
  emit('delete-task', task)
}
</script>

<style scoped lang="scss">
.task-table-view {
  background-color: $grey-1;

  .table-toolbar {
    border-bottom: 1px solid $grey-4;
  }

  .table-container {
    .task-table {
      background-color: white;
      
      :deep(.q-table__top) {
        padding: 0;
      }

      :deep(thead) {
        th {
          position: sticky;
          top: 0;
          background-color: $grey-2;
          font-weight: 600;
          border-bottom: 2px solid $grey-4;
        }
      }

      :deep(tbody) {
        tr {
          &:hover {
            background-color: $grey-1;
          }

          td {
            padding: 8px 12px;
            border-bottom: 1px solid $grey-3;
          }
        }
      }

      .task-title-cell {
        .task-title-wrapper {
          display: flex;
          align-items: center;
          
          .expand-btn {
            min-width: 24px;
          }
          
          .expand-btn-spacer {
            width: 24px;
          }
          
          .task-title-display {
            flex: 1;
            padding: 4px 8px;
            border-radius: 4px;
            
            &:hover {
              background-color: $grey-2;
            }
          }
          
          .task-title-input {
            flex: 1;
          }
        }
      }

      .status-select,
      .assignee-select,
      .priority-select {
        min-width: 100px;
        
        :deep(.q-field__control) {
          min-height: 32px;
        }
      }

      .deadline-input {
        min-width: 160px;
        
        :deep(.q-field__control) {
          min-height: 32px;
        }
      }

      .progress-cell {
        padding: 8px 16px;
        
        .progress-slider {
          width: 120px;
        }
      }
    }
  }
}
</style>