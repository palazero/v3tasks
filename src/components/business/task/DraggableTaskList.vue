<template>
  <div class="draggable-task-list">
    <VueDraggable
      v-model="localTaskList"
      group="tasks"
      :animation="200"
      ghost-class="task-ghost"
      chosen-class="task-chosen"
      drag-class="task-drag"
      handle=".drag-handle"
      @start="onDragStart"
      @end="onDragEnd"
      @change="onTaskChange"
    >
      <NestedTaskItem
        v-for="task in localTaskList"
        :key="task.taskId"
        :task="task"
        :show-project="showProject || false"
        :is-draggable="true"
        :max-level="maxLevel || 3"
        @task-click="$emit('task-click', $event)"
        @task-update="handleTaskUpdate"
        @subtask-add="handleSubtaskAdd"
        @task-indent="handleIndentTask"
        @task-outdent="handleOutdentTask"
        @task-expand-toggle="handleToggleExpanded"
      />
    </VueDraggable>

    <!-- 空狀態 -->
    <div v-if="localTaskList.length === 0" class="empty-state q-pa-xl text-center">
      <q-icon name="task_alt" size="4em" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-6">暫無任務</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        點擊上方「新增任務」按鈕建立第一個任務
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { SortableEvent } from 'sortablejs'
import type { Task } from '@/types'
import NestedTaskItem from './NestedTaskItem.vue'
import { useNestedTasks } from '@/composables/useNestedTasks'

// Props
const props = defineProps<{
  tasks: Task[]
  showProject?: boolean
  maxLevel?: number
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
  'tasks-reorder': [updates: Array<{ taskId: string; updates: Partial<Task> }>]
  'subtask-add': [parentTask: Task, title: string]
  'task-indent': [task: Task]
  'task-outdent': [task: Task]
  'task-expand-toggle': [task: Task]
}>()

const { buildTaskTree, flattenTaskTree, indentTask, outdentTask } = useNestedTasks()

// 計算屬性 - 直接從 props.tasks 建立樹狀結構
const taskList = computed(() => {
  if (!props.tasks || props.tasks.length === 0) {
    return []
  }
  return buildTaskTree(props.tasks)
})

// 本地響應式副本用於拖拽操作
const localTaskList = ref<Task[]>([])

// 監聽計算屬性變化並更新本地副本
watch(taskList, (newTasks) => {
  localTaskList.value = [...newTasks]
}, { immediate: true, deep: true })

// 計算屬性
const maxLevel = computed(() => props.maxLevel || 3)

// 拖拉事件處理
let draggedTask: Task | null = null

function onDragStart(evt: SortableEvent): void {
  const oldIndex = typeof evt.oldIndex === 'number' ? evt.oldIndex : -1
  draggedTask = oldIndex >= 0 ? (localTaskList.value[oldIndex] ?? null) : null
  console.log('Drag start:', draggedTask?.title)
}

function onDragEnd(evt: SortableEvent): void {
  console.log('Drag end:', {
    from: evt.oldIndex,
    to: evt.newIndex,
    task: draggedTask?.title
  })
  draggedTask = null
}

function onTaskChange(evt: SortableEvent): void {
  console.log('Task order changed:', evt)

  // 將樹狀結構轉回扁平化並發送更新
  const flattened = flattenTaskTree(localTaskList.value)
  const updates = flattened.map((task, index) => ({
    taskId: task.taskId,
    updates: { order: (index + 1) * 1000 }
  }))

  emit('tasks-reorder', updates)
}

// 任務操作處理
function handleTaskUpdate(taskId: string, updates: Partial<Task>): void {
  emit('task-update', taskId, updates)
}

function handleSubtaskAdd(parentTask: Task): void {
  const title = prompt('請輸入子任務標題：')
  if (title) {
    emit('subtask-add', parentTask, title)
  }
}

function handleIndentTask(task: Task): void {
  const flatTasks = flattenTaskTree(localTaskList.value)
  const result = indentTask(task, flatTasks)

  if (result) {
    emit('task-update', result.taskId, result.updates)
  }
}

function handleOutdentTask(task: Task): void {
  const flatTasks = flattenTaskTree(localTaskList.value)
  const result = outdentTask(task, flatTasks)

  if (result) {
    emit('task-update', result.taskId, result.updates)
  }
}

function handleToggleExpanded(task: Task): void {
  emit('task-expand-toggle', task)
}
</script>

<style scoped lang="scss">
.draggable-task-list {
  .task-ghost {
    opacity: 0.5;
    background-color: $primary;
    color: white;
  }

  .task-chosen {
    background-color: $grey-2;
  }

  .task-drag {
    transform: rotate(5deg);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .empty-state {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
}
</style>
