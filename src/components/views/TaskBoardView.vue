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
          v-model="columnTasks[column.id]"
          :group="{ name: 'board-tasks', pull: true, put: true }"
          :animation="200"
          ghost-class="task-ghost"
          chosen-class="task-chosen"
          drag-class="task-drag"
          item-key="taskId"
          @change="onTaskMove($event, column.id)"
          class="board-column-content"
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
            v-if="columnTasks[column.id].length === 0" 
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
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
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
    id: 'todo',
    title: '待辦',
    icon: 'radio_button_unchecked',
    color: 'grey'
  },
  {
    id: 'inProgress',
    title: '進行中',
    icon: 'play_circle',
    color: 'orange'
  },
  {
    id: 'done',
    title: '已完成',
    icon: 'check_circle',
    color: 'green'
  }
])

// 按狀態分組任務
const columnTasks = ref<Record<string, Task[]>>({
  todo: [],
  inProgress: [],
  done: []
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
    grouped[statusId].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  columnTasks.value = grouped
}

// 監聽 tasks 變化
watch(() => props.tasks, updateColumnTasks, { immediate: true })

// 取得任務數量
function getTaskCount(columnId: string): number {
  return columnTasks.value[columnId]?.length || 0
}

// 任務拖拉移動
function onTaskMove(event: any, targetColumnId: string): void {
  if (event.added) {
    const movedTask = event.added.element
    const newIndex = event.added.newIndex

    // 計算新的 order 值
    const tasksInColumn = columnTasks.value[targetColumnId]
    let newOrder = 1000

    if (newIndex === 0) {
      // 移到最前面
      newOrder = tasksInColumn.length > 1 ? tasksInColumn[1].order - 1000 : 1000
    } else if (newIndex >= tasksInColumn.length - 1) {
      // 移到最後面
      newOrder = tasksInColumn[tasksInColumn.length - 2].order + 1000
    } else {
      // 插入中間
      const prevOrder = tasksInColumn[newIndex - 1].order
      const nextOrder = tasksInColumn[newIndex + 1].order
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