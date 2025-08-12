<template>
  <div class="kanban-view-wrapper">

    <!-- Kanban Board -->
    <div class="kanban-content">
      <div class="kanban-board">
        <!-- Status Columns -->
        <div
          v-for="column in kanbanColumns"
          :key="column.status"
          class="kanban-column"
          :class="`column-${column.status}`"
        >
          <!-- Column Header -->
          <div class="column-header" :style="{ backgroundColor: column.color }">
            <div class="column-title">
              <q-icon :name="column.icon" />
              <span>{{ column.title }}</span>
            </div>
            <div class="column-count">
              {{ getColumnTaskCount(column.status) }}
            </div>
          </div>

          <!-- Task Cards Container -->
          <div class="column-content">
            <VueDraggable
              v-model="column.tasks"
              group="kanban"
              :animation="200"
              @start="onDragStart"
              @end="onDragEnd"
              class="task-list"
              :data-column-status="column.status"
            >
              <!-- Task Cards -->
              <div
                v-for="task in column.tasks"
                :key="task.taskId"
                class="draggable-task-wrapper"
                @contextmenu.prevent="showTaskMenu(task, $event)"
              >
                <TaskCard
                  :task="task"
                  :show-project="props.projectId === 'all'"
                  :project-id="props.projectId"
                  @click="editTask(task.taskId)"
                  class="kanban-task-card"
                  :data-task-id="task.taskId"
                />
              </div>

              <!-- Add Task Button -->
              <div class="add-task-card" @click="addTaskToColumn(column.status)">
                <q-icon name="add" />
                <span>新增任務</span>
              </div>
            </VueDraggable>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Menu -->
    <q-menu
      ref="taskMenu"
      context-menu
      class="task-context-menu"
    >
      <q-list dense>
        <q-item clickable v-close-popup @click="editSelectedTask">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>編輯任務</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="addSubtaskToSelected">
          <q-item-section avatar>
            <q-icon name="add" />
          </q-item-section>
          <q-item-section>新增子任務</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="duplicateSelectedTask">
          <q-item-section avatar>
            <q-icon name="content_copy" />
          </q-item-section>
          <q-item-section>複製任務</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup @click="deleteSelectedTask">
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section>刪除任務</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { Task, View } from '@/types'
import { useQuasar } from 'quasar'
import TaskCard from '@/components/business/task/TaskCard.vue'

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
  'task-add': [statusId?: string]
  'task-edit': [taskId: string]
  'subtask-add': [parentTaskId: string]
  'task-duplicate': [taskId: string]
  'task-delete': [taskId: string]
  'config-change': [config: Record<string, unknown>]
}>()

const $q = useQuasar()

// Refs
const taskMenu = ref()
const selectedTask = ref<Task | null>(null)
const isDragging = ref(false)

// Kanban columns definition with reactive task arrays
const kanbanColumns = ref([
  {
    status: 'todo' as const,
    title: '待辦',
    icon: 'radio_button_unchecked',
    color: '#f5f5f5',
    tasks: [] as Task[]
  },
  {
    status: 'inProgress' as const,
    title: '進行中',
    icon: 'play_circle',
    color: '#e3f2fd',
    tasks: [] as Task[]
  },
  {
    status: 'done' as const,
    title: '已完成',
    icon: 'check_circle',
    color: '#e8f5e8',
    tasks: [] as Task[]
  }
])

// Computed properties
// 只獲取頂層任務，不展開子任務（避免重複）
const flatTasks = computed(() => {
  // 對於看板視圖，我們不需要展開子任務
  // 因為子任務應該在列表視圖中作為巢狀顯示
  return props.tasks
})

// Helper functions
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = []
  tasks.forEach(task => {
    result.push(task)
    if (task.children && task.children.length > 0) {
      result.push(...flattenTasks(task.children))
    }
  })
  return result
}


function getColumnTaskCount(status: string): number {
  const column = kanbanColumns.value.find(col => col.status === status)
  return column?.tasks.length || 0
}


// Synchronize tasks from props to local kanban columns
function syncTasksToColumns(): void {
  // Skip sync during drag operations to avoid conflicts
  if (isDragging.value) {
    return
  }

  // Create new task arrays for each column
  const todoTasks: Task[] = []
  const inProgressTasks: Task[] = []
  const doneTasks: Task[] = []

  // Distribute tasks to appropriate arrays - use fresh task objects
  flatTasks.value.forEach(task => {
    const taskStatus = task.statusId || 'todo'
    // Clone the task to ensure fresh references for reactivity
    const taskCopy = { ...task }

    switch (taskStatus) {
      case 'todo':
        todoTasks.push(taskCopy)
        break
      case 'inProgress':
        inProgressTasks.push(taskCopy)
        break
      case 'done':
        doneTasks.push(taskCopy)
        break
    }
  })

  // Sort tasks in each array by order and creation time
  const sortTasks = (tasks: Task[]): void => {
    tasks.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  sortTasks(todoTasks)
  sortTasks(inProgressTasks)
  sortTasks(doneTasks)

  // Assign new arrays to columns to trigger reactivity
  kanbanColumns.value[0].tasks = todoTasks
  kanbanColumns.value[1].tasks = inProgressTasks
  kanbanColumns.value[2].tasks = doneTasks

}

// Event handlers
function addTaskToColumn(status: string): void {
  emit('task-add', status)
}

function editTask(taskId: string): void {
  emit('task-edit', taskId)
}

function editSelectedTask(): void {
  if (selectedTask.value) {
    emit('task-edit', selectedTask.value.taskId)
  }
}

function addSubtaskToSelected(): void {
  if (selectedTask.value) {
    emit('subtask-add', selectedTask.value.taskId)
  }
}

function duplicateSelectedTask(): void {
  if (selectedTask.value) {
    emit('task-duplicate', selectedTask.value.taskId)
  }
}

function deleteSelectedTask(): void {
  if (selectedTask.value) {
    emit('task-delete', selectedTask.value.taskId)
  }
}

function showTaskMenu(task: Task, event: Event): void {
  selectedTask.value = task
  taskMenu.value.show(event)
}

function onDragStart(): void {
  isDragging.value = true
}

function onDragEnd(event: unknown): void {
  isDragging.value = false

  // 安全的類型檢查
  const dragEvent = event as { from?: Element; to?: Element; item?: Element }

  // 檢查是否跨欄位移動
  if (dragEvent.from && dragEvent.to && dragEvent.from !== dragEvent.to) {
    // 從目標欄位獲取狀態
    const targetColumnStatus = dragEvent.to.getAttribute?.('data-column-status')
    const draggedElement = dragEvent.item
    const taskCard = draggedElement?.querySelector?.('.kanban-task-card')

    if (taskCard && targetColumnStatus) {
      const taskId = taskCard.getAttribute('data-task-id')
      if (taskId) {
        handleTaskStatusUpdate({ taskId } as Task, targetColumnStatus)
      }
    }
  }
}


function handleTaskStatusUpdate(task: Task, columnStatus: string): void {
  // Update the task's status to the new column
  emit('task-update', task.taskId, { statusId: columnStatus })

  const columnTitle = kanbanColumns.value.find(col => col.status === columnStatus)?.title || columnStatus
  $q.notify({
    type: 'positive',
    message: `任務已移至${columnTitle}`,
    position: 'top'
  })
}

// Watch for task changes and sync to local columns
watch(() => props.tasks, async () => {
  await nextTick()
  syncTasksToColumns()
}, { immediate: true, deep: true })
</script>

<style scoped>
.kanban-view-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.kanban-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-section:last-child {
  flex: 1;
  justify-content: flex-end;
}

.kanban-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.kanban-board {
  display: flex;
  gap: 16px;
  height: 100%;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px 8px 0 0;
  color: #333;
  font-weight: 600;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-count {
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.task-list {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.draggable-task-wrapper {
  margin-bottom: 0px;
}

.kanban-task-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.kanban-task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.add-task-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: 2px dashed #ccc;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-task-card:hover {
  border-color: #4caf50;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.05);
}

.task-context-menu {
  min-width: 150px;
}

/* Drag & Drop Styles */
.task-list :deep(.sortable-ghost) {
  opacity: 0.5;
  background: #f0f0f0;
}

.task-list :deep(.sortable-chosen) {
  transform: rotate(2deg);
}

.task-list :deep(.sortable-drag) {
  transform: rotate(5deg);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* Card Size Variants */
.kanban-view-wrapper.card-small .kanban-task-card {
  font-size: 13px;
}

.kanban-view-wrapper.card-large .kanban-task-card {
  font-size: 15px;
}

/* Responsive */
@media (max-width: 768px) {
  .kanban-board {
    gap: 12px;
    padding: 8px;
  }

  .kanban-column {
    min-width: 250px;
  }

  .kanban-task-card {
    font-size: 13px;
  }
}
</style>
