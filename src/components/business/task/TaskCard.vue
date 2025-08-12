<template>
  <div
    class="task-card cursor-pointer"
    :class="{
      'task-card--completed': task.statusId === 'done',
      'task-card--overdue': isOverdue
    }"
    :data-task-id="task.taskId"
    @click="$emit('click')"
  >
    <!-- 任務標題 -->
    <div class="task-card-header q-pa-md">
      <div class="row items-start justify-between">
        <div class="col">
          <div class="task-title text-subtitle2 text-weight-medium q-mb-xs">
            {{ task.title }}
          </div>

          <!-- 任務描述預覽 -->
          <div
            v-if="taskDescription"
            class="task-description text-body2 text-grey-7 q-mb-sm"
          >
            {{ taskDescription }}
          </div>
        </div>

        <!-- 優先級指示器 -->
        <q-icon
          v-if="task.priorityId && task.priorityId !== 'medium'"
          :name="getPriorityIcon(task.priorityId)"
          :color="getPriorityColor(task.priorityId)"
          size="sm"
          class="q-ml-sm"
        />
      </div>
    </div>

    <!-- 任務元數據 -->
    <div class="task-card-meta q-px-md q-pb-md">
      <div class="row items-center justify-between">
        <!-- 左側：日期和專案 -->
        <div class="col-auto">
          <div class="row items-center q-gutter-xs">
            <!-- 截止日期 -->
            <div
              v-if="task.endDateTime"
              class="task-date"
              :class="{ 'text-negative': isOverdue, 'text-warning': isNearDeadline }"
            >
              <q-icon name="schedule" size="xs" />
              <span class="text-caption q-ml-xs">
                {{ formatDate(task.endDateTime) }}
              </span>
            </div>

            <!-- 專案名稱 -->
            <div v-if="showProject" class="task-project">
              <q-icon
                :name="getProjectIcon(task.projectId)"
                size="xs"
                :color="getProjectIconColor(task.projectId)"
              />
              <span class="text-caption q-ml-xs" :style="{ color: `var(--q-${getProjectIconColor(task.projectId)})` }">
                {{ getProjectName(task.projectId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 右側：指派用戶 -->
        <div class="col-auto" v-if="task.assigneeId">
          <q-avatar size="24px" color="primary" text-color="white">
            {{ getUserInitials(task.assigneeId) }}
          </q-avatar>
        </div>
      </div>

      <!-- 進度條 -->
      <div v-if="task.progress && task.progress > 0" class="q-mt-sm">
        <q-linear-progress
          :value="task.progress / 100"
          size="4px"
          :color="getProgressColor(task.progress)"
          class="rounded-borders"
        />
        <div class="text-caption text-grey-6 q-mt-xs">
          {{ task.progress }}% 完成
        </div>
      </div>

      <!-- 子任務指示器 -->
      <div v-if="hasSubtasks" class="q-mt-sm">
        <div class="row items-center q-gutter-xs">
          <q-icon name="account_tree" size="xs" color="grey-6" />
          <span class="text-caption text-grey-6">
            {{ subtaskCount }} 個子任務
          </span>
        </div>
      </div>

      <!-- 標籤 -->
      <div v-if="task.tags && task.tags.length > 0" class="task-tags q-mt-sm">
        <q-chip
          v-for="tag in task.tags.slice(0, 3)"
          :key="tag"
          dense
          size="sm"
          color="grey-3"
          text-color="grey-8"
          :label="tag"
          class="q-mr-xs q-mb-xs"
        />
        <span v-if="task.tags.length > 3" class="text-caption text-grey-6">
          +{{ task.tags.length - 3 }} 更多
        </span>
      </div>

      <!-- 自訂欄位 -->
      <div v-if="displayCustomFields.length > 0" class="task-custom-fields q-mt-sm">
        <div
          v-for="field in displayCustomFields"
          :key="field.fieldId"
          class="custom-field-item q-mb-xs"
        >
          <div class="custom-field-compact">
            <span class="field-label text-caption text-grey-6">
              {{ field.name }}:
            </span>
            <span class="field-value text-caption q-ml-xs">
              <CustomFieldRenderer
                :field="field"
                :value="getCustomFieldValue(task.customFields, field.fieldId)"
                :readonly="true"
                :show-label="false"
                :show-help="false"
                dense
                class="inline-field"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Task, Project } from '@/types'
import { useCustomFields, useCustomFieldUtils } from '@/composables/useCustomFields'
import CustomFieldRenderer from '@/components/business/shared/CustomFieldRenderer.vue'
import { getProjectRepository } from '@/services/repositories'

// Props
const props = defineProps<{
  task: Task
  showProject?: boolean
  projectId?: string
}>()

// Emits
defineEmits<{
  'click': []
  'update': [updates: Partial<Task>]
}>()

// Project repository
const projectRepo = getProjectRepository()
const projectsCache = ref<Map<string, Project>>(new Map())

// Custom fields
const { visibleFields: visibleCustomFields } = useCustomFields(props.projectId || props.task.projectId)
const { getCustomFieldValue } = useCustomFieldUtils()

// Project methods
async function loadProject(projectId: string): Promise<void> {
  if (projectsCache.value.has(projectId)) return

  try {
    const project = await projectRepo.findById(projectId)
    if (project) {
      projectsCache.value.set(projectId, project)
    }
  } catch (error) {
    console.warn('Failed to load project:', projectId, error)
    projectsCache.value.set(projectId, {
      projectId,
      name: '未知專案',
      icon: 'folder',
      iconColor: 'grey'
    } as Project)
  }
}

function getProjectName(projectId: string): string {
  if (projectsCache.value.has(projectId)) {
    return projectsCache.value.get(projectId)!.name
  }
  void loadProject(projectId)
  return '載入中...'
}

function getProjectIcon(projectId: string): string {
  if (projectsCache.value.has(projectId)) {
    const project = projectsCache.value.get(projectId)!
    return project.icon || 'folder'
  }
  return 'folder'
}

function getProjectIconColor(projectId: string): string {
  if (projectsCache.value.has(projectId)) {
    const project = projectsCache.value.get(projectId)!
    return project.iconColor || 'grey-6'
  }
  return 'grey-6'
}

// 顯示在卡片上的自訂欄位（最多顯示2個重要欄位）
const displayCustomFields = computed(() => {
  if (!visibleCustomFields.value) return []

  // 優先顯示必填欄位和有值的欄位
  return visibleCustomFields.value
    .filter(field => {
      const value = getCustomFieldValue(props.task.customFields, field.fieldId)
      return field.isRequired || (value !== null && value !== undefined && value !== '')
    })
    .sort((a, b) => {
      // 必填欄位優先
      if (a.isRequired && !b.isRequired) return -1
      if (!a.isRequired && b.isRequired) return 1
      // 按照顯示順序
      return a.displayOrder - b.displayOrder
    })
    .slice(0, 2) // 最多顯示2個
})

// 任務描述預覽
const taskDescription = computed(() => {
  if (!props.task.description) return ''

  // 簡單的富文本轉純文字
  if (typeof props.task.description === 'object') {
    try {
      let text = ''
      const extractText = (content: unknown): void => {
        if (Array.isArray(content)) {
          content.forEach(extractText)
        } else if (content && typeof content === 'object') {
          const obj = content as Record<string, unknown>
          if (obj.text && typeof obj.text === 'string') {
            text += obj.text
          }
          if (obj.content) {
            extractText(obj.content)
          }
        }
      }

      if (props.task.description.content) {
        extractText(props.task.description.content)
      }

      return text.length > 60 ? text.substring(0, 60) + '...' : text
    } catch {
      return ''
    }
  }

  return ''
})

// 是否逾期
const isOverdue = computed(() => {
  if (!props.task.endDateTime || props.task.statusId === 'done') return false
  return new Date(props.task.endDateTime) < new Date()
})

// 是否接近截止日期
const isNearDeadline = computed(() => {
  if (!props.task.endDateTime || props.task.statusId === 'done') return false
  const deadline = new Date(props.task.endDateTime)
  const now = new Date()
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 2 && diffDays > 0
})

// 是否有子任務
const hasSubtasks = computed(() => {
  return props.task.children && props.task.children.length > 0
})

// 子任務數量
const subtaskCount = computed(() => {
  return props.task.children?.length || 0
})

// 格式化日期
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '明天'
  } else if (diffDays === -1) {
    return '昨天'
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays}天後`
  } else if (diffDays < -1 && diffDays >= -7) {
    return `${Math.abs(diffDays)}天前`
  } else {
    return d.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric'
    })
  }
}

// 取得優先級圖標
function getPriorityIcon(priority: string): string {
  const priorityIcons = {
    'high': 'keyboard_arrow_up',
    'urgent': 'keyboard_double_arrow_up',
    'low': 'keyboard_arrow_down'
  }
  return priorityIcons[priority as keyof typeof priorityIcons] || 'remove'
}

// 取得優先級顏色
function getPriorityColor(priority: string): string {
  const priorityColors = {
    'urgent': 'red',
    'high': 'orange',
    'low': 'grey'
  }
  return priorityColors[priority as keyof typeof priorityColors] || 'grey'
}

// 取得進度顏色
function getProgressColor(progress: number): string {
  if (progress >= 80) return 'green'
  if (progress >= 50) return 'orange'
  return 'blue'
}

// 取得用戶姓名縮寫
function getUserInitials(userId: string): string {
  // 簡化實作，實際應該從用戶資料中取得
  return userId.substring(0, 2).toUpperCase()
}

</script>

<style scoped lang="scss">
.task-card {
  background-color: white;
  border-radius: 4px;
  border: 1px solid #bdbdbd;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1976d2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  &--completed {
    opacity: 0.8;

    .task-title {
      text-decoration: line-through;
      color: #757575;
    }
  }

  &--overdue {
    border-left: 4px solid #c10015;
  }

  .task-title {
    line-height: 1.3;
    word-break: break-word;
  }

  .task-description {
    line-height: 1.4;
    word-break: break-word;
  }

  .task-date {
    display: inline-flex;
    align-items: center;
  }

  .task-project {
    display: inline-flex;
    align-items: center;
  }

  .task-tags {
    .q-chip {
      font-size: 10px;
      height: 20px;
    }
  }

  .task-custom-fields {
    .custom-field-compact {
      display: flex;
      align-items: center;

      .field-label {
        font-weight: 500;
        min-width: 60px;
        flex-shrink: 0;
      }

      .field-value {
        flex: 1;

        .inline-field {
          :deep(.q-field__control) {
            min-height: auto;
            padding: 0;
          }

          :deep(.q-field__native) {
            padding: 0;
            font-size: 11px;
            line-height: 1.2;
          }

          :deep(.q-chip) {
            font-size: 10px;
            height: 16px;
            margin: 0 2px 0 0;
          }

          :deep(.q-select__dropdown-icon) {
            display: none;
          }
        }
      }
    }
  }
}
</style>
