<template>
  <div
    class="task-item q-pa-xs cursor-pointer"
    :class="{
      'task-item--completed': task.statusId === 'done',
      'task-item--overdue': isOverdue
    }"
    @click="$emit('click')"
  >
    <!-- 單行佈局 -->
    <div class="row items-center no-wrap q-gutter-md">
      <!-- 任務狀態切換按鈕 -->
      <div class="col-auto">
        <q-btn
          flat
          dense
          round
          size="sm"
          :icon="statusInfo.icon"
          :color="statusInfo.color"
          @click.stop="cycleStatus"
          class="status-btn"
        >
          <q-tooltip>{{ statusInfo.label }} (點擊切換)</q-tooltip>
        </q-btn>
      </div>

      <!-- 任務標題（主要內容） -->
      <div class="col task-title-section">
        <div class="task-title text-body1 text-weight-medium ellipsis">
          {{ task.title }}
        </div>
      </div>

      <!-- 標籤區域 -->
      <div class="col-auto row items-center q-gutter-xs no-wrap">
        <!-- 專案標籤（AllTasks 視圖才顯示） -->
        <q-chip
          v-if="showProject && projectName"
          size="sm"
          dense
          color="blue-1"
          text-color="blue-8"
          icon="folder"
          class="chip-compact"
        >
          {{ projectName }}
        </q-chip>

        <!-- 優先級圖示 -->
        <q-icon
          v-if="priorityInfo && priorityInfo.id !== 'medium'"
          :name="priorityInfo.icon"
          :color="priorityInfo.color"
          size="sm"
        >
          <q-tooltip>{{ priorityInfo.label }}</q-tooltip>
        </q-icon>

        <!-- 逾期指示 -->
        <q-icon
          v-if="isOverdue"
          name="schedule"
          color="negative"
          size="sm"
        >
          <q-tooltip>已逾期</q-tooltip>
        </q-icon>

        <!-- 子任務指示器 -->
        <div
          v-if="task.children && task.children.length > 0"
          class="text-caption text-grey-6"
        >
          <q-icon name="account_tree" size="xs" />
          {{ task.children.length }}
        </div>

        <!-- 進度指示 -->
        <div
          v-if="task.progress && task.progress > 0"
          class="text-caption text-primary"
        >
          {{ task.progress }}%
        </div>
      </div>

      <!-- 到期時間 -->
      <div
        v-if="task.endDateTime"
        class="col-auto text-caption"
        :class="isOverdue ? 'text-negative' : 'text-grey-6'"
      >
        {{ formatDate(task.endDateTime) }}
      </div>

      <!-- 指派對象 -->
      <div class="col-auto">
        <!-- 指派對象頭像 -->
        <q-avatar
          v-if="assigneeInfo"
          size="28px"
          class="cursor-pointer"
          @click.stop="showAssigneeMenu = true"
        >
          <img
            v-if="assigneeInfo.avatar"
            :src="assigneeInfo.avatar"
            :alt="assigneeInfo.name"
          >
          <q-icon v-else name="person" />
          <q-tooltip>{{ assigneeInfo.name }}</q-tooltip>

          <!-- 指派對象快速選單 -->
          <q-menu v-model="showAssigneeMenu">
            <q-list dense style="min-width: 200px">
              <q-item-label header>重新指派給</q-item-label>
              <q-item
                v-for="user in availableUsers"
                :key="user.userId"
                clickable
                v-close-popup
                @click="assignTo(user.userId)"
              >
                <q-item-section avatar>
                  <q-avatar size="24px">
                    <img
                      v-if="user.avatar"
                      :src="user.avatar"
                      :alt="user.name"
                    >
                    <q-icon v-else name="person" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>{{ user.name }}</q-item-section>
              </q-item>
              <q-separator />
              <q-item
                clickable
                v-close-popup
                @click="assignTo(undefined)"
              >
                <q-item-section avatar>
                  <q-icon name="person_off" />
                </q-item-section>
                <q-item-section>取消指派</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-avatar>

        <!-- 未指派狀態 -->
        <q-btn
          v-else
          flat
          dense
          round
          icon="person_add"
          size="sm"
          color="grey"
          @click.stop="showAssigneeMenu = true"
        >
          <q-tooltip>指派任務</q-tooltip>

          <!-- 指派選單 -->
          <q-menu v-model="showAssigneeMenu">
            <q-list dense style="min-width: 200px">
              <q-item-label header>指派給</q-item-label>
              <q-item
                v-for="user in availableUsers"
                :key="user.userId"
                clickable
                v-close-popup
                @click="assignTo(user.userId)"
              >
                <q-item-section avatar>
                  <q-avatar size="24px">
                    <img
                      v-if="user.avatar"
                      :src="user.avatar"
                      :alt="user.name"
                    >
                    <q-icon v-else name="person" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>{{ user.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task } from '@/types'
import { DEFAULT_PRIORITIES, DEFAULT_STATUSES } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { getProjectRepository } from '@/services/repositories'

// Props
const props = defineProps<{
  task: Task
  showProject?: boolean
}>()

// Emits
const emit = defineEmits<{
  click: []
  update: [updates: Partial<Task>]
}>()

const { availableUsers, getUserDisplayName, getUserAvatar } = useCurrentUser()
const projectRepo = getProjectRepository()

// 狀態
const showAssigneeMenu = ref(false)

// 計算屬性
const isOverdue = computed(() => {
  if (!props.task.endDateTime || props.task.statusId === 'done') {
    return false
  }
  return new Date(props.task.endDateTime) < new Date()
})

const _descriptionText = computed(() => {
  if (!props.task.description || typeof props.task.description !== 'object') {
    return ''
  }

  // 從富文本提取純文字（簡化版）
  try {
    const content = props.task.description.content
    if (Array.isArray(content)) {
      let text = ''
      content.forEach(node => {
        if (node.content) {
          node.content.forEach(textNode => {
            if (textNode.text) {
              text += textNode.text
            }
          })
        }
      })
      return text.length > 100 ? text.substring(0, 100) + '...' : text
    }
  } catch {
    // 如果解析失敗，返回空字串
  }

  return ''
})

const priorityInfo = computed(() => {
  return DEFAULT_PRIORITIES.find(p => p.id === props.task.priorityId)
})

const statusInfo = computed(() => {
  const status = DEFAULT_STATUSES.find(s => s.id === props.task.statusId)
  if (!status) {
    return {
      id: 'todo',
      label: '待處理',
      color: 'grey',
      icon: 'radio_button_unchecked'
    }
  }

  // 根據狀態 ID 設定對應圖示
  const iconMap: Record<string, string> = {
    todo: 'radio_button_unchecked',
    inProgress: 'play_circle',
    done: 'check_circle',
    cancelled: 'cancel'
  }

  return {
    ...status,
    icon: iconMap[status.id] || 'radio_button_unchecked'
  }
})

const assigneeInfo = computed(() => {
  if (!props.task.assigneeId) return null

  return {
    name: getUserDisplayName(props.task.assigneeId),
    avatar: getUserAvatar(props.task.assigneeId)
  }
})

const projectName = ref<string | null>(null)

// 如果需要顯示專案名稱，載入專案資訊
if (props.showProject) {
  projectRepo.findById(props.task.projectId).then(project => {
    if (project) {
      projectName.value = project.name
    }
  }).catch(console.error)
}

// 循環切換任務狀態 (todo -> inProgress -> done -> todo)
function cycleStatus(): void {
  const statusCycle = ['todo', 'inProgress', 'done']
  const currentIndex = statusCycle.indexOf(props.task.statusId || 'todo')
  const nextIndex = (currentIndex + 1) % statusCycle.length
  const newStatus = statusCycle[nextIndex]

  emit('update', { statusId: newStatus })
}

// 指派任務
function assignTo(userId?: string): void {
  if (userId) {
    emit('update', { assigneeId: userId })
  } else {
    // Remove assignment by updating with empty string
    emit('update', { assigneeId: '' }) // Use empty string instead of undefined
  }
}

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
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays} 天後`
  } else if (diffDays < 0 && diffDays >= -7) {
    return `${Math.abs(diffDays)} 天前`
  } else {
    return d.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>

<style scoped lang="scss">
.task-item {
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s ease;
  min-height: 32px;

  &:hover {
    background-color: #f5f5f5;
  }

  &--completed {
    opacity: 0.7;

    .task-title {
      text-decoration: line-through;
      color: #757575;
    }
  }

  &--overdue {
    border-left: 4px solid #f44336;
  }

  .task-title-section {
    min-width: 0; // 允許 flex 收縮

    .task-title {
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .chip-compact {
    max-width: 120px;

    .q-chip__content {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
