<template>
  <div class="task-dashboard-view q-pa-md">
    <!-- 統計卡片列 -->
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <div class="stat-number text-primary">{{ stats.total }}</div>
            <div class="stat-label">總任務數</div>
            <q-icon name="task_alt" size="2em" class="stat-icon text-primary" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <div class="stat-number text-orange">{{ stats.inProgress }}</div>
            <div class="stat-label">進行中</div>
            <q-icon name="schedule" size="2em" class="stat-icon text-orange" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <div class="stat-number text-positive">{{ stats.done }}</div>
            <div class="stat-label">已完成</div>
            <q-icon name="check_circle" size="2em" class="stat-icon text-positive" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <div class="stat-number text-negative">{{ stats.overdue }}</div>
            <div class="stat-label">已逾期</div>
            <q-icon name="warning" size="2em" class="stat-icon text-negative" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 內容區域 -->
    <div class="row q-gutter-md">
      <!-- 左欄 -->
      <div class="col-12 col-md-8">
        <!-- 最近任務 -->
        <q-card class="q-mb-md">
          <q-card-section class="q-pb-none">
            <div class="text-h6 row items-center">
              <q-icon name="history" class="q-mr-sm" />
              最近任務
            </div>
          </q-card-section>
          
          <q-card-section class="q-pt-none">
            <div v-if="recentTasks.length === 0" class="text-center text-grey-6 q-pa-md">
              <q-icon name="inbox" size="3em" />
              <div class="q-mt-sm">暫無任務</div>
            </div>
            
            <div v-else>
              <q-list separator>
                <q-item
                  v-for="task in recentTasks"
                  :key="task.taskId"
                  clickable
                  @click="$emit('task-click', task)"
                >
                  <q-item-section avatar>
                    <q-checkbox
                      :model-value="task.statusId === 'done'"
                      @update:model-value="(val) => toggleTaskStatus(task, val)"
                      @click.stop
                    />
                  </q-item-section>
                  
                  <q-item-section>
                    <q-item-label>{{ task.title }}</q-item-label>
                    <q-item-label caption>
                      {{ formatRelativeTime(task.createdAt) }}
                      <span v-if="task.assigneeId" class="q-ml-sm">
                        · 指派給 {{ getUserDisplayName(task.assigneeId) }}
                      </span>
                    </q-item-label>
                  </q-item-section>
                  
                  <q-item-section side>
                    <q-badge 
                      :color="getStatusColor(task.statusId)"
                      :label="getStatusLabel(task.statusId)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
              
              <div v-if="tasks.length > 5" class="text-center q-pa-md">
                <q-btn
                  flat
                  color="primary"
                  label="查看全部"
                  @click="$router.push(projectId === 'all' ? '/' : `/projects/${projectId}`)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- 進度圖表 -->
        <q-card>
          <q-card-section class="q-pb-none">
            <div class="text-h6 row items-center">
              <q-icon name="bar_chart" class="q-mr-sm" />
              任務狀態分佈
            </div>
          </q-card-section>
          
          <q-card-section>
            <div class="progress-chart">
              <div
                v-for="status in statusDistribution"
                :key="status.id"
                class="progress-item q-mb-md"
              >
                <div class="row items-center justify-between q-mb-xs">
                  <span class="text-weight-medium">{{ status.label }}</span>
                  <span class="text-grey-6">{{ status.count }}</span>
                </div>
                <q-linear-progress
                  :value="status.percentage"
                  :color="status.color"
                  size="12px"
                  rounded
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 右欄 -->
      <div class="col-12 col-md-4">
        <!-- 我的任務 -->
        <q-card class="q-mb-md">
          <q-card-section class="q-pb-none">
            <div class="text-h6 row items-center">
              <q-icon name="person" class="q-mr-sm" />
              我的任務
            </div>
          </q-card-section>
          
          <q-card-section class="q-pt-none">
            <div v-if="myTasks.length === 0" class="text-center text-grey-6 q-pa-md">
              <q-icon name="assignment_ind" size="2em" />
              <div class="text-caption q-mt-xs">暫無指派任務</div>
            </div>
            
            <q-list v-else separator>
              <q-item
                v-for="task in myTasks"
                :key="task.taskId"
                clickable
                @click="$emit('task-click', task)"
              >
                <q-item-section>
                  <q-item-label>{{ task.title }}</q-item-label>
                  <q-item-label caption>
                    <q-icon 
                      v-if="isTaskOverdue(task)"
                      name="warning"
                      color="negative"
                      size="xs"
                      class="q-mr-xs"
                    />
                    {{ getTaskDeadline(task) }}
                  </q-item-label>
                </q-item-section>
                
                <q-item-section side>
                  <q-icon 
                    :name="getPriorityIcon(task.priorityId)"
                    :color="getPriorityColor(task.priorityId)"
                    size="sm"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- 即將到期 -->
        <q-card>
          <q-card-section class="q-pb-none">
            <div class="text-h6 row items-center">
              <q-icon name="schedule" class="q-mr-sm" />
              即將到期
            </div>
          </q-card-section>
          
          <q-card-section class="q-pt-none">
            <div v-if="upcomingTasks.length === 0" class="text-center text-grey-6 q-pa-md">
              <q-icon name="event_available" size="2em" />
              <div class="text-caption q-mt-xs">暫無即將到期任務</div>
            </div>
            
            <q-list v-else separator>
              <q-item
                v-for="task in upcomingTasks"
                :key="task.taskId"
                clickable
                @click="$emit('task-click', task)"
              >
                <q-item-section>
                  <q-item-label>{{ task.title }}</q-item-label>
                  <q-item-label caption>
                    {{ formatTaskDeadline(task.endDateTime || null) }}
                  </q-item-label>
                </q-item-section>
                
                <q-item-section side>
                  <q-chip
                    size="sm"
                    dense
                    :color="getUrgencyColor(task.endDateTime || null)"
                    text-color="white"
                  >
                    {{ getDaysUntilDeadline(task.endDateTime || null) }}
                  </q-chip>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task, View } from '@/types'
import { DEFAULT_STATUSES, DEFAULT_PRIORITIES } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'

// Props
const props = defineProps<{
  view: View
  tasks: Task[]
  projectId: string
}>()

// Emits (moved below)

const { userId: currentUserId, getUserDisplayName } = useCurrentUser()

// 統計數據
const stats = computed(() => {
  const tasks = props.tasks
  return {
    total: tasks.length,
    todo: tasks.filter(t => t.statusId === 'todo').length,
    inProgress: tasks.filter(t => t.statusId === 'inProgress').length,
    done: tasks.filter(t => t.statusId === 'done').length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length
  }
})

// 狀態分佈
const statusDistribution = computed(() => {
  const total = props.tasks.length
  if (total === 0) return []

  return DEFAULT_STATUSES.map(status => {
    const count = props.tasks.filter(t => t.statusId === status.id).length
    return {
      id: status.id,
      label: status.label,
      count,
      percentage: count / total,
      color: status.color
    }
  })
})

// 最近任務（最多 5 個）
const recentTasks = computed(() => {
  return props.tasks
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
})

// 我的任務
const myTasks = computed(() => {
  return props.tasks
    .filter(task => task.assigneeId === currentUserId.value && task.statusId !== 'done')
    .slice(0, 5)
})

// 即將到期的任務
const upcomingTasks = computed(() => {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return props.tasks
    .filter(task => {
      if (!task.endDateTime || task.statusId === 'done') return false
      const endDate = new Date(task.endDateTime)
      return endDate >= now && endDate <= nextWeek
    })
    .sort((a, b) => new Date(a.endDateTime!).getTime() - new Date(b.endDateTime!).getTime())
    .slice(0, 5)
})

// 輔助函數
function isTaskOverdue(task: Task): boolean {
  if (!task.endDateTime || task.statusId === 'done') return false
  return new Date(task.endDateTime) < new Date()
}

function getStatusLabel(statusId: string): string {
  return DEFAULT_STATUSES.find(s => s.id === statusId)?.label || statusId
}

function getStatusColor(statusId: string): string {
  return DEFAULT_STATUSES.find(s => s.id === statusId)?.color || 'grey'
}

function getPriorityIcon(priorityId: string): string {
  return DEFAULT_PRIORITIES.find(p => p.id === priorityId)?.icon || 'remove'
}

function getPriorityColor(priorityId: string): string {
  return DEFAULT_PRIORITIES.find(p => p.id === priorityId)?.color || 'grey'
}

function getTaskDeadline(task: Task): string {
  if (!task.endDateTime) return '無截止時間'
  return formatTaskDeadline(task.endDateTime)
}

function formatTaskDeadline(endDateTime: Date | string | null): string {
  if (!endDateTime) return ''
  const date = typeof endDateTime === 'string' ? new Date(endDateTime) : endDateTime
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天到期'
  } else if (diffDays === 1) {
    return '明天到期'
  } else if (diffDays === -1) {
    return '昨天到期'
  } else if (diffDays > 0) {
    return `${diffDays} 天後到期`
  } else {
    return `逾期 ${Math.abs(diffDays)} 天`
  }
}

function getDaysUntilDeadline(endDateTime: Date | string | null): string {
  if (!endDateTime) return ''
  const date = typeof endDateTime === 'string' ? new Date(endDateTime) : endDateTime
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '1天'
  } else if (diffDays > 1) {
    return `${diffDays}天`
  } else {
    return '逾期'
  }
}

function getUrgencyColor(endDateTime: Date | string | null): string {
  if (!endDateTime) return 'grey'
  const date = typeof endDateTime === 'string' ? new Date(endDateTime) : endDateTime
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'negative'
  if (diffDays <= 1) return 'orange'
  if (diffDays <= 3) return 'warning'
  return 'positive'
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      return `${diffMinutes} 分鐘前`
    }
    return `${diffHours} 小時前`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays} 天前`
  } else {
    return d.toLocaleDateString('zh-TW')
  }
}

const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
}>()

function toggleTaskStatus(task: Task, completed: boolean): void {
  const newStatus = completed ? 'done' : 'todo'
  emit('task-update', task.taskId, { statusId: newStatus })
}
</script>

<style scoped lang="scss">
.task-dashboard-view {
  .stat-card {
    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      line-height: 1;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: $grey-6;
      margin-top: 4px;
    }
    
    .stat-icon {
      position: absolute;
      top: 16px;
      right: 16px;
      opacity: 0.1;
    }
    
    .q-card__section {
      position: relative;
    }
  }
  
  .progress-chart {
    .progress-item {
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>