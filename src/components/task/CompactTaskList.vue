<template>
  <div class="compact-task-list">
    <!-- Render flattened task tree with proper indentation -->
    <VueDraggable
      v-model="flattenedTasks"
      group="tasks"
      :animation="150"
      ghost-class="task-ghost"
      chosen-class="task-chosen"
      drag-class="task-drag"
      handle=".drag-handle"
      :fallback-on-body="true"
      :swap-threshold="0.65"
      @start="onDragStart"
      @end="onDragEnd"
      @change="onTaskChange"
    >
      <template v-for="(task, index) in flattenedTasks" :key="task.taskId">
        <!-- Task Item -->
        <TaskItem
          :task="task"
          :level="task.level || 0"
          :has-children="hasChildren(task.taskId)"
          :is-expanded="task.isExpanded"
          :is-selected="selectedTasks.has(task.taskId)"
          :show-project="showProject"
          :children-count="getChildrenCount(task.taskId)"
          @click="$emit('task-click', task)"
          @toggle-expand="handleToggleExpand(task)"
          @add-subtask="handleAddSubtask(task)"
          @edit="$emit('edit-task', task)"
          @duplicate="$emit('duplicate-task', task)"
          @delete="$emit('delete-task', task)"
          @status-change="handleStatusChange(task, $event)"
          @toggle-selection="handleToggleSelection(task.taskId, $event)"
        />

        <!-- Quick Add for expanded tasks (參考 mpi-app TaskList 邏輯) -->
        <QuickAddTask
          v-if="shouldShowQuickAddAfterTask(task, index)"
          :parent-id="task.taskId"
          :level="(task.level || 0) + 1"
          :project-id="projectId"
          @task-added="$emit('task-added', $event)"
        />
      </template>
    </VueDraggable>

    <!-- Quick Add Task -->
    <QuickAddTask
      v-if="!isVirtualProjectGroup"
      :parent-id="parentId"
      :level="level || 0"
      :project-id="projectId"
      @task-added="$emit('task-added', $event)"
    />

    <!-- Empty state -->
    <div v-if="flattenedTasks.length === 0" class="empty-state q-pa-lg text-center">
      <q-icon name="task_alt" size="3em" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-6">暫無任務</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        使用下方快速新增功能建立第一個任務
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { SortableEvent } from 'sortablejs'
import type { Task } from '@/types'
import TaskItem from './TaskItem.vue'
import QuickAddTask from './QuickAddTask.vue'
import { useNestedTasks } from '@/composables/useNestedTasks'

// Props
const props = defineProps<{
  tasks: Task[]
  showProject?: boolean
  selectedTasks?: Set<string>
  parentId?: string
  level?: number
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [data: { taskId: string; updates: Partial<Task> }]
  'tasks-reorder': [updates: Array<{ taskId: string; updates: Partial<Task> }>]
  'add-subtask': [task: Task]
  'edit-task': [task: Task]
  'duplicate-task': [task: Task]
  'delete-task': [task: Task]
  'task-added': [task: Task]
  'toggle-selection': [data: { taskId: string; selected: boolean }]
}>()

const { buildTaskTree } = useNestedTasks()

// 本地狀態
const localTaskList = ref<Task[]>([])
const selectedTasks = ref<Set<string>>(props.selectedTasks || new Set())

// 計算屬性
const taskList = computed(() => {
  if (!props.tasks || props.tasks.length === 0) {
    return []
  }
  return buildTaskTree(props.tasks)
})

const flattenedTasks = computed(() => {
  const flattenWithLevel = (tasks: Task[], level = 0, parentExpanded = true): Task[] => {
    const result: Task[] = []
    
    if (!tasks || tasks.length === 0) {
      return result
    }

    tasks.forEach(task => {
      // Add level information to task
      const taskWithLevel = { ...task, level }
      
      // Only show task if parent is expanded (or it's root level)
      if (parentExpanded) {
        result.push(taskWithLevel)
      }

      // If task is expanded and has children, recursively flatten children
      // Default isExpanded to true if it's undefined and has children
      const taskExpanded = task.isExpanded !== false
      if (taskExpanded && task.children && task.children.length > 0 && parentExpanded) {
        result.push(...flattenWithLevel(task.children, level + 1, true))
      }
    })

    return result
  }

  return flattenWithLevel(localTaskList.value || [], props.level || 0)
})

const isVirtualProjectGroup = computed(() => {
  // Only hide quick add in all tasks view root level or for virtual project groups
  return (props.projectId === 'all' && !props.parentId) ||
         (props.parentId && props.parentId.startsWith('project-group-'))
})

// 監聽變化
watch(taskList, (newTasks) => {
  localTaskList.value = [...newTasks]
}, { immediate: true, deep: true })

// 移除不必要的 watch，避免循環依賴

watch(() => props.selectedTasks, (newSelected) => {
  if (newSelected) {
    selectedTasks.value = newSelected
  }
}, { immediate: true })

// 拖拽處理
let _draggedTask: Task | null = null

function onDragStart(evt: SortableEvent): void {
  const oldIndex = typeof evt.oldIndex === 'number' ? evt.oldIndex : -1
  _draggedTask = oldIndex >= 0 ? (localTaskList.value[oldIndex] ?? null) : null
}

function onDragEnd(_evt: SortableEvent): void {
  _draggedTask = null
}

function onTaskChange(_evt: SortableEvent): void {
  // 更新本地任務列表並重建樹狀結構
  try {
    const updates = flattenedTasks.value.map((task, index) => ({
      taskId: task.taskId,
      updates: { order: (index + 1) * 1000 }
    }))

    if (updates.length > 0) {
      emit('tasks-reorder', updates)
    }
  } catch (error) {
    console.error('Error in onTaskChange:', error)
  }
}

// 輔助函數
function findTaskInTree(tasks: Task[], taskId: string): Task | null {
  if (!tasks || tasks.length === 0) return null
  
  for (const task of tasks) {
    if (task.taskId === taskId) {
      return task
    }
    if (task.children && task.children.length > 0) {
      const found = findTaskInTree(task.children, taskId)
      if (found) return found
    }
  }
  return null
}

function hasChildren(taskId: string): boolean {
  const task = findTaskInTree(localTaskList.value, taskId)
  return !!(task && task.children && task.children.length > 0)
}

function getChildrenCount(taskId: string): number {
  const task = findTaskInTree(localTaskList.value, taskId)
  return task?.children?.length || 0
}

// 判斷是否在任務後顯示 QuickAdd
function shouldShowQuickAddAfterTask(task: Task, index: number): boolean {
  const currentLevel = task.level || 0
  const nextTask = flattenedTasks.value[index + 1]
  
  // 找到當前任務的父任務（層級比當前任務少1的任務）
  let parentTask: Task | null = null
  for (let i = index - 1; i >= 0; i--) {
    const prevTask = flattenedTasks.value[i]
    if ((prevTask.level || 0) === currentLevel - 1) {
      parentTask = prevTask
      break
    }
  }
  
  // 沒有父任務的話，不顯示 QuickAdd
  if (!parentTask) {
    return false
  }
  
  const parentExpanded = parentTask.isExpanded !== false
  const parentHasChildren = hasChildren(parentTask.taskId)
  
  // 父任務必須展開且有子任務
  if (!parentExpanded || !parentHasChildren) {
    return false
  }
  
  // 檢查是否是該父任務的最後一個子任務
  if (!nextTask) {
    return true
  }
  
  const nextLevel = nextTask.level || 0
  
  // 如果下一個任務的層級小於當前層級，表示當前父任務的子任務組結束
  // 這時應該顯示 QuickAdd 讓用戶可以為父任務添加新的子任務
  return nextLevel < currentLevel
}


// 事件處理
function handleToggleExpand(task: Task): void {
  emit('task-update', {
    taskId: task.taskId,
    updates: { isExpanded: !task.isExpanded }
  })
}

function handleAddSubtask(task: Task): void {
  emit('add-subtask', task)
}

function handleStatusChange(task: Task, statusId: string): void {
  emit('task-update', {
    taskId: task.taskId,
    updates: { statusId }
  })
}

function handleToggleSelection(taskId: string, selected: boolean): void {
  emit('toggle-selection', { taskId, selected })
}
</script>

<style scoped lang="scss">
.compact-task-list {
  min-height: 20px;

  .task-ghost {
    opacity: 0.5;
    background: #f5f5f5;
  }

  .task-chosen {
    background: #e3f2fd;
  }

  .task-drag {
    transform: rotate(2deg);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .empty-state {
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
}
</style>