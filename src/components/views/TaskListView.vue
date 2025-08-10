<template>
  <div class="task-list-view">
    <!-- AllTasks 專案分組顯示 -->
    <template v-if="projectId === 'all' && view.config.groupBy === 'projectId'">
      <div
        v-for="[projectId, projectTasks] in sortedGroupedTasks"
        :key="projectId"
        class="project-group q-mb-lg"
      >
        <!-- 專案分組標題 -->
        <div 
          class="project-group-header q-pa-xs bg-grey-2 rounded-borders-top cursor-pointer"
          @click="toggleProjectExpanded(projectId)"
        >
          <div class="row items-center justify-between">
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="isProjectExpanded(projectId) ? 'expand_less' : 'expand_more'"
                @click.stop="toggleProjectExpanded(projectId)"
              />
              <q-avatar size="24px" color="primary" text-color="white">
                <q-icon name="folder" />
              </q-avatar>
              <span class="text-h6 text-weight-medium">
                {{ getProjectName(projectId) }}
              </span>
              
              <!-- 專案統計資訊 -->
              <div class="project-stats row items-center q-gutter-xs">
                <!-- 總任務數 -->
                <q-badge 
                  color="grey" 
                  :label="`${getCachedProjectStats(projectId).total} 任務`" 
                />
                
                <!-- 進度百分比 -->
                <q-badge 
                  :color="getCachedProjectStats(projectId).progress === 100 ? 'positive' : 'info'" 
                  :label="`${getCachedProjectStats(projectId).progress}%`" 
                />
                
                <!-- 逾期任務警告 -->
                <q-badge 
                  v-if="getCachedProjectStats(projectId).overdue > 0"
                  color="negative" 
                  :label="`${getCachedProjectStats(projectId).overdue} 逾期`" 
                />
                
                <!-- 進行中任務 -->
                <q-badge 
                  v-if="getCachedProjectStats(projectId).inProgress > 0"
                  color="warning" 
                  :label="`${getCachedProjectStats(projectId).inProgress} 進行中`" 
                />
              </div>
            </div>

            <div class="row q-gutter-xs">
              <!-- 專案排序選單 -->
              <q-btn
                flat
                dense
                icon="sort"
                size="sm"
                @click.stop
              >
                <q-tooltip>排序專案</q-tooltip>
                <q-menu>
                  <q-list dense style="min-width: 150px">
                    <q-item clickable @click="setProjectSort('name')">
                      <q-item-section>
                        <q-item-label>依名稱排序</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon v-if="projectSortBy === 'name'" name="check" />
                      </q-item-section>
                    </q-item>
                    
                    <q-item clickable @click="setProjectSort('taskCount')">
                      <q-item-section>
                        <q-item-label>依任務數量</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon v-if="projectSortBy === 'taskCount'" name="check" />
                      </q-item-section>
                    </q-item>
                    
                    <q-item clickable @click="setProjectSort('progress')">
                      <q-item-section>
                        <q-item-label>依進度排序</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon v-if="projectSortBy === 'progress'" name="check" />
                      </q-item-section>
                    </q-item>
                    
                    <q-item clickable @click="setProjectSort('overdue')">
                      <q-item-section>
                        <q-item-label>依逾期任務</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon v-if="projectSortBy === 'overdue'" name="check" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>

              <q-btn
                flat
                dense
                icon="open_in_new"
                size="sm"
                @click.stop="$router.push({ name: 'ProjectView', params: { projectId } })"
              >
                <q-tooltip>開啟專案</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>

        <!-- 專案任務列表 -->
        <div 
          v-show="isProjectExpanded(projectId)" 
          class="project-tasks bg-white rounded-borders-bottom"
        >
          <DraggableTaskList
            :tasks="projectTasks"
            :show-project="false"
            @task-click="emit('task-click', $event)"
            @task-update="(taskId: string, updates: Partial<Task>) => emit('task-update', taskId, updates)"
            @tasks-reorder="handleTasksReorder"
            @add-subtask="handleAddSubtask"
            @indent-task="handleIndentTask"
            @outdent-task="handleOutdentTask"
            @toggle-expanded="handleToggleExpanded"
          />
        </div>
      </div>
    </template>

    <!-- 一般列表顯示（不分組或專案內視圖） -->
    <template v-else>
      <div class="task-list bg-white rounded-borders">
        <DraggableTaskList
          :tasks="tasks"
          :show-project="projectId === 'all'"
          @task-click="emit('task-click', $event)"
          @task-update="(taskId: string, updates: Partial<Task>) => emit('task-update', taskId, updates)"
          @tasks-reorder="handleTasksReorder"
          @add-subtask="handleAddSubtask"
          @indent-task="handleIndentTask"
          @outdent-task="handleOutdentTask"
          @toggle-expanded="handleToggleExpanded"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import type { Task, View } from '@/types'
// import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTaskStore } from '@/stores/task'
import { getProjectRepository } from '@/services/repositories'
import DraggableTaskList from '@/components/task/DraggableTaskList.vue'

// Props
const props = defineProps<{
  view: View
  tasks: Task[]
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
}>()

const $q = useQuasar()
const taskStore = useTaskStore()
const projectRepo = getProjectRepository()

// 專案名稱快取
const projectNamesCache = new Map<string, string>()

// 專案展開/收合狀態管理
const PROJECT_EXPAND_KEY = 'projectExpandState'

// 從 localStorage 載入專案展開狀態
function loadProjectExpandState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PROJECT_EXPAND_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// 儲存專案展開狀態到 localStorage
function saveProjectExpandState(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(PROJECT_EXPAND_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save project expand state:', error)
  }
}

// 專案展開狀態
const projectExpandState = ref<Record<string, boolean>>(loadProjectExpandState())

// 專案排序狀態管理
const PROJECT_SORT_KEY = 'projectSortBy'

// 載入專案排序偏好
function loadProjectSortBy(): string {
  return localStorage.getItem(PROJECT_SORT_KEY) || 'name'
}

// 儲存專案排序偏好
function saveProjectSortBy(sortBy: string): void {
  localStorage.setItem(PROJECT_SORT_KEY, sortBy)
}

// 專案排序方式
const projectSortBy = ref<string>(loadProjectSortBy())

// 設定專案排序
function setProjectSort(sortBy: string): void {
  projectSortBy.value = sortBy
  saveProjectSortBy(sortBy)
}

// 判斷專案是否展開（預設為展開）
function isProjectExpanded(projectId: string): boolean {
  return projectExpandState.value[projectId] ?? true
}

// 切換專案展開/收合狀態
function toggleProjectExpanded(projectId: string): void {
  const currentState = isProjectExpanded(projectId)
  projectExpandState.value[projectId] = !currentState
  saveProjectExpandState(projectExpandState.value)
}

// 計算專案統計資訊
function getProjectStats(tasks: Task[]): {
  total: number
  completed: number
  inProgress: number
  overdue: number
  priority: { high: number; medium: number; low: number }
  progress: number
} {
  const total = tasks.length
  const completed = tasks.filter(task => task.statusId === 'completed').length
  const inProgress = tasks.filter(task => task.statusId === 'in-progress').length
  const overdue = tasks.filter(task => {
    if (!task.endDateTime) return false
    return new Date(task.endDateTime) < new Date() && task.statusId !== 'completed'
  }).length
  
  const priority = {
    high: tasks.filter(task => task.priorityId === 'high').length,
    medium: tasks.filter(task => task.priorityId === 'medium').length,
    low: tasks.filter(task => task.priorityId === 'low').length
  }
  
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return {
    total,
    completed,
    inProgress,
    overdue,
    priority,
    progress
  }
}

// 事件處理函數
async function handleTasksReorder(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<void> {
  const success = await taskStore.batchUpdateTasks(updates)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務順序已更新',
      position: 'top'
    })
  }
}

async function handleAddSubtask(parentTask: Task, title: string): Promise<void> {
  const newTask = await taskStore.addSubtask(parentTask, title)
  if (newTask) {
    $q.notify({
      type: 'positive',
      message: `子任務「${title}」已建立`,
      position: 'top'
    })
  }
}

async function handleIndentTask(task: Task): Promise<void> {
  const success = await taskStore.indentTaskAction(task)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務層級已調整',
      position: 'top'
    })
  }
}

async function handleOutdentTask(task: Task): Promise<void> {
  const success = await taskStore.outdentTaskAction(task)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務層級已調整',
      position: 'top'
    })
  }
}

async function handleToggleExpanded(task: Task): Promise<void> {
  const success = await taskStore.toggleTaskExpanded(task)
  if (!success) {
    $q.notify({
      type: 'negative',
      message: '更新任務狀態失敗',
      position: 'top'
    })
  }
}

// 根據專案分組任務，並計算統計資訊
const groupedTasks = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return new Map()
  }

  const grouped = new Map<string, Task[]>()

  props.tasks.forEach(task => {
    const projectId = task.projectId
    if (!grouped.has(projectId)) {
      grouped.set(projectId, [])
    }
    grouped.get(projectId)!.push(task)
  })

  // 每個分組內部排序（任務排序）
  grouped.forEach((tasks) => {
    tasks.sort((a, b) => {
      // 按 order 排序，然後按建立時間
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  return grouped
})

// 排序後的專案分組
const sortedGroupedTasks = computed(() => {
  const entries = Array.from(groupedTasks.value.entries())
  
  // 根據選擇的排序方式排序專案
  entries.sort(([projectIdA, _tasksA], [projectIdB, _tasksB]) => {
    const statsA = projectStatsCache.value.get(projectIdA)
    const statsB = projectStatsCache.value.get(projectIdB)
    
    if (!statsA || !statsB) return 0
    
    if (projectSortBy.value === 'name') {
      const nameA = getProjectName(projectIdA)
      const nameB = getProjectName(projectIdB)
      return nameA.localeCompare(nameB)
    } else if (projectSortBy.value === 'taskCount') {
      return statsB.total - statsA.total // 降序
    } else if (projectSortBy.value === 'progress') {
      return statsB.progress - statsA.progress // 降序
    } else if (projectSortBy.value === 'overdue') {
      return statsB.overdue - statsA.overdue // 降序
    }
    
    return 0
  })
  
  return new Map(entries)
})

// 專案統計資訊快取
const projectStatsCache = computed(() => {
  const cache = new Map<string, ReturnType<typeof getProjectStats>>()
  
  groupedTasks.value.forEach((tasks, projectId) => {
    cache.set(projectId, getProjectStats(tasks))
  })
  
  return cache
})

// 取得專案統計資訊（從快取）
function getCachedProjectStats(projectId: string): {
  total: number
  completed: number
  inProgress: number
  overdue: number
  priority: { high: number; medium: number; low: number }
  progress: number
} {
  return projectStatsCache.value.get(projectId) || {
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    priority: { high: 0, medium: 0, low: 0 },
    progress: 0
  }
}

// 取得專案名稱
function getProjectName(projectId: string): string {
  if (projectNamesCache.has(projectId)) {
    return projectNamesCache.get(projectId)!
  }

  // 異步載入專案名稱
  projectRepo.findById(projectId).then(project => {
    if (project) {
      projectNamesCache.set(projectId, project.name)
    }
  }).catch(console.error)

  return '載入中...'
}
</script>

<style scoped lang="scss">
.task-list-view {
  .project-group {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .project-group-header {
      border-bottom: 1px solid #e0e0e0;
      transition: background-color 0.2s ease;
      
      &:hover {
        background-color: #f5f5f5 !important;
      }

      .project-stats {
        .q-badge {
          font-size: 11px;
          font-weight: 500;
        }
      }
    }

    .project-tasks {
      .task-item:last-child {
        border-bottom: none;
      }
    }
  }

  .task-list {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    .task-item:last-child {
      border-bottom: none;
    }
  }

  // 響應式設計優化
  @media (max-width: 600px) {
    .project-group {
      .project-group-header {
        .project-stats {
          flex-wrap: wrap;
          gap: 2px;

          .q-badge {
            font-size: 10px;
            padding: 2px 6px;
          }
        }
      }
    }
  }

  // 統計 Badge 顏色優化
  .project-stats {
    .q-badge {
      border-radius: 4px;
      text-shadow: none;
    }
  }
}
</style>
