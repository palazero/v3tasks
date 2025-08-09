<template>
  <div class="task-gantt-view">
    <!-- 甘特圖工具欄 -->
    <div class="gantt-toolbar q-pa-md bg-white border-bottom">
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
          />
          <q-btn
            flat
            dense
            icon="zoom_out"
            @click="zoomOut"
          />
          <q-separator vertical />
          <q-select
            v-model="timelineScale"
            :options="timelineScaleOptions"
            emit-value
            map-options
            dense
            outlined
            style="min-width: 100px"
          />
        </div>
        <div class="row items-center q-gutter-sm">
          <q-toggle
            v-model="showDependencies"
            label="顯示依賴關係"
          />
          <q-toggle
            v-model="showCriticalPath"
            label="關鍵路徑"
          />
        </div>
      </div>
    </div>

    <!-- 甘特圖主體 -->
    <div class="gantt-container" ref="ganttContainer">
      <g-gantt-chart
        :chart-start="chartStart"
        :chart-end="chartEnd"
        precision="day"
        :bar-start="barStart"
        :bar-end="barEnd"
        :date-format="dateFormat"
        :width="ganttWidth"
        :height="ganttHeight"
        :grid="true"
        :push-on-overlap="false"
        :theme="ganttTheme"
      >
        <!-- 甘特圖列 -->
        <g-gantt-row
          v-for="task in ganttTasks"
          :key="task.taskId"
          :label="task.title"
          :bars="[task.ganttBar]"
          :highlight-on-hover="true"
        >
          <!-- 任務標籤模板 -->
          <template #label="{ bar, label }">
            <div 
              class="gantt-task-label"
              :class="{
                'gantt-task-label--completed': task.statusId === 'done',
                'gantt-task-label--overdue': isTaskOverdue(task)
              }"
              :style="{ paddingLeft: `${(task.level || 0) * 20}px` }"
              @click="$emit('task-click', task)"
            >
              <!-- 展開/收合按鈕 -->
              <q-btn
                v-if="hasChildren(task)"
                :icon="task.isExpanded ? 'expand_more' : 'chevron_right'"
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
              <span class="task-title">{{ label }}</span>
              
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
          </template>

          <!-- 任務條模板 -->
          <template #bar="{ bar }">
            <div 
              class="gantt-task-bar"
              :class="{
                'gantt-task-bar--completed': task.statusId === 'done',
                'gantt-task-bar--in-progress': task.statusId === 'inProgress',
                'gantt-task-bar--overdue': isTaskOverdue(task),
                'gantt-task-bar--critical': isCriticalTask(task)
              }"
              @click="$emit('task-click', task)"
            >
              <!-- 進度條 -->
              <div 
                v-if="task.progress && task.progress > 0"
                class="progress-overlay"
                :style="{ width: `${task.progress}%` }"
              />
              
              <!-- 任務標題（在條內顯示） -->
              <span class="bar-text">{{ task.title }}</span>
            </div>
          </template>
        </g-gantt-row>
      </g-gantt-chart>

      <!-- 依賴關係線條 -->
      <svg
        v-if="showDependencies"
        class="dependency-overlay"
        :width="ganttWidth"
        :height="ganttHeight"
      >
        <g v-for="dependency in taskDependencies" :key="`${dependency.from}-${dependency.to}`">
          <path
            :d="getDependencyPath(dependency)"
            stroke="#666"
            stroke-width="2"
            fill="none"
            marker-end="url(#arrowhead)"
            :class="{ 'critical-path': isCriticalDependency(dependency) }"
          />
        </g>
        
        <!-- 箭頭標記定義 -->
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
// Note: @infectoone/vue-ganttastic would be imported here when available
// import { GGanttChart, GGanttRow } from '@infectoone/vue-ganttastic'
import type { Task, View } from '@/types'
import { useNestedTasks } from '@/composables/useNestedTasks'
import { useTaskDependencies } from '@/composables/useTaskDependencies'

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

const { buildTaskTree } = useNestedTasks()
const { getProjectDependencyGraph } = useTaskDependencies()

// 甘特圖容器引用
const ganttContainer = ref<HTMLElement>()

// 甘特圖配置
const timelineScale = ref('day')
const showDependencies = ref(true)
const showCriticalPath = ref(false)
const ganttWidth = ref(1200)
const ganttHeight = ref(600)

// 時間軸配置選項
const timelineScaleOptions = [
  { label: '小時', value: 'hour' },
  { label: '天', value: 'day' },
  { label: '週', value: 'week' },
  { label: '月', value: 'month' }
]

// 甘特圖主題
const ganttTheme = {
  primaryColor: '#1976d2',
  backgroundColor: '#ffffff',
  borderColor: '#e0e0e0',
  textColor: '#424242'
}

// 計算圖表時間範圍
const chartStart = computed(() => {
  const dates = props.tasks
    .filter(task => task.startDateTime)
    .map(task => new Date(task.startDateTime!))
  
  if (dates.length === 0) {
    return new Date()
  }
  
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  // 提前一週顯示
  minDate.setDate(minDate.getDate() - 7)
  return minDate
})

const chartEnd = computed(() => {
  const dates = props.tasks
    .filter(task => task.endDateTime)
    .map(task => new Date(task.endDateTime!))
  
  if (dates.length === 0) {
    const end = new Date()
    end.setMonth(end.getMonth() + 3)
    return end
  }
  
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  // 延後一週顯示
  maxDate.setDate(maxDate.getDate() + 7)
  return maxDate
})

// 樹狀結構任務
const nestedTasks = computed(() => buildTaskTree(props.tasks))

// 甘特圖任務數據（扁平化但保留層級）
const ganttTasks = computed(() => {
  const flattenTasks = (tasks: Task[], level = 0): Task[] => {
    const result: Task[] = []
    
    tasks.forEach(task => {
      const taskWithLevel = { ...task, level }
      result.push(taskWithLevel)
      
      // 如果有子任務且展開狀態
      if (task.children && task.children.length > 0 && task.isExpanded) {
        result.push(...flattenTasks(task.children, level + 1))
      }
    })
    
    return result
  }
  
  return flattenTasks(nestedTasks.value).map(task => ({
    ...task,
    ganttBar: {
      id: task.taskId,
      label: task.title,
      start: task.startDateTime || new Date(),
      end: task.endDateTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 預設7天後
      progress: task.progress || 0,
      color: getGanttBarColor(task),
      style: getGanttBarStyle(task)
    }
  }))
})

// 任務依賴關係
const taskDependencies = computed(() => {
  const dependencyGraph = getProjectDependencyGraph(props.tasks)
  return dependencyGraph.edges
})

// 日期格式化
const dateFormat = 'YYYY-MM-DD'

// 甘特圖條開始時間取值函數
function barStart(bar: any): string {
  return bar.start.toISOString()
}

// 甘特圖條結束時間取值函數
function barEnd(bar: any): string {
  return bar.end.toISOString()
}

// 取得甘特條顏色
function getGanttBarColor(task: Task): string {
  if (task.statusId === 'done') return '#4caf50'
  if (task.statusId === 'inProgress') return '#ff9800'
  if (isTaskOverdue(task)) return '#f44336'
  return '#2196f3'
}

// 取得甘特條樣式
function getGanttBarStyle(task: Task): Record<string, string> {
  const style: Record<string, string> = {}
  
  if (task.statusId === 'done') {
    style.opacity = '0.7'
  }
  
  if (isCriticalTask(task)) {
    style.border = '2px solid #ff5722'
  }
  
  return style
}

// 是否有子任務
function hasChildren(task: Task): boolean {
  return !!(task.children && task.children.length > 0)
}

// 切換任務展開狀態
function toggleTaskExpanded(task: Task): void {
  emit('task-update', task.taskId, { isExpanded: !task.isExpanded })
}

// 是否逾期
function isTaskOverdue(task: Task): boolean {
  if (!task.endDateTime || task.statusId === 'done') return false
  return new Date(task.endDateTime) < new Date()
}

// 是否為關鍵任務
function isCriticalTask(task: Task): boolean {
  // 簡化實作：有依賴關係且時間緊迫的任務
  return !!(task.dependencyIds && task.dependencyIds.length > 0 && isTaskOverdue(task))
}

// 是否為關鍵依賴
function isCriticalDependency(dependency: { from: string; to: string }): boolean {
  const fromTask = props.tasks.find(t => t.taskId === dependency.from)
  const toTask = props.tasks.find(t => t.taskId === dependency.to)
  return showCriticalPath.value && !!(fromTask && toTask && 
    isCriticalTask(fromTask) && isCriticalTask(toTask))
}

// 取得任務圖標
function getTaskIcon(task: Task): string {
  if (task.children && task.children.length > 0) {
    return 'account_tree'
  }
  
  if (task.statusId === 'done') return 'check_circle'
  if (task.statusId === 'inProgress') return 'play_circle'
  return 'radio_button_unchecked'
}

// 取得任務顏色
function getTaskColor(task: Task): string {
  if (task.statusId === 'done') return 'green'
  if (task.statusId === 'inProgress') return 'orange'
  if (isTaskOverdue(task)) return 'red'
  return 'grey'
}

// 取得用戶姓名縮寫
function getUserInitials(userId: string): string {
  return userId.substring(0, 2).toUpperCase()
}

// 取得依賴關係路徑（SVG路徑）
function getDependencyPath(dependency: { from: string; to: string }): string {
  // 簡化實作：直線連接
  // 實際應該根據任務在甘特圖中的位置計算路徑
  return `M 0 0 L 100 100`
}

// 工具欄功能
function scrollToToday(): void {
  // 滾動到今天的位置
  console.log('Scroll to today')
}

function zoomIn(): void {
  // 放大甘特圖
  ganttWidth.value = Math.min(ganttWidth.value * 1.2, 3000)
}

function zoomOut(): void {
  // 縮小甘特圖
  ganttWidth.value = Math.max(ganttWidth.value * 0.8, 800)
}

// 組件掛載時調整尺寸
onMounted(() => {
  if (ganttContainer.value) {
    const containerWidth = ganttContainer.value.clientWidth
    ganttWidth.value = Math.max(containerWidth, 1200)
    ganttHeight.value = Math.max(props.tasks.length * 40, 400)
  }
})
</script>

<style scoped lang="scss">
.task-gantt-view {
  background-color: $grey-1;
  height: 100%;
  
  .gantt-toolbar {
    background-color: white;
    border-bottom: 1px solid $grey-4;
  }
  
  .gantt-container {
    overflow: auto;
    height: calc(100vh - 200px);
    
    // 甘特圖任務標籤樣式
    .gantt-task-label {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background-color: white;
      border-bottom: 1px solid $grey-3;
      cursor: pointer;
      
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
      
      .expand-btn {
        min-width: 20px;
      }
      
      .task-title {
        font-weight: 500;
      }
    }
    
    // 甘特圖任務條樣式
    .gantt-task-bar {
      position: relative;
      height: 100%;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      &--completed {
        background-color: #4caf50 !important;
        opacity: 0.8;
      }
      
      &--in-progress {
        background-color: #ff9800 !important;
      }
      
      &--overdue {
        background-color: #f44336 !important;
        animation: pulse 2s infinite;
      }
      
      &--critical {
        border: 2px solid #ff5722;
        box-shadow: 0 0 8px rgba(255, 87, 34, 0.3);
      }
      
      .progress-overlay {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 4px 0 0 4px;
        border-right: 2px solid rgba(255, 255, 255, 0.8);
      }
      
      .bar-text {
        color: white;
        font-size: 12px;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
        padding: 0 8px;
      }
    }
    
    // 依賴關係線條樣式
    .dependency-overlay {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 10;
      
      path {
        opacity: 0.7;
        
        &.critical-path {
          stroke: #ff5722;
          stroke-width: 3px;
          opacity: 1;
        }
      }
    }
  }
}

// 脈衝動畫
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>