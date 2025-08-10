<template>
  <div class="task-gantt-view">
    <!-- 甘特圖工具欄 -->
    <div class="gantt-toolbar q-pa-xs bg-white border-bottom">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            dense
            icon="today"
            label="今天"
            @click="scrollToToday"
          />
          <q-separator vertical />
          <q-btn
            flat
            dense
            icon="zoom_in"
            @click="zoomIn"
            :disable="ganttSettings.timelineScale === 'day'"
          />
          <q-btn
            flat
            dense
            icon="zoom_out"
            @click="zoomOut"
            :disable="ganttSettings.timelineScale === 'month'"
          />
          <q-separator vertical />
          <q-select
            v-model="ganttSettings.timelineScale"
            :options="timelineScaleOptions"
            emit-value
            map-options
            dense
            outlined
            style="min-width: 80px"
          />
          <q-separator vertical />
          <q-btn
            flat
            dense
            icon="auto_fix_high"
            label="自動排程"
            @click="autoSchedule"
            :loading="isAutoScheduling"
          />
        </div>
        <div class="row items-center q-gutter-sm">
          <q-toggle
            v-model="ganttSettings.showWeekends"
            label="顯示週末"
            size="sm"
          />
          <q-toggle
            v-model="ganttSettings.showDependencies"
            label="依賴關係"
            size="sm"
          />
          <q-toggle
            v-model="ganttSettings.showCriticalPath"
            label="關鍵路徑"
            size="sm"
            @update:model-value="updateCriticalPath"
          />
          <q-toggle
            v-model="ganttSettings.showProgress"
            label="進度條"
            size="sm"
          />
        </div>
      </div>
    </div>

    <!-- 甘特圖主體 -->
    <div class="gantt-container" ref="ganttContainer">
      <div v-if="isLoading" class="text-center q-py-xl">
        <q-spinner-dots size="2rem" color="primary" />
        <div class="text-grey-6 q-mt-md">載入甘特圖資料中...</div>
      </div>

      <template v-else-if="ganttTasks.length > 0">
        <!-- 時間軸標題 -->
        <div class="gantt-timeline-header">
          <div class="task-labels-header">任務</div>
          <div class="timeline-grid">
            <div
              v-for="(label, index) in timelineLabels"
              :key="index"
              class="timeline-label"
              :class="{ 'weekend': isWeekend(index) && !ganttSettings.showWeekends }"
            >
              {{ label }}
            </div>
          </div>
        </div>

        <!-- 任務行 -->
        <div class="gantt-rows">
          <div
            v-for="task in visibleGanttTasks"
            :key="task.taskId"
            class="gantt-row"
            :class="{
              'gantt-row--critical': task.ganttCritical && ganttSettings.showCriticalPath,
              'gantt-row--completed': task.statusId === 'done',
              'gantt-row--overdue': isTaskOverdue(task)
            }"
          >
            <!-- 任務標籤 -->
            <div class="task-label">
              <div
                class="task-info"
                :style="{ paddingLeft: `${(task.level || 0) * 20}px` }"
                @click="handleTaskClick(task)"
              >
                <!-- 展開/收合按鈕 -->
                <q-btn
                  v-if="hasChildren(task)"
                  :icon="isExpanded(task.taskId) ? 'expand_more' : 'chevron_right'"
                  flat
                  dense
                  size="xs"
                  @click.stop="toggleTaskExpanded(task)"
                  class="expand-btn q-mr-xs"
                />

                <!-- 任務圖標 -->
                <q-icon
                  :name="getTaskIcon(task)"
                  :color="getTaskColor(task)"
                  size="sm"
                  class="q-mr-xs"
                />

                <!-- 任務標題 -->
                <span class="task-title">{{ task.title }}</span>

                <!-- 指派人員 -->
                <q-avatar
                  v-if="task.assigneeId"
                  size="16px"
                  color="primary"
                  text-color="white"
                  class="q-ml-xs"
                >
                  {{ getUserInitials(task.assigneeId) }}
                </q-avatar>
              </div>

              <!-- 任務詳細信息 -->
              <div class="task-details text-caption text-grey-6">
                {{ formatTaskDuration(task) }}
                <span v-if="task.ganttProgress > 0" class="q-ml-sm">
                  ({{ task.ganttProgress }}%)
                </span>
              </div>
            </div>

            <!-- 甘特圖條 -->
            <div class="gantt-timeline">
              <div class="timeline-grid">
                <div
                  v-for="(_, dayIndex) in timelineLabels"
                  :key="dayIndex"
                  class="timeline-cell"
                  :class="{ 'weekend': isWeekend(dayIndex) && ganttSettings.showWeekends }"
                />
              </div>

              <!-- 任務條 -->
              <div
                class="gantt-bar"
                :class="{
                  'gantt-bar--completed': task.statusId === 'done',
                  'gantt-bar--in-progress': task.statusId === 'in-progress',
                  'gantt-bar--overdue': isTaskOverdue(task),
                  'gantt-bar--critical': task.ganttCritical && ganttSettings.showCriticalPath
                }"
                :style="getTaskBarStyle(task)"
                @click="handleTaskClick(task)"
              >
                <!-- 進度條 -->
                <div
                  v-if="ganttSettings.showProgress && task.ganttProgress > 0"
                  class="progress-bar"
                  :style="{ width: `${task.ganttProgress}%` }"
                />

                <!-- 任務標題 -->
                <span class="bar-text">{{ task.title }}</span>
              </div>

              <!-- 依賴線 -->
              <svg
                v-if="ganttSettings.showDependencies"
                class="dependency-lines"
                :width="timelineWidth"
                :height="50"
              >
                <path
                  v-for="dep in getTaskDependencyLines(task)"
                  :key="dep.id"
                  :d="dep.path"
                  stroke="#666"
                  stroke-width="2"
                  fill="none"
                  marker-end="url(#arrowhead)"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- SVG 定義 (箭頭標記) -->
        <svg width="0" height="0">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#666"
              />
            </marker>
          </defs>
        </svg>
      </template>

      <div v-else class="text-center q-py-xl text-grey-6">
        <q-icon name="timeline" size="3rem" class="q-mb-md" />
        <div>沒有任務資料可顯示</div>
      </div>
    </div>

    <!-- 關鍵路徑信息 -->
    <div v-if="ganttSettings.showCriticalPath && criticalPath.taskIds.length > 0" class="critical-path-info q-pa-md bg-orange-1 border-top">
      <div class="row items-center">
        <q-icon name="timeline" color="orange" class="q-mr-sm" />
        <div>
          <strong>關鍵路徑:</strong> {{ criticalPath.taskIds.length }} 個任務，
          總工期 {{ Math.ceil(criticalPath.totalDuration) }} 天，
          預計完成日期 {{ formatDate(criticalPath.endDate) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useNestedTasks } from '@/composables/useNestedTasks'
import { useGanttEnhancements } from '@/composables/useGanttEnhancements'
import { useCurrentUser } from '@/composables/useCurrentUser'
import type { Task } from '@/types'
import type { GanttTask, CriticalPath } from '@/composables/useGanttEnhancements'

interface Props {
  tasks: Task[]
  projectId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  taskClick: [task: Task]
  taskUpdate: [task: Task]
}>()

const $q = useQuasar()
const ganttContainer = ref<HTMLElement>()

// Composables
const { toggleTaskExpanded } = useNestedTasks()

// 本地實作 hasChildren 和 isExpanded 函數
function hasChildren(taskId: string): boolean {
  return ganttTasks.value.some(task => task.parentTaskId === taskId)
}

function isExpanded(taskId: string): boolean {
  const task = ganttTasks.value.find(t => t.taskId === taskId)
  return task ? task.isExpanded : false
}
const {
  settings: ganttSettings,
  timelineScaleOptions,
  convertToGanttTasks,
  calculateCriticalPath,
  autoScheduleTasks,
  getTimelineRange,
  generateTimelineLabels
} = useGanttEnhancements()
const { getUserDisplayName } = useCurrentUser()

// 狀態
const isLoading = ref(false)
const isAutoScheduling = ref(false)
const ganttTasks = ref<GanttTask[]>([])
const criticalPath = ref<CriticalPath>({ taskIds: [], totalDuration: 0, endDate: new Date() })
const timelineRange = ref({ start: new Date(), end: new Date() })

// 計算屬性
const visibleGanttTasks = computed(() => {
  return ganttTasks.value.filter(task => {
    // 檢查父任務是否展開
    if (task.parentTaskId) {
      const parent = ganttTasks.value.find(t => t.taskId === task.parentTaskId)
      return parent ? isExpanded(parent.taskId) : true
    }
    return true
  })
})

const timelineLabels = computed(() => {
  return generateTimelineLabels(
    timelineRange.value.start,
    timelineRange.value.end,
    ganttSettings.value.timelineScale
  )
})

const timelineWidth = computed(() => {
  return timelineLabels.value.length * 100 // 每個時間段100px寬度
})

// 方法
function initializeGanttData(): void {
  if (props.tasks.length === 0) return

  isLoading.value = true
  try {
    ganttTasks.value = convertToGanttTasks(props.tasks)
    timelineRange.value = getTimelineRange(ganttTasks.value)

    if (ganttSettings.value.showCriticalPath) {
      updateCriticalPath()
    }
  } finally {
    isLoading.value = false
  }
}

function updateCriticalPath(): void {
  if (ganttTasks.value.length === 0) return

  criticalPath.value = calculateCriticalPath(ganttTasks.value)
}

function autoSchedule(): void {
  if (ganttTasks.value.length === 0) return

  isAutoScheduling.value = true
  try {
    ganttTasks.value = autoScheduleTasks(ganttTasks.value)
    timelineRange.value = getTimelineRange(ganttTasks.value)

    if (ganttSettings.value.showCriticalPath) {
      updateCriticalPath()
    }

    $q.notify({
      type: 'positive',
      message: '任務已自動重新排程',
      position: 'top'
    })
  } finally {
    isAutoScheduling.value = false
  }
}

function scrollToToday(): void {
  // 簡化實作：滾動到當前日期
  if (ganttContainer.value) {
    ganttContainer.value.scrollLeft = 200 // 估算位置
  }
}

function zoomIn(): void {
  const scales = ['month', 'week', 'day']
  const currentIndex = scales.indexOf(ganttSettings.value.timelineScale)
  if (currentIndex < scales.length - 1) {
    ganttSettings.value.timelineScale = scales[currentIndex + 1] as 'month' | 'week' | 'day'
    updateTimeline()
  }
}

function zoomOut(): void {
  const scales = ['month', 'week', 'day']
  const currentIndex = scales.indexOf(ganttSettings.value.timelineScale)
  if (currentIndex > 0) {
    ganttSettings.value.timelineScale = scales[currentIndex - 1] as 'month' | 'week' | 'day'
    updateTimeline()
  }
}

function updateTimeline(): void {
  timelineRange.value = getTimelineRange(ganttTasks.value)
}

function handleTaskClick(task: GanttTask): void {
  emit('taskClick', task)
}

function isTaskOverdue(task: GanttTask): boolean {
  if (!task.endDateTime || task.statusId === 'done') return false
  return new Date(task.endDateTime) < new Date()
}

function getTaskIcon(task: GanttTask): string {
  if (task.statusId === 'done') return 'check_circle'
  if (task.statusId === 'in-progress') return 'schedule'
  if (isTaskOverdue(task)) return 'warning'
  return 'radio_button_unchecked'
}

function getTaskColor(task: GanttTask): string {
  if (task.statusId === 'done') return 'positive'
  if (task.statusId === 'in-progress') return 'orange'
  if (isTaskOverdue(task)) return 'negative'
  return 'grey-6'
}

function getUserInitials(userId: string): string {
  const name = getUserDisplayName(userId)
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function formatTaskDuration(task: GanttTask): string {
  const duration = Math.ceil(
    (task.ganttEndDate.getTime() - task.ganttStartDate.getTime()) / (24 * 60 * 60 * 1000)
  )
  return `${duration} 天 (${formatDate(task.ganttStartDate)} - ${formatDate(task.ganttEndDate)})`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

function isWeekend(dayIndex: number): boolean {
  const date = new Date(timelineRange.value.start)
  date.setDate(date.getDate() + dayIndex)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // 周日或周六
}

function getTaskBarStyle(task: GanttTask): Record<string, string> {
  // 計算任務條的位置和寬度
  const rangeStart = timelineRange.value.start.getTime()
  const rangeEnd = timelineRange.value.end.getTime()
  const totalRange = rangeEnd - rangeStart

  const taskStart = task.ganttStartDate.getTime()
  const taskEnd = task.ganttEndDate.getTime()

  const leftPercent = ((taskStart - rangeStart) / totalRange) * 100
  const widthPercent = ((taskEnd - taskStart) / totalRange) * 100

  return {
    left: `${Math.max(0, leftPercent)}%`,
    width: `${Math.min(100 - leftPercent, widthPercent)}%`
  }
}

function getTaskDependencyLines(task: GanttTask): Array<{ id: string; path: string }> {
  // 簡化實作：返回依賴線的 SVG 路徑
  if (!task.ganttDependencies.length) return []

  return task.ganttDependencies.map(depId => ({
    id: `${depId}-${task.taskId}`,
    path: `M 10,25 L 50,25` // 簡化的直線
  }))
}

// 監聽器
watch(() => props.tasks, initializeGanttData, { immediate: false })

watch(() => ganttSettings.value.timelineScale, updateTimeline)

// 初始化
onMounted(() => {
  initializeGanttData()
})
</script>

<style scoped lang="scss">
.task-gantt-view {
  .gantt-toolbar {
    border-bottom: 1px solid #e0e0e0;

    .q-toggle {
      font-size: 0.875rem;
    }
  }

  .gantt-container {
    overflow: auto;
    max-height: calc(100vh - 200px);
  }

  .gantt-timeline-header {
    display: flex;
    position: sticky;
    top: 0;
    background: white;
    z-index: 2;
    border-bottom: 2px solid #e0e0e0;

    .task-labels-header {
      width: 300px;
      min-width: 300px;
      padding: 1rem;
      font-weight: bold;
      background: #f5f5f5;
      border-right: 1px solid #e0e0e0;
    }

    .timeline-grid {
      display: flex;
      flex: 1;

      .timeline-label {
        min-width: 100px;
        padding: 1rem 0.5rem;
        text-align: center;
        border-right: 1px solid #e0e0e0;
        font-size: 0.875rem;
        background: #fafafa;

        &.weekend {
          background: #f0f0f0;
          color: #999;
        }
      }
    }
  }

  .gantt-rows {
    .gantt-row {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      min-height: 50px;

      &:hover {
        background: rgba(25, 118, 210, 0.04);
      }

      &.gantt-row--critical {
        background: rgba(255, 152, 0, 0.1);
      }

      &.gantt-row--completed {
        opacity: 0.7;
      }

      &.gantt-row--overdue {
        background: rgba(244, 67, 54, 0.05);
      }
    }

    .task-label {
      width: 300px;
      min-width: 300px;
      padding: 0.5rem;
      border-right: 1px solid #e0e0e0;
      background: white;

      .task-info {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;

        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .task-title {
          flex: 1;
          font-size: 0.875rem;
        }

        .expand-btn {
          min-width: auto;
          width: 20px;
          height: 20px;
        }
      }

      .task-details {
        padding-left: 1rem;
        margin-top: 0.25rem;
      }
    }

    .gantt-timeline {
      flex: 1;
      position: relative;

      .timeline-grid {
        display: flex;
        height: 100%;

        .timeline-cell {
          min-width: 100px;
          border-right: 1px solid #e0e0e0;

          &.weekend {
            background: #f9f9f9;
          }
        }
      }

      .gantt-bar {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        height: 24px;
        background: #2196F3;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0 0.5rem;
        color: white;
        font-size: 0.75rem;
        overflow: hidden;

        &:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        &.gantt-bar--completed {
          background: #4CAF50;
        }

        &.gantt-bar--in-progress {
          background: #FF9800;
        }

        &.gantt-bar--overdue {
          background: #F44336;
        }

        &.gantt-bar--critical {
          background: #E91E63;
          box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.3);
        }

        .progress-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px 0 0 4px;
        }

        .bar-text {
          position: relative;
          z-index: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .dependency-lines {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
      }
    }
  }

  .critical-path-info {
    border-top: 1px solid #e0e0e0;
  }
}
</style>
