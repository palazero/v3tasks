<template>
  <div class="task-board-view">
    <!-- 看板列標題 -->
    <div class="board-header row q-gutter-md q-pa-md">
      <div
        v-for="column in boardColumns"
        :key="column.id"
        class="board-column-header"
        :style="{ width: `${100 / boardColumns.length}%` }"
      >
        <div class="column-title row items-center q-gutter-sm">
          <q-icon
            :name="column.icon"
            :color="column.color"
            size="sm"
          />
          <span class="text-subtitle1 text-weight-medium">
            {{ column.title }}
          </span>
          <q-badge
            :color="column.color"
            :label="getTaskCount(column.id)"
            outline
          />
        </div>
      </div>
    </div>

    <!-- 看板列內容 -->
    <div class="board-body row q-gutter-md q-px-md q-pb-md">
      <div
        v-for="column in boardColumns"
        :key="column.id"
        class="board-column"
        :style="{ width: `${100 / boardColumns.length}%` }"
      >
        <VueDraggable
          :model-value="getColumnTasks(column.id)"
          @update:model-value="(tasks: Task[]) => setColumnTasks(column.id, tasks)"
          :group="{ name: 'board-tasks', pull: true, put: true }"
          :animation="200"
          ghost-class="task-ghost"
          chosen-class="task-chosen"
          drag-class="task-drag"
          item-key="taskId"
          @end="onTaskMoveEnd"
          class="board-column-content"
          :data-column-id="column.id"
        >
          <template #item="{ element: task }">
            <TaskCard
              :task="task"
              :project-id="projectId !== 'all' ? projectId : task.projectId"
              :show-project="projectId === 'all'"
              @click="$emit('task-click', task)"
              @update="$emit('task-update', task.taskId, $event)"
            />
          </template>

          <!-- 空狀態 -->
          <div
            v-if="getColumnTasks(column.id).length === 0"
            class="empty-column text-center q-pa-lg"
          >
            <q-icon
              :name="column.icon"
              size="2em"
              :color="column.color"
              class="opacity-50"
            />
            <div class="text-body2 text-grey-6 q-mt-sm">
              暫無{{ column.title }}任務
            </div>
          </div>
        </VueDraggable>

        <!-- 新增任務按鈕 -->
        <div class="q-pa-sm">
          <q-btn
            flat
            dense
            icon="add"
            :label="`新增${column.title}任務`"
            color="grey-7"
            size="sm"
            class="full-width"
            @click="onAddTask(column.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { SortableEvent } from 'sortablejs'
import type { Task, View } from '@/types'
import TaskCard from '@/components/task/TaskCard.vue'
import { useQuasar } from 'quasar'

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
  'add-task': [statusId: string]
}>()

const $q = useQuasar()

// 看板列定義
const boardColumns = computed(() => [
  {
    id: 'todo' as const,
    title: '待辦',
    icon: 'radio_button_unchecked',
    color: 'grey'
  },
  {
    id: 'inProgress' as const,
    title: '進行中',
    icon: 'play_circle',
    color: 'orange'
  },
  {
    id: 'done' as const,
    title: '已完成',
    icon: 'check_circle',
    color: 'green'
  }
] as const)

// 定義欄位類型
type ColumnId = 'todo' | 'inProgress' | 'done'

// 類型守衛函數
function isValidColumnId(id: string): id is ColumnId {
  return ['todo', 'inProgress', 'done'].includes(id)
}

// 安全訪問 columnTasks 的輔助函數
function getColumnTasks(columnId: string): Task[] {
  return isValidColumnId(columnId) ? columnTasks[columnId] : []
}

// 設置特定欄位的任務列表
function setColumnTasks(columnId: string, tasks: Task[]): void {
  if (isValidColumnId(columnId)) {
    columnTasks[columnId] = tasks
  }
}

// 按狀態分組任務 - 使用 reactive 並強制類型
const columnTasks = reactive({
  todo: [] as Task[],
  inProgress: [] as Task[],
  done: [] as Task[]
})


// 初始化和更新任務分組
function updateColumnTasks(): void {
  const grouped: Record<string, Task[]> = {
    todo: [],
    inProgress: [],
    done: []
  }

  props.tasks.forEach(task => {
    const statusId = task.statusId || 'todo'
    if (grouped[statusId]) {
      grouped[statusId].push(task)
    }
  })

  // 按 order 和建立時間排序
  Object.keys(grouped).forEach(statusId => {
    grouped[statusId]?.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  // 確保所有欄位都有陣列，避免 v-model 錯誤
  boardColumns.value.forEach(column => {
    if (!grouped[column.id]) {
      grouped[column.id] = []
    }
  })

  // 更新 reactive 物件
  Object.keys(grouped).forEach(key => {
    if (isValidColumnId(key)) {
      columnTasks[key] = grouped[key] || []
    }
  })
}

// 監聽 tasks 變化
watch(() => props.tasks, updateColumnTasks, { immediate: true })

// 取得任務數量
function getTaskCount(columnId: string): number {
  return isValidColumnId(columnId) ? columnTasks[columnId].length : 0
}

// 任務拖拉結束事件處理
function onTaskMoveEnd(event: SortableEvent): void {
  // 檢查是否真的移動了
  if (event.oldIndex === event.newIndex && event.from === event.to) {
    return // 沒有移動
  }

  // 從目標元素獲取 column ID
  const targetColumnId = event.to.getAttribute('data-column-id')
  if (!targetColumnId || !isValidColumnId(targetColumnId)) {
    console.warn('Invalid target column ID:', targetColumnId)
    return
  }

  // 從拖拉的元素獲取任務資訊
  const taskId = event.item.getAttribute('data-task-id')
  if (!taskId) {
    console.warn('Cannot find task ID from dragged element')
    return
  }

  // 找到對應的任務
  const movedTask = props.tasks.find(task => task.taskId === taskId)
  if (!movedTask) {
    console.warn('Cannot find task with ID:', taskId)
    return
  }

  const newIndex = event.newIndex ?? 0
  const tasksInColumn = columnTasks[targetColumnId]
  let newOrder = 1000

  if (newIndex === 0) {
    // 移到最前面
    newOrder = tasksInColumn.length > 1 ? (tasksInColumn[1]?.order || 1000) - 1000 : 1000
  } else if (newIndex >= tasksInColumn.length - 1) {
    // 移到最後面
    newOrder = (tasksInColumn[tasksInColumn.length - 2]?.order || 1000) + 1000
  } else {
    // 插入中間
    const prevOrder = tasksInColumn[newIndex - 1]?.order || 0
    const nextOrder = tasksInColumn[newIndex + 1]?.order || 2000
    newOrder = (prevOrder + nextOrder) / 2
  }

  // 發送更新事件
  emit('task-update', movedTask.taskId, {
    statusId: targetColumnId,
    order: newOrder
  })

  $q.notify({
    type: 'positive',
    message: `任務已移至${boardColumns.value.find(col => col.id === targetColumnId)?.title}`,
    position: 'top'
  })
}

// 新增任務
function onAddTask(statusId: string): void {
  emit('add-task', statusId)
}
</script>

<style scoped lang="scss">
.task-board-view {
  min-height: 500px;
  background-color: $grey-1;

  .board-header {
    background-color: white;
    border-bottom: 1px solid $grey-4;

    .board-column-header {
      .column-title {
        padding: 8px 12px;
        border-radius: $border-radius;
        background-color: $grey-1;
      }
    }
  }

  .board-body {
    min-height: 400px;

    .board-column {
      background-color: $grey-2;
      border-radius: $border-radius;
      min-height: 400px;
      position: relative;

      .board-column-content {
        min-height: 320px;
        padding: 8px;

        .task-ghost {
          opacity: 0.5;
          background-color: $primary;
          color: white;
          border-radius: $border-radius;
        }

        .task-chosen {
          background-color: $grey-3;
          transform: scale(1.02);
        }

        .task-drag {
          transform: rotate(2deg);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
        }
      }

      .empty-column {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
      }
    }
  }
}
</style>
