<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    max-width="700px"
    transition-show="slide-up"
    transition-hide="slide-down"
    class="task-dialog-wrapper"
  >
    <q-card class="task-edit-dialog">
      <!-- Enhanced Header -->
      <q-card-section class="dialog-header">
        <div class="row items-center no-wrap">
          <q-icon
            :name="mode === 'create' ? 'add_task' : mode === 'duplicate' ? 'content_copy' : 'edit'"
            size="24px"
            :color="mode === 'create' ? 'positive' : mode === 'duplicate' ? 'warning' : 'primary'"
            class="q-mr-sm"
          />
          <div>
            <div class="text-subtitle1 text-weight-medium">
              {{ mode === 'create' ? '新增任務' : mode === 'duplicate' ? '複製任務' : '編輯任務' }}
            </div>
            <div v-if="mode === 'edit' && task" class="text-caption text-grey-6 q-mt-xs" style="font-size: 10px;">
              任務ID: {{ task.taskId }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup class="close-btn" />
        </div>
      </q-card-section>

      <!-- Progress Indicator -->
      <q-linear-progress
        v-if="isSubmitting"
        indeterminate
        color="primary"
        class="loading-bar"
      />

      <q-card-section class="dialog-content">
        <q-form @submit="handleSubmit" class="form-container">
          <!-- Basic Information Section -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="info" color="primary" size="20px" />
              <span class="section-title">基本資訊</span>
            </div>

            <div class="section-content">
              <!-- Task Title -->
              <q-input
                v-model="formData.title"
                label="任務標題"
                outlined
                dense
                :rules="[val => !!val || '請輸入任務標題']"
                ref="titleInputRef"
                class="title-input compact-input"
                hide-bottom-space
                autofocus
              >
                <template v-slot:prepend>
                  <q-icon name="title" color="grey-6" />
                </template>
              </q-input>

              <!-- Task Description -->
              <q-input
                v-model="descriptionText"
                label="任務描述"
                outlined
                dense
                type="textarea"
                rows="2"
                class="description-input compact-input"
                hide-bottom-space
                @update:model-value="(value: string | number | null) => updateDescription(String(value || ''))"
              >
                <template v-slot:prepend>
                  <q-icon name="description" color="grey-6" />
                </template>
              </q-input>

              <!-- Project Selection -->
              <q-select
                v-if="mode === 'create' && !projectId"
                v-model="formData.projectId"
                :options="projectOptions"
                option-value="value"
                option-label="label"
                label="專案"
                outlined
                dense
                emit-value
                map-options
                :rules="[val => !!val || '請選擇專案']"
                class="compact-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="work" color="grey-6" />
                </template>
              </q-select>

              <!-- Parent Task Selection -->
              <q-select
                v-if="formData.parentTaskId"
                v-model="formData.parentTaskId"
                :options="[]"
                label="上層任務"
                outlined
                dense
                clearable
                class="compact-input"
                hide-bottom-space
                readonly
              >
                <template v-slot:prepend>
                  <q-icon name="account_tree" color="grey-6" />
                </template>
              </q-select>

              <!-- Tags -->
              <q-select
                v-model="formData.tags"
                :options="tagOptions"
                label="標籤"
                outlined
                dense
                multiple
                use-chips
                use-input
                input-debounce="0"
                new-value-mode="add-unique"
                @filter="filterTags"
                class="compact-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="label" color="grey-6" />
                </template>
              </q-select>
            </div>
          </div>

          <!-- Schedule Section -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="schedule" color="primary" size="20px" />
              <span class="section-title">時程安排</span>
            </div>

            <div class="section-content">
              <div class="row q-col-gutter-sm">
                <div class="col">
                  <q-input
                    v-model="startDateString"
                    label="開始時間"
                    outlined
                    dense
                    readonly
                    class="compact-input date-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="play_arrow" color="green" />
                    </template>
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer" color="purple">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <DateTimePicker
                            :model-value="formData.startDateTime || null"
                            @update:model-value="(val: Date | null) => { formData.startDateTime = val; updateStartDate(); }"
                          />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                    <template v-slot:after>
                      <q-btn
                        v-if="formData.startDateTime"
                        flat
                        dense
                        round
                        icon="clear"
                        color="grey-6"
                        @click="formData.startDateTime = null"
                      />
                    </template>
                  </q-input>
                </div>
                <div class="col">
                  <q-input
                    v-model="endDateString"
                    label="結束時間"
                    outlined
                    dense
                    readonly
                    class="compact-input date-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="stop" color="red" />
                    </template>
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer" color="purple">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <DateTimePicker
                            :model-value="formData.endDateTime || null"
                            @update:model-value="(val: Date | null) => { formData.endDateTime = val; updateEndDate(); }"
                          />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                    <template v-slot:after>
                      <q-btn
                        v-if="formData.endDateTime"
                        flat
                        dense
                        round
                        icon="clear"
                        color="grey-6"
                        @click="formData.endDateTime = null"
                      />
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>

          <!-- Assignment & Status Section -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="assignment" color="primary" size="20px" />
              <span class="section-title">指派與狀態</span>
            </div>

            <div class="section-content">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="formData.assigneeId"
                    :options="assigneeOptions"
                    option-value="value"
                    option-label="label"
                    label="執行人"
                    outlined
                    dense
                    clearable
                    emit-value
                    map-options
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" color="grey-6" />
                    </template>
                    <template v-slot:selected>
                      <div v-if="formData.assigneeId" class="row items-center no-wrap">
                        <q-avatar size="20px" class="q-mr-xs">
                          <img
                            v-if="getAssigneeAvatar(formData.assigneeId)"
                            :src="getAssigneeAvatar(formData.assigneeId)"
                            :alt="getAssigneeLabel(formData.assigneeId)"
                          >
                          <q-icon v-else name="person" size="12px" />
                        </q-avatar>
                        <span style="font-size: 13px;">{{ getAssigneeLabel(formData.assigneeId) }}</span>
                      </div>
                      <span v-else class="text-grey-6" style="font-size: 13px;">未指派</span>
                    </template>
                  </q-select>
                </div>

                <div class="col-12 col-md-3">
                  <q-select
                    v-model="formData.statusId"
                    :options="statusOptions"
                    option-value="value"
                    option-label="label"
                    label="狀態"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon
                        :name="getStatusIcon(formData.statusId)"
                        :color="getStatusColor(formData.statusId)"
                      />
                    </template>
                  </q-select>
                </div>

                <div class="col-12 col-md-3">
                  <q-select
                    v-model="formData.priorityId"
                    :options="priorityOptions"
                    option-value="value"
                    option-label="label"
                    label="優先級"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon
                        name="flag"
                        :color="getPriorityColor(formData.priorityId)"
                      />
                    </template>
                  </q-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress Section -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="trending_up" color="primary" size="20px" />
              <span class="section-title">進度管理</span>
            </div>

            <div class="section-content">
              <div class="progress-container">
                <div class="progress-header row items-center justify-between q-mb-sm">
                  <span class="text-subtitle2">{{ formData.progress || 0 }}% 完成</span>
                  <q-chip 
                    :color="getProgressColor(formData.progress || 0)" 
                    text-color="white" 
                    size="sm"
                    :icon="getProgressIcon(formData.progress || 0)"
                  >
                    {{ getProgressStatus(formData.progress || 0) }}
                  </q-chip>
                </div>
                <q-slider
                  v-model="formData.progress"
                  :min="0"
                  :max="100"
                  :step="5"
                  :color="getProgressColor(formData.progress || 0)"
                  track-color="grey-4"
                  thumb-color="white"
                  class="progress-slider"
                />
                <div class="row justify-between q-mt-xs text-caption text-grey-6">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Custom Fields Section -->
          <div v-if="visibleCustomFields.length > 0" class="form-section">
            <div class="section-header">
              <q-icon name="tune" color="primary" size="20px" />
              <span class="section-title">自訂欄位</span>
            </div>

            <div class="section-content">
              <div class="row q-col-gutter-sm">
                <div
                  v-for="field in visibleCustomFields"
                  :key="field.fieldId"
                  :class="field.type === 'text' && field.validation?.maxLength && field.validation.maxLength > 100 ? 'col-12' : 'col-12 col-sm-6'"
                >
                  <CustomFieldRenderer
                    :field="field"
                    :value="getCustomFieldValue(field.fieldId)"
                    :project-id="formData.projectId || ''"
                    @update:value="updateCustomFieldValue(field.fieldId, $event)"
                    @validation-error="onCustomFieldValidation(field.fieldId, $event)"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <!-- Enhanced Actions -->
      <q-card-actions class="dialog-actions">
        <div class="actions-left">
          <q-btn
            flat
            icon="delete"
            label="刪除任務"
            color="negative"
            v-if="mode === 'edit' && task"
            @click="handleDelete"
            class="delete-btn"
            :loading="isSubmitting"
          />
        </div>

        <div class="actions-right">
          <q-btn
            flat
            icon="close"
            label="取消"
            v-close-popup
            class="cancel-btn"
            :disable="isSubmitting"
          />
          <q-btn
            unelevated
            :icon="mode === 'create' ? 'add' : mode === 'duplicate' ? 'content_copy' : 'save'"
            :label="mode === 'create' ? '建立任務' : mode === 'duplicate' ? '建立副本' : '更新任務'"
            color="primary"
            @click="handleSubmit"
            :loading="isSubmitting"
            class="submit-btn"
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar, type QInput } from 'quasar'
import type { Task, RichTextContent } from '@/types'
import { DEFAULT_STATUSES, DEFAULT_PRIORITIES } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCustomFields } from '@/composables/useCustomFields'
import { getProjectRepository } from '@/services/repositories'
import DateTimePicker from '@/components/ui/inputs/DateTimePicker.vue'
import CustomFieldRenderer from '@/components/business/shared/CustomFieldRenderer.vue'

// Props
const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit' | 'duplicate'
  task?: Task
  projectId?: string
  parentTaskId?: string
  initialData?: Partial<Task>
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'task-created': [task: Task]
  'task-updated': [task: Task]
  'task-duplicated': [task: Task]
  'task-deleted': [taskId: string]
}>()

const $q = useQuasar()
const taskStore = useTaskStore()
const { userId: currentUserId, availableUsers } = useCurrentUser()
const {
  visibleFields: visibleCustomFields,
  initializeTaskCustomFields,
  updateTaskCustomFieldValue
} = useCustomFields(props.projectId || '')
const projectRepo = getProjectRepository()

// 狀態
const isSubmitting = ref(false)
const descriptionText = ref('')
const tagOptions = ref<string[]>([])
const titleInputRef = ref<QInput | null>(null)

// 表單資料
const formData = ref<Partial<Task> & {
  title: string
  projectId?: string
  parentTaskId?: string
}>({
  title: '',
  statusId: 'todo',
  priorityId: 'medium',
  progress: 0,
  tags: [],
  customFields: []
})

// 自訂欄位狀態
const customFieldValidations = ref<Record<string, string | null>>({})

// 計算屬性
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const startDateString = computed(() => {
  if (!formData.value.startDateTime) return ''
  return formatDateTime(formData.value.startDateTime)
})

const endDateString = computed(() => {
  if (!formData.value.endDateTime) return ''
  return formatDateTime(formData.value.endDateTime)
})

// 選項資料
const statusOptions = computed(() =>
  DEFAULT_STATUSES.map(status => ({
    label: status.label,
    value: status.id
  }))
)

const priorityOptions = computed(() =>
  DEFAULT_PRIORITIES.map(priority => ({
    label: priority.label,
    value: priority.id,
    icon: priority.icon,
    color: priority.color
  }))
)

const assigneeOptions = computed(() =>
  availableUsers.value.map(user => ({
    label: user.name,
    value: user.userId,
    avatar: user.avatar
  }))
)

const projectOptions = ref<Array<{ label: string; value: string }>>([])

// 載入專案選項（建立模式需要）
async function loadProjectOptions(): Promise<void> {
  if (props.mode === 'create' && !props.projectId) {
    try {
      const projects = await projectRepo.findByMember(currentUserId.value)
      projectOptions.value = projects
        .filter(p => !p.isArchived)
        .map(p => ({
          label: p.name,
          value: p.projectId
        }))
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }
}

// 安全的日期轉換函數
function parseToDate(dateValue: unknown): Date | null {
  if (!dateValue) return null
  
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue
  }
  
  if (typeof dateValue === 'string') {
    const parsedDate = new Date(dateValue)
    return isNaN(parsedDate.getTime()) ? null : parsedDate
  }
  
  return null
}

// 初始化表單資料
function initFormData(): void {
  if (props.mode === 'edit' && props.task) {
    // 編輯模式：載入現有任務資料
    formData.value = {
      ...props.task,
      tags: props.task.tags || [],
      customFields: props.task.customFields || [],
      // 確保日期欄位是 Date 對象
      startDateTime: parseToDate(props.task.startDateTime),
      endDateTime: parseToDate(props.task.endDateTime)
    }

    // 處理描述
    if (props.task.description && typeof props.task.description === 'object') {
      descriptionText.value = extractTextFromRichText(props.task.description)
    }
  } else {
    // 建立模式：使用初始資料或預設值
    const initialData = props.initialData || {}
    formData.value = {
      title: initialData.title || '',
      projectId: initialData.projectId || props.projectId || '',
      parentTaskId: initialData.parentTaskId || props.parentTaskId || undefined,
      statusId: initialData.statusId || 'todo',
      priorityId: initialData.priorityId || 'medium',
      progress: initialData.progress || 0,
      tags: initialData.tags || [],
      customFields: initialData.customFields || initializeTaskCustomFields(),
      // 確保日期欄位是 Date 對象
      startDateTime: parseToDate(initialData.startDateTime),
      endDateTime: parseToDate(initialData.endDateTime)
    }
    
    // 添加其他欄位（但跳過已處理的日期欄位）
    Object.keys(initialData).forEach(key => {
      if (key !== 'startDateTime' && key !== 'endDateTime' && !(key in formData.value)) {
        formData.value[key as keyof typeof formData.value] = initialData[key as keyof typeof initialData]
      }
    })
    
    // 處理初始描述
    if (initialData.description) {
      if (typeof initialData.description === 'object') {
        descriptionText.value = extractTextFromRichText(initialData.description)
      } else {
        descriptionText.value = String(initialData.description)
      }
    } else {
      descriptionText.value = ''
    }
  }
}

// 從富文本中提取純文字
function extractTextFromRichText(richText: RichTextContent): string {
  try {
    let text = ''
    if (richText.content && Array.isArray(richText.content)) {
      richText.content.forEach(node => {
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach(textNode => {
            if (textNode.text) {
              text += textNode.text
            }
          })
        }
      })
    }
    return text
  } catch {
    return ''
  }
}

// 更新描述
function updateDescription(text: string): void {
  descriptionText.value = text

  // 轉換為簡單的富文本格式
  formData.value.description = {
    type: 'doc',
    content: text ? [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      }
    ] : []
  }
}

// 更新開始時間
function updateStartDate(): void {
  // 自動設定結束時間（如果未設定）
  if (formData.value.startDateTime && !formData.value.endDateTime) {
    const endDate = new Date(formData.value.startDateTime)
    endDate.setDate(endDate.getDate() + 7) // 預設 7 天後
    formData.value.endDateTime = endDate
  }
}

// 更新結束時間
function updateEndDate(): void {
  // 確保結束時間不早於開始時間
  if (formData.value.startDateTime && formData.value.endDateTime) {
    if (formData.value.endDateTime < formData.value.startDateTime) {
      formData.value.startDateTime = new Date(formData.value.endDateTime)
    }
  }
}

// 篩選標籤
function filterTags(val: string, update: (fn: () => void) => void): void {
  update(() => {
    if (val === '') {
      tagOptions.value = []
    } else {
      const needle = val.toLowerCase()
      tagOptions.value = ['前端', '後端', '設計', '測試', '文檔', '緊急', '重要'].filter(
        tag => tag.toLowerCase().indexOf(needle) > -1
      )
    }
  })
}

// 自訂欄位相關函數
function getCustomFieldValue(fieldId: string): unknown {
  const field = formData.value.customFields?.find(f => f.fieldId === fieldId)
  return field?.value || null
}

function updateCustomFieldValue(fieldId: string, value: unknown): void {
  if (!formData.value.customFields) {
    formData.value.customFields = []
  }

  formData.value.customFields = updateTaskCustomFieldValue(
    formData.value.customFields,
    fieldId,
    value
  )
}

function onCustomFieldValidation(fieldId: string, error: string | null): void {
  customFieldValidations.value[fieldId] = error
}

// 處理表單提交
async function handleSubmit(): Promise<void> {
  if (isSubmitting.value) return

  // 驗證自訂欄位
  const customFieldErrors = Object.values(customFieldValidations.value).filter(Boolean)
  if (customFieldErrors.length > 0) {
    $q.notify({
      type: 'negative',
      message: '請修正自訂欄位錯誤'
    })
    return
  }

  isSubmitting.value = true

  try {
    if (props.mode === 'create' || props.mode === 'duplicate') {
      // 建立新任務或複製任務
      const taskData = {
        ...formData.value,
        projectId: formData.value.projectId || props.projectId || ''
      }
      
      // 如果有父任務 ID，確保傳遞
      if (formData.value.parentTaskId) {
        taskData.parentTaskId = formData.value.parentTaskId
      }
      
      const newTask = await taskStore.createTask(taskData)

      if (newTask) {
        if (props.mode === 'duplicate') {
          emit('task-duplicated', newTask)
          $q.notify({
            type: 'positive',
            message: '任務副本建立成功',
            position: 'top'
          })
        } else {
          emit('task-created', newTask)
          $q.notify({
            type: 'positive',
            message: '任務建立成功',
            position: 'top'
          })
        }
        dialogModel.value = false
      }
    } else {
      // 更新現有任務
      if (!props.task) return

      const success = await taskStore.updateTask(props.task.taskId, formData.value)

      if (success) {
        const updatedTask = { ...props.task, ...formData.value }
        emit('task-updated', updatedTask as Task)
        dialogModel.value = false
        $q.notify({
          type: 'positive',
          message: '任務更新成功',
          position: 'top'
        })
      }
    }
  } catch (error) {
    console.error('Failed to submit task:', error)
    $q.notify({
      type: 'negative',
      message: props.mode === 'create' ? '建立任務失敗' : '更新任務失敗',
      caption: error instanceof Error ? error.message : '未知錯誤',
      position: 'top'
    })
  } finally {
    isSubmitting.value = false
  }
}

// 處理刪除
async function handleDelete(): Promise<void> {
  if (!props.task) return

  const taskTitle = props.task.title
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '刪除任務',
      message: `確定要刪除任務「${taskTitle}」嗎？此操作無法復原。`,
      cancel: true,
      persistent: false
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false))
  })

  if (!confirmed) return

  isSubmitting.value = true

  try {
    const success = await taskStore.deleteTask(props.task.taskId)

    if (success) {
      emit('task-deleted', props.task.taskId)
      dialogModel.value = false
      $q.notify({
        type: 'positive',
        message: '任務已刪除',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Failed to delete task:', error)
    $q.notify({
      type: 'negative',
      message: '刪除任務失敗',
      caption: error instanceof Error ? error.message : '未知錯誤',
      position: 'top'
    })
  } finally {
    isSubmitting.value = false
  }
}

// 格式化日期時間
function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 美化功能輔助方法
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusIcon(statusId: string): string {
  const iconMap: Record<string, string> = {
    todo: 'radio_button_unchecked',
    inProgress: 'play_circle',
    done: 'check_circle',
    cancelled: 'cancel'
  }
  return iconMap[statusId] || 'help'
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
  const status = statusOptions.value.find(s => s.value === statusId)
  return status?.label || '未知狀態'
}

function getPriorityColor(priorityId: string): string {
  const colorMap: Record<string, string> = {
    urgent: 'red',
    high: 'deep-orange',
    medium: 'orange',
    low: 'blue'
  }
  return colorMap[priorityId] || 'grey'
}

function getPriorityLabel(priorityId: string): string {
  const priority = priorityOptions.value.find(p => p.value === priorityId)
  return priority?.label || '中'
}

function getAssigneeLabel(assigneeId: string): string {
  const assignee = assigneeOptions.value.find(a => a.value === assigneeId)
  return assignee?.label || '未知用戶'
}

function getAssigneeAvatar(assigneeId: string): string | undefined {
  const assignee = assigneeOptions.value.find(a => a.value === assigneeId)
  return assignee?.avatar
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'green'
  if (progress >= 75) return 'light-green'
  if (progress >= 50) return 'orange'
  if (progress >= 25) return 'amber'
  return 'grey'
}

function getProgressIcon(progress: number): string {
  if (progress >= 100) return 'check_circle'
  if (progress >= 75) return 'trending_up'
  if (progress >= 25) return 'schedule'
  return 'hourglass_empty'
}

function getProgressStatus(progress: number): string {
  if (progress >= 100) return '已完成'
  if (progress >= 75) return '接近完成'
  if (progress >= 50) return '進行中'
  if (progress >= 25) return '已開始'
  return '未開始'
}

function getTimeRange(): string {
  if (!formData.value.startDateTime || !formData.value.endDateTime) return ''
  
  const start = new Date(formData.value.startDateTime)
  const end = new Date(formData.value.endDateTime)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '1 天'
  if (diffDays < 7) return `${diffDays} 天`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} 週`
  return `${Math.ceil(diffDays / 30)} 個月`
}

// 監聽對話框開啟
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initFormData()
    void loadProjectOptions()
  }
})

// 初始化
// 監聽對話框開啟，在複製模式下選中標題文字
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    initFormData()
    void loadProjectOptions()
    
    // 在複製模式下，延遲選中標題文字方便用戶修改
    if (props.mode === 'duplicate') {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (titleInputRef.value) {
        titleInputRef.value.select()
      }
    }
  }
})

onMounted(() => {
  if (props.modelValue) {
    initFormData()
    void loadProjectOptions()
  }
})
</script>

<style scoped>
/* Dialog Container */
.task-dialog-wrapper {
  backdrop-filter: blur(4px);
}

.task-edit-dialog {
  width: 100%;
  max-width: 700px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* Header Styling */
.dialog-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-bottom: 1px solid #e1e5e9;
  padding: 12px 16px;
}

.close-btn {
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.1);
}

/* Loading Bar */
.loading-bar {
  height: 3px;
}

/* Content Area */
.dialog-content {
  max-height: 65vh;
  overflow-y: auto;
  padding: 8px;
  background: #fafbfc;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Form Sections */
.form-section {
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  overflow: hidden;
  transition: all 0.2s ease;
}

.form-section:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.section-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 12px;
}

.section-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Input Enhancements */
.title-input {
  font-weight: 500;
}

.compact-input :deep(.q-field__control) {
  min-height: 36px;
}

.compact-input :deep(.q-field__label) {
  font-size: 12px;
}

.compact-input :deep(.q-field__native) {
  font-size: 13px;
  padding: 4px 8px;
}

.description-input :deep(.q-field__control) {
  min-height: 60px;
}

.date-input :deep(.q-field__control) {
  min-height: 36px;
}

/* Progress Container */
.progress-container {
  padding: 8px 0;
  
  .progress-header {
    margin-bottom: 12px;
  }
  
  .progress-slider {
    margin: 12px 0;
    
    :deep(.q-slider__track) {
      height: 6px;
      border-radius: 3px;
    }
    
    :deep(.q-slider__thumb) {
      width: 16px;
      height: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }
  }
}

/* Actions Section */
.dialog-actions {
  background: white;
  border-top: 1px solid #e1e5e9;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions-left {
  flex: 1;
}

.actions-right {
  display: flex;
  gap: 6px;
}

.delete-btn {
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  transform: translateY(-1px);
}

.cancel-btn {
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.submit-btn {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3);
}

/* Custom Scrollbar */
.dialog-content::-webkit-scrollbar {
  width: 6px;
}

.dialog-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation for sections */
.form-section {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .task-edit-dialog {
    margin: 4px;
    max-width: calc(100vw - 8px);
    border-radius: 6px;
  }

  .dialog-header {
    padding: 10px 12px;
  }

  .dialog-content {
    padding: 12px;
    max-height: 70vh;
  }

  .form-container {
    gap: 4px;
  }

  .section-content {
    padding: 8px;
    gap: 4px;
  }

  .dialog-actions {
    padding: 8px 12px;
    flex-direction: column;
    gap: 4px;
  }

  .actions-left,
  .actions-right {
    width: 100%;
    justify-content: center;
  }

  .actions-right {
    flex-direction: row-reverse;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dialog-header {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
  }

  .dialog-content {
    background: #2c3e50;
  }

  .form-section {
    background: #34495e;
    border-color: #455a64;
  }

  .section-header {
    background: #455a64;
    border-color: #546e7a;
  }

  .section-title {
    color: #ecf0f1;
  }
}
</style>
