<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
    class="task-dialog-wrapper"
  >
    <q-card
      :style="$q.screen.gt.sm ? 'width: 900px; max-width: 95vw' : ''"
      class="task-dialog elegant-card"
    >
      <!-- 美化標題列 -->
      <q-card-section class="dialog-header gradient-header row items-center q-pb-md">
        <div class="row items-center no-wrap">
          <q-avatar 
            :color="mode === 'create' ? 'positive' : 'primary'" 
            text-color="white" 
            size="40px"
            class="q-mr-md header-avatar"
          >
            <q-icon 
              :name="mode === 'create' ? 'add_task' : 'edit_note'" 
              size="22px"
            />
          </q-avatar>
          <div>
            <div class="text-h5 text-weight-medium text-white">
              {{ mode === 'create' ? '建立新任務' : '編輯任務' }}
            </div>
            <div v-if="mode === 'edit' && task" class="text-caption text-white opacity-80">
              ID: {{ task.taskId }} • 建立於 {{ formatDate(task.createdAt) }}
            </div>
          </div>
        </div>
        <q-space />
        <q-btn 
          icon="close" 
          flat 
          round 
          color="white" 
          size="md"
          class="close-btn"
          v-close-popup 
        />
      </q-card-section>

      <!-- 沒有需要 separator，由 CSS 處理 -->

      <!-- 美化表單內容 -->
      <q-form @submit="handleSubmit">
        <q-card-section style="max-height: 65vh" class="scroll form-content">
          <div class="row q-gutter-md">
            <!-- 主要內容區 -->
            <div class="col-12 col-md-8 main-content">
              <!-- 美化任務標題 -->
              <div class="form-field">
                <q-input
                  v-model="formData.title"
                  label="任務標題"
                  filled
                  :rules="[val => !!val || '請輸入任務標題']"
                  class="title-input"
                  autofocus
                >
                  <template v-slot:prepend>
                    <q-icon name="title" color="primary" />
                  </template>
                </q-input>
              </div>

              <!-- 美化任務描述 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="description" color="primary" class="q-mr-xs" />
                  任務描述
                </div>
                <q-input
                  v-model="descriptionText"
                  type="textarea"
                  filled
                  rows="5"
                  placeholder="描述任務的詳細內容、目標及注意事項..."
                  class="description-textarea"
                  @update:model-value="(value: string | number | null) => updateDescription(String(value || ''))"
                />
              </div>

              <!-- 美化標籤 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="local_offer" color="orange" class="q-mr-xs" />
                  標籤
                </div>
                <q-select
                  v-model="formData.tags"
                  filled
                  multiple
                  use-chips
                  use-input
                  hide-dropdown-icon
                  input-debounce="0"
                  new-value-mode="add-unique"
                  :options="tagOptions"
                  @filter="filterTags"
                  placeholder="輸入標籤並按 Enter 添加"
                  class="tags-select"
                >
                  <template v-slot:selected-item="scope">
                    <q-chip
                      removable
                      dense
                      color="orange-2"
                      text-color="orange-9"
                      :tabindex="scope.tabindex"
                      @remove="scope.removeAtIndex(scope.index)"
                      class="tag-chip"
                    >
                      {{ scope.opt }}
                    </q-chip>
                  </template>
                </q-select>
              </div>
            </div>

            <!-- 自訂欄位 -->
            <div v-if="visibleCustomFields.length > 0" class="col-12 q-mb-md">
              <div class="custom-fields-section">
                <q-separator class="q-mb-md" />
                <div class="text-subtitle1 q-mb-md">自訂欄位</div>

                <div class="row q-gutter-md">
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

            <!-- 屬性設定區 -->
            <div class="col-12 col-md-4 properties-panel">
              <!-- 專案選擇（僅建立模式顯示） -->
              <q-select
                v-if="mode === 'create' && !projectId"
                v-model="formData.projectId"
                :options="projectOptions"
                option-value="value"
                option-label="label"
                label="專案 *"
                filled
                emit-value
                map-options
                :rules="[val => !!val || '請選擇專案']"
                class="q-mb-md"
              />

              <!-- 美化狀態 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="flag" color="blue" class="q-mr-xs" />
                  任務狀態
                </div>
                <q-select
                  v-model="formData.statusId"
                  :options="statusOptions"
                  option-value="value"
                  option-label="label"
                  filled
                  emit-value
                  map-options
                  class="status-select"
                >
                  <template v-slot:selected>
                    <div class="row items-center no-wrap">
                      <q-icon :name="getStatusIcon(formData.statusId)" :color="getStatusColor(formData.statusId)" class="q-mr-sm" />
                      <span>{{ getStatusLabel(formData.statusId) }}</span>
                    </div>
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-icon :name="getStatusIcon(scope.opt.value)" :color="getStatusColor(scope.opt.value)" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- 美化優先級 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="priority_high" color="red" class="q-mr-xs" />
                  優先級
                </div>
                <q-select
                  v-model="formData.priorityId"
                  :options="priorityOptions"
                  option-value="value"
                  option-label="label"
                  filled
                  emit-value
                  map-options
                  class="priority-select"
                >
                  <template v-slot:selected>
                    <div class="row items-center no-wrap">
                      <q-chip 
                        :color="getPriorityColor(formData.priorityId)" 
                        text-color="white" 
                        dense 
                        class="priority-chip q-mr-sm"
                      >
                        {{ getPriorityLabel(formData.priorityId) }}
                      </q-chip>
                    </div>
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-icon :name="scope.opt.icon" :color="scope.opt.color" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- 美化指派對象 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="person_add" color="green" class="q-mr-xs" />
                  指派對象
                </div>
                <q-select
                  v-model="formData.assigneeId"
                  :options="assigneeOptions"
                  option-value="value"
                  option-label="label"
                  filled
                  emit-value
                  map-options
                  clearable
                  class="assignee-select"
                >
                  <template v-slot:selected>
                    <div v-if="formData.assigneeId" class="row items-center no-wrap">
                      <q-avatar size="28px" class="q-mr-sm">
                        <img
                          v-if="getAssigneeAvatar(formData.assigneeId)"
                          :src="getAssigneeAvatar(formData.assigneeId)"
                          :alt="getAssigneeLabel(formData.assigneeId)"
                        >
                        <q-icon v-else name="person" />
                      </q-avatar>
                      <span>{{ getAssigneeLabel(formData.assigneeId) }}</span>
                    </div>
                    <span v-else class="text-grey-6">未指派</span>
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-avatar size="32px">
                          <img
                            v-if="scope.opt.avatar"
                            :src="scope.opt.avatar"
                            :alt="scope.opt.label"
                          >
                          <q-icon v-else name="person" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>指派給此成員</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- 美化時間範圍 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="schedule" color="purple" class="q-mr-xs" />
                  時間安排
                </div>
                <div class="date-range-container">
                  <div class="row q-gutter-sm">
                    <div class="col">
                      <q-input
                        v-model="startDateString"
                        label="開始時間"
                        filled
                        readonly
                        class="date-input"
                      >
                        <template v-slot:prepend>
                          <q-icon name="play_arrow" color="green-6" />
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
                  </div>
                  <div class="row q-gutter-sm q-mt-sm">
                    <div class="col">
                      <q-input
                        v-model="endDateString"
                        label="結束時間"
                        filled
                        readonly
                        class="date-input"
                      >
                        <template v-slot:prepend>
                          <q-icon name="stop" color="red-6" />
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
                  <!-- 時間統計 -->
                  <div v-if="formData.startDateTime && formData.endDateTime" class="time-stats q-mt-sm">
                    <q-chip size="sm" color="purple-2" text-color="purple-9" icon="timelapse">
                      預計 {{ getTimeRange() }}
                    </q-chip>
                  </div>
                </div>
              </div>

              <!-- 美化進度 -->
              <div class="form-field">
                <div class="field-label">
                  <q-icon name="trending_up" color="teal" class="q-mr-xs" />
                  任務進度
                </div>
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
          </div>
        </q-card-section>

        <!-- 美化操作按鈕 -->
        <q-card-actions class="action-bar q-pa-lg">
          <div class="row full-width items-center justify-between">
            <!-- 左側危險操作 -->
            <div>
              <q-btn
                v-if="mode === 'edit' && task"
                flat
                color="negative"
                icon="delete_outline"
                label="刪除任務"
                :disable="isSubmitting"
                @click="handleDelete"
                class="delete-btn"
              >
                <q-tooltip>永久刪除此任務</q-tooltip>
              </q-btn>
            </div>
            
            <!-- 右側主要操作 -->
            <div class="row q-gutter-sm">
              <q-btn
                flat
                label="取消"
                color="grey-7"
                icon="close"
                v-close-popup
                :disable="isSubmitting"
                class="cancel-btn"
              />
              <q-btn
                type="submit"
                :color="mode === 'create' ? 'positive' : 'primary'"
                :icon="mode === 'create' ? 'add_task' : 'save'"
                :label="mode === 'create' ? '建立任務' : '儲存更新'"
                :loading="isSubmitting"
                :loading-label="mode === 'create' ? '建立中...' : '儲存中...'"
                class="primary-btn"
                no-caps
              />
            </div>
          </div>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { Task, RichTextContent } from '@/types'
import { DEFAULT_STATUSES, DEFAULT_PRIORITIES } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCustomFields } from '@/composables/useCustomFields'
import { getProjectRepository } from '@/services/repositories'
import DateTimePicker from '@/components/common/DateTimePicker.vue'
import CustomFieldRenderer from '@/components/fields/CustomFieldRenderer.vue'

// Props
const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  task?: Task
  projectId?: string
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'task-created': [task: Task]
  'task-updated': [task: Task]
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

// 表單資料
const formData = ref<Partial<Task> & {
  title: string
  projectId?: string
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

// 初始化表單資料
function initFormData(): void {
  if (props.mode === 'edit' && props.task) {
    // 編輯模式：載入現有任務資料
    formData.value = {
      ...props.task,
      tags: props.task.tags || [],
      customFields: props.task.customFields || []
    }

    // 處理描述
    if (props.task.description && typeof props.task.description === 'object') {
      descriptionText.value = extractTextFromRichText(props.task.description)
    }
  } else {
    // 建立模式：重置表單
    formData.value = {
      title: '',
      projectId: props.projectId || '',
      statusId: 'todo',
      priorityId: 'medium',
      progress: 0,
      tags: [],
      customFields: initializeTaskCustomFields()
    }
    descriptionText.value = ''
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
    if (props.mode === 'create') {
      // 建立新任務
      const newTask = await taskStore.createTask({
        ...formData.value,
        projectId: formData.value.projectId || props.projectId || ''
      })

      if (newTask) {
        emit('task-created', newTask)
        dialogModel.value = false
        $q.notify({
          type: 'positive',
          message: '任務建立成功',
          position: 'top'
        })
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
onMounted(() => {
  if (props.modelValue) {
    initFormData()
    void loadProjectOptions()
  }
})
</script>

<style scoped lang="scss">
/* 對話框美化樣式 */
.task-dialog-wrapper {
  .q-dialog__backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }
}

.elegant-card {
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  
  .q-datetime {
    min-width: 280px;
  }
}

/* 漸變標題 */
.gradient-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  }
  
  .header-avatar {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
  
  .close-btn {
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }
  }
}

/* 表單內容區美化 */
.form-content {
  background: #fafbfc;
  
  .main-content {
    padding-right: 24px;
    
    @media (max-width: 768px) {
      padding-right: 0;
    }
  }
  
  .properties-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    margin-left: 16px;
    
    @media (max-width: 768px) {
      margin-left: 0;
      margin-top: 16px;
    }
  }
}

/* 表單欄位美化 */
.form-field {
  margin-bottom: 24px;
  
  .field-label {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #37474f;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.title-input {
  .q-field__control {
    min-height: 56px;
    border-radius: 12px;
    
    &:before {
      border-width: 2px;
    }
  }
  
  .q-field__native {
    font-size: 18px;
    font-weight: 500;
  }
}

.description-textarea {
  .q-field__control {
    border-radius: 12px;
  }
  
  textarea {
    line-height: 1.6;
  }
}

.tags-select {
  .tag-chip {
    margin: 2px;
    border-radius: 16px;
    font-size: 12px;
    
    &:hover {
      transform: scale(1.05);
    }
  }
}

/* 狀態選擇器美化 */
.status-select,
.priority-select,
.assignee-select {
  .q-field__control {
    border-radius: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.priority-chip {
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 日期時間區域美化 */
.date-range-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  
  .date-input {
    .q-field__control {
      border-radius: 8px;
    }
  }
  
  .time-stats {
    padding: 8px 0;
    border-top: 1px solid #e0e0e0;
  }
}

/* 進度區域美化 */
.progress-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  
  .progress-header {
    margin-bottom: 12px;
  }
  
  .progress-slider {
    margin: 12px 0;
    
    :deep(.q-slider__track) {
      height: 8px;
      border-radius: 4px;
    }
    
    :deep(.q-slider__thumb) {
      width: 20px;
      height: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
}

/* 操作按鈕美化 */
.action-bar {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  
  .delete-btn {
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(244, 67, 54, 0.1);
      transform: translateY(-1px);
    }
  }
  
  .cancel-btn {
    border-radius: 8px;
    border: 1px solid #dee2e6;
    transition: all 0.2s ease;
    
    &:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
      transform: translateY(-1px);
    }
  }
  
  .primary-btn {
    border-radius: 8px;
    font-weight: 600;
    padding: 12px 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    &:active {
      transform: translateY(-1px);
    }
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .elegant-card {
    border-radius: 0;
    height: 100vh;
    max-height: none !important;
  }
  
  .gradient-header {
    padding: 16px;
  }
  
  .form-content {
    padding: 16px;
  }
  
  .properties-panel {
    margin-left: 0;
    margin-top: 16px;
    padding: 16px;
  }
  
  .action-bar {
    padding: 16px;
    
    .row {
      flex-direction: column-reverse;
      gap: 12px;
      
      .row {
        flex-direction: row;
      }
    }
  }
}

/* 動畫效果 */
.form-field {
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

/* 自訂欄位區域（如果存在） */
.custom-fields-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin: 24px 0;
}
</style>
