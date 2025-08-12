<template>
  <div class="nested-task-item">
    <!-- 主要任務項目 -->
    <div 
      class="task-row"
      :class="{ 
        'task-row--completed': task.statusId === 'done',
        'task-row--has-children': hasChildren,
        'task-row--expanded': task.isExpanded 
      }"
      :style="{ paddingLeft: `${task.level * 24}px` }"
    >
      <!-- 展開/收合按鈕 -->
      <q-btn
        v-if="hasChildren"
        :icon="task.isExpanded ? 'expand_more' : 'chevron_right'"
        flat
        dense
        size="sm"
        class="expand-btn q-mr-sm"
        @click="toggleExpanded"
      />
      <div v-else class="expand-btn-spacer q-mr-sm" />
      
      <!-- 拖拉手柄 -->
      <div class="drag-handle q-mr-sm cursor-move" v-if="isDraggable">
        <q-icon name="drag_indicator" size="sm" color="grey-5" />
      </div>
      
      <!-- 任務內容 -->
      <TaskItem
        :task="task"
        :show-project="showProject || false"
        @click="$emit('task-click', task)"
        @update="$emit('task-update', task.taskId, $event)"
        class="flex-1"
      />
      
      <!-- 操作按鈕 -->
      <div class="task-actions q-ml-sm">
        <q-btn
          v-if="canAddSubtask"
          icon="add"
          flat
          dense
          size="sm"
          @click="$emit('subtask-add', task)"
        >
          <q-tooltip>新增子任務</q-tooltip>
        </q-btn>
        
        <q-btn
          v-if="canIndent"
          icon="format_indent_increase"
          flat
          dense
          size="sm"
          @click="$emit('task-indent', task)"
        >
          <q-tooltip>增加縮排</q-tooltip>
        </q-btn>
        
        <q-btn
          v-if="canOutdent"
          icon="format_indent_decrease"
          flat
          dense
          size="sm"
          @click="$emit('task-outdent', task)"
        >
          <q-tooltip>減少縮排</q-tooltip>
        </q-btn>
      </div>
    </div>
    
    <!-- 子任務列表 -->
    <div v-if="task.isExpanded && hasChildren" class="subtasks">
      <NestedTaskItem
        v-for="subtask in task.children"
        :key="subtask.taskId"
        :task="subtask"
        :show-project="showProject || false"
        :is-draggable="isDraggable || false"
        :max-level="maxLevel || 3"
        @task-click="$emit('task-click', $event)"
        @task-update="(taskId: string, updates: Partial<Task>) => $emit('task-update', taskId, updates)"
        @subtask-add="$emit('subtask-add', $event)"
        @task-indent="$emit('task-indent', $event)"
        @task-outdent="$emit('task-outdent', $event)"
        @task-expand-toggle="$emit('task-expand-toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import TaskItem from './TaskItem.vue'

// Props
const props = defineProps<{
  task: Task
  showProject?: boolean
  isDraggable?: boolean
  maxLevel?: number
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
  'subtask-add': [parentTask: Task]
  'task-indent': [task: Task]
  'task-outdent': [task: Task]
  'task-expand-toggle': [task: Task]
}>()

// 計算屬性
const hasChildren = computed(() => {
  return props.task.children && props.task.children.length > 0
})

const canAddSubtask = computed(() => {
  const maxLevel = props.maxLevel || 3
  return props.task.level < maxLevel
})

const canIndent = computed(() => {
  const maxLevel = props.maxLevel || 3
  return props.task.level < maxLevel && props.task.level > 0
})

const canOutdent = computed(() => {
  return props.task.level > 0
})

// 方法
function toggleExpanded(): void {
  emit('task-expand-toggle', props.task)
}
</script>

<style scoped lang="scss">
.nested-task-item {
  .task-row {
    display: flex;
    align-items: center;
    min-height: 32px;
    border-bottom: 1px solid $grey-4;
    transition: background-color 0.2s ease;
    
    &:hover {
      background-color: $grey-1;
      
      .task-actions {
        opacity: 1;
      }
    }
    
    &--completed {
      opacity: 0.7;
    }
    
    &--has-children {
      border-left: 2px solid $primary;
    }
  }
  
  .expand-btn-spacer {
    width: 32px;
  }
  
  .drag-handle {
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background-color: $grey-3;
      border-radius: 4px;
    }
  }
  
  .task-actions {
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    gap: 4px;
  }
  
  .subtasks {
    background-color: $grey-1;
    border-left: 2px solid $primary;
    margin-left: 12px;
  }
}
</style>