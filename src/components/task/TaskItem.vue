<template>
  <div 
    class="task-item q-pa-md cursor-pointer"
    :class="{ 
      'task-item--completed': task.statusId === 'done',
      'task-item--overdue': isOverdue
    }"
    @click="$emit('click')"
  >
    <div class="row items-start q-gutter-md">
      <!-- 任務狀態勾選框 -->
      <div class="col-auto">
        <q-checkbox
          :model-value="task.statusId === 'done'"
          @update:model-value="toggleStatus"
          @click.stop
          color="positive"
        />
      </div>

      <!-- 主要內容區域 -->
      <div class="col">
        <div class="row items-start justify-between">
          <div class="col">
            <!-- 任務標題 -->
            <div class="task-title text-body1 text-weight-medium">
              {{ task.title }}
            </div>

            <!-- 任務描述預覽 -->
            <div 
              v-if="descriptionText" 
              class="task-description text-body2 text-grey-7 q-mt-xs"
            >
              {{ descriptionText }}
            </div>

            <!-- 標籤行 -->
            <div class="row items-center q-gutter-sm q-mt-sm">
              <!-- 專案標籤（AllTasks 視圖才顯示） -->
              <q-chip
                v-if="showProject && projectName"
                size="sm"
                dense
                color="blue-1"
                text-color="blue-8"
                icon="folder"
              >
                {{ projectName }}
              </q-chip>

              <!-- 優先級標籤 -->
              <q-chip
                v-if="priorityInfo"
                size="sm"
                dense
                :color="priorityInfo.color"
                :text-color="priorityInfo.color === 'grey' ? 'grey-8' : 'white'"
                :icon="priorityInfo.icon"
              >
                {{ priorityInfo.label }}
              </q-chip>

              <!-- 任務標籤 -->
              <q-chip
                v-for="tag in task.tags"
                :key="tag"
                size="sm"
                dense
                color="grey-3"
                text-color="grey-8"
              >
                {{ tag }}
              </q-chip>

              <!-- 逾期標籤 -->
              <q-chip
                v-if="isOverdue"
                size="sm"
                dense
                color="negative"
                text-color="white"
                icon="schedule"
              >
                已逾期
              </q-chip>
            </div>
          </div>

          <!-- 右側資訊區域 -->
          <div class="col-auto">
            <div class="column items-end q-gutter-xs">
              <!-- 指派對象頭像 -->
              <q-avatar
                v-if="assigneeInfo"
                size="32px"
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

              <!-- 到期時間 -->
              <div 
                v-if="task.endDateTime"
                class="text-caption"
                :class="isOverdue ? 'text-negative' : 'text-grey-6'"
              >
                {{ formatDate(task.endDateTime) }}
              </div>

              <!-- 子任務指示器 -->
              <q-chip
                v-if="task.children && task.children.length > 0"
                size="sm"
                dense
                color="grey-3"
                text-color="grey-8"
                icon="account_tree"
              >
                {{ task.children.length }}
              </q-chip>
            </div>
          </div>
        </div>

        <!-- 進度條（如果有設定進度） -->
        <div 
          v-if="task.progress !== undefined && task.progress > 0"
          class="q-mt-sm"
        >
          <q-linear-progress
            :value="task.progress / 100"
            color="primary"
            size="4px"
            rounded
          />
          <div class="text-caption text-grey-6 q-mt-xs">
            進度: {{ task.progress }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task } from '@/types'
import { DEFAULT_PRIORITIES } from '@/types'
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

const descriptionText = computed(() => {
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
  } catch (_e) {
    // 如果解析失敗，返回空字串
  }
  
  return ''
})

const priorityInfo = computed(() => {
  return DEFAULT_PRIORITIES.find(p => p.id === props.task.priorityId)
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

// 切換任務狀態
function toggleStatus(completed: boolean): void {
  const newStatus = completed ? 'done' : 'todo'
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
  border-bottom: 1px solid $grey-4;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: $grey-1;
  }

  &--completed {
    opacity: 0.7;

    .task-title {
      text-decoration: line-through;
      color: $grey-6;
    }
  }

  &--overdue {
    border-left: 4px solid $negative;
  }

  .task-title {
    line-height: 1.4;
    word-wrap: break-word;
  }

  .task-description {
    line-height: 1.3;
    max-width: 500px;
    word-wrap: break-word;
  }
}
</style>