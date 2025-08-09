<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card 
      :style="$q.screen.gt.sm ? 'width: 800px; max-width: 90vw' : ''"
      class="task-dialog"
    >
      <!-- 標題列 -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon 
            :name="mode === 'create' ? 'add_task' : 'edit'" 
            class="q-mr-sm"
          />
          {{ mode === 'create' ? '建立任務' : '編輯任務' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- 表單內容 -->
      <q-form @submit="handleSubmit">
        <q-card-section style="max-height: 70vh" class="scroll">
          <div class="row q-gutter-md">
            <!-- 左欄 -->
            <div class="col-12 col-md-7">
              <!-- 任務標題 -->
              <q-input
                v-model="formData.title"
                label="任務標題 *"
                filled
                :rules="[val => !!val || '請輸入任務標題']"
                class="q-mb-md"
                autofocus
              />

              <!-- 任務描述 -->
              <div class="q-mb-md">
                <q-label class="q-mb-sm">任務描述</q-label>
                <q-input
                  v-model="descriptionText"
                  type="textarea"
                  filled
                  rows="6"
                  placeholder="描述任務的詳細內容..."
                  @update:model-value="(value: string | number | null) => updateDescription(String(value || ''))"
                />
              </div>

              <!-- 標籤 -->
              <div class="q-mb-md">
                <q-label class="q-mb-sm">標籤</q-label>
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
                  placeholder="輸入標籤並按 Enter"
                />
              </div>
            </div>

            <!-- 右欄 -->
            <div class="col-12 col-md-5">
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

              <!-- 狀態 -->
              <q-select
                v-model="formData.statusId"
                :options="statusOptions"
                option-value="value"
                option-label="label"
                label="狀態"
                filled
                emit-value
                map-options
                class="q-mb-md"
              />

              <!-- 優先級 -->
              <q-select
                v-model="formData.priorityId"
                :options="priorityOptions"
                option-value="value"
                option-label="label"
                label="優先級"
                filled
                emit-value
                map-options
                class="q-mb-md"
              >
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

              <!-- 指派對象 -->
              <q-select
                v-model="formData.assigneeId"
                :options="assigneeOptions"
                option-value="value"
                option-label="label"
                label="指派對象"
                filled
                emit-value
                map-options
                clearable
                class="q-mb-md"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-avatar size="24px">
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
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>

              <!-- 時間範圍 -->
              <div class="row q-gutter-sm q-mb-md">
                <div class="col">
                  <q-input
                    v-model="startDateString"
                    label="開始時間"
                    filled
                    readonly
                  >
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer">
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
                        @click="formData.startDateTime = null"
                      />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="row q-gutter-sm q-mb-md">
                <div class="col">
                  <q-input
                    v-model="endDateString"
                    label="結束時間"
                    filled
                    readonly
                  >
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer">
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
                        @click="formData.endDateTime = null"
                      />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- 進度 -->
              <div class="q-mb-md">
                <q-label class="q-mb-sm">進度: {{ formData.progress || 0 }}%</q-label>
                <q-slider
                  v-model="formData.progress"
                  :min="0"
                  :max="100"
                  :step="5"
                  label-always
                  color="primary"
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- 操作按鈕 -->
        <q-card-actions align="right" class="q-pa-md">
          <q-btn 
            flat 
            label="取消" 
            v-close-popup 
            :disable="isSubmitting"
          />
          <q-btn 
            type="submit"
            color="primary" 
            :label="mode === 'create' ? '建立' : '更新'"
            :loading="isSubmitting"
          />
          
          <!-- 刪除按鈕（編輯模式） -->
          <q-btn
            v-if="mode === 'edit' && task"
            flat
            color="negative"
            icon="delete"
            label="刪除"
            :disable="isSubmitting"
            @click="handleDelete"
          />
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
import { getProjectRepository } from '@/services/repositories'
import DateTimePicker from '@/components/common/DateTimePicker.vue'

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
  tags: []
})

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
      tags: props.task.tags || []
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
      tags: []
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
  } catch (_e) {
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

// 處理表單提交
async function handleSubmit(): Promise<void> {
  if (isSubmitting.value) return
  
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
  
  const confirmed = await $q.dialog({
    title: '刪除任務',
    message: `確定要刪除任務「${props.task.title}」嗎？此操作無法復原。`,
    cancel: true,
    persistent: false
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

// 監聽對話框開啟
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initFormData()
    loadProjectOptions()
  }
})

// 初始化
onMounted(() => {
  if (props.modelValue) {
    initFormData()
    loadProjectOptions()
  }
})
</script>

<style scoped lang="scss">
.task-dialog {
  .q-datetime {
    min-width: 280px;
  }
}
</style>