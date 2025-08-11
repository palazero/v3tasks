<template>
  <div class="quick-add-task" :class="{ 'active': isActive }">
    <!-- Quick Add Input Row -->
    <div class="quick-add-row" :style="dynamicIndentStyle">
      <!-- Placeholder drag handle and checkbox space -->
      <div class="placeholder-controls">
        <div class="placeholder-drag"></div>
        <div class="placeholder-checkbox"></div>
      </div>

      <!-- Add button or spacer -->
      <div class="add-btn-space">
        <div class="add-spacer"></div>
      </div>

      <!-- Input field -->
      <q-input
        v-if="isActive"
        ref="inputRef"
        v-model="taskTitle"
        placeholder="輸入任務名稱..."
        dense
        borderless
        class="quick-input"
        @keyup.enter="addTask"
        @keyup.esc="cancelAdd"
        @blur="onBlur"
      />

      <!-- Placeholder when not active -->
      <div
        v-else
        class="quick-placeholder"
        @click="startAdding"
      >
        <q-icon name="add" size="xs" class="add-icon" />
        <span class="placeholder-text">快速新增任務...</span>
      </div>

      <!-- Action buttons when active -->
      <div v-if="isActive" class="quick-actions">
        <q-btn
          flat
          dense
          size="xs"
          icon="check"
          color="positive"
          class="action-btn"
          @click="addTask"
          :disable="!taskTitle.trim()"
        />
        <q-btn
          flat
          dense
          size="xs"
          icon="close"
          color="grey-6"
          class="action-btn"
          @click="cancelAdd"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Task } from '@/types'
import { useTaskStore } from '@/stores/task'
import { nanoid } from 'nanoid'

// Props
const props = defineProps<{
  parentId?: string
  level?: number
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'task-added': [task: Task]
}>()

const taskStore = useTaskStore()

// Refs
const inputRef = ref<HTMLInputElement>()
const isActive = ref(false)
const taskTitle = ref('')

// 計算屬性
const dynamicIndentStyle = computed(() => {
  const baseIndent = 10
  const extraIndent = (props.level || 0) * 24
  const totalIndent = baseIndent + extraIndent
  return {
    paddingLeft: `${totalIndent}px`
  }
})

const processedParentId = computed(() => {
  // Handle virtual project groups (if applicable)
  if (props.parentId && props.parentId.startsWith('project-group-')) {
    return undefined // Virtual project groups should create root tasks
  }
  return props.parentId
})

const processedProjectId = computed(() => {
  // Extract real projectId from virtual project groups
  if (props.parentId && props.parentId.startsWith('project-group-')) {
    const projectIdFromGroup = props.parentId.replace('project-group-', '')
    return projectIdFromGroup === 'orphan' ? props.projectId : projectIdFromGroup
  }
  return props.projectId
})

// 方法
function startAdding(): void {
  isActive.value = true
  void nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

function cancelAdd(): void {
  isActive.value = false
  taskTitle.value = ''
}

async function addTask(): Promise<void> {
  if (!taskTitle.value.trim()) return

  // Set default dates: today as start, +7 days as end
  const today = new Date()
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days

  // Create new task
  const newTask: Task = {
    taskId: nanoid(),
    title: taskTitle.value.trim(),
    description: { type: 'doc', content: [] },
    statusId: 'todo',
    priorityId: 'medium',
    assigneeId: '',
    creatorId: 'current-user', // This should be set from current user context
    projectId: processedProjectId.value,
    parentTaskId: processedParentId.value,
    order: Date.now(), // Simple ordering by timestamp
    startDateTime: today,
    endDateTime: endDate,
    createdAt: today,
    updatedAt: today,
    progress: 0,
    customFields: {},
    dependencies: [],
    isExpanded: true
  }

  try {
    // Add task to store
    await taskStore.addTask(newTask)
    
    // Emit event
    emit('task-added', newTask)
    
    // Reset title but keep active for next task
    taskTitle.value = ''
    
    // 重新聚焦到輸入框
    void nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
      }
    })
  } catch (error) {
    console.error('Failed to add task:', error)
  }
}

function onBlur(): void {
  setTimeout(() => {
    if (!taskTitle.value.trim()) {
      cancelAdd()
    }
  }, 150)
}

// 暴露方法給父組件
defineExpose({
  startAdding
})
</script>

<style scoped lang="scss">
.quick-add-task {
  border-bottom: 1px solid #f0f0f0;
  background: white;
  transition: all 0.2s ease;
  position: relative;
  opacity: 0.7;
}

.quick-add-task:hover {
  background: #fafafa;
  opacity: 1;
}

.quick-add-task.active {
  background: #f8fafe;
  border-color: #1976d2;
  opacity: 1;
  box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.2);
}

.quick-add-row {
  display: flex;
  align-items: center;
  padding: 2px 2px;
  gap: 2px;
  height: 24px;
  flex-wrap: nowrap;
  min-width: 0;
  width: 100%;
}

/* Placeholder controls to maintain alignment */
.placeholder-controls {
  display: flex;
  align-items: center;
  gap: 1px;
}

.placeholder-drag {
  width: 16px;
  height: 16px;
  opacity: 0.3;
}

.placeholder-checkbox {
  width: 14px;
  height: 14px;
  opacity: 0.3;
}

/* Add button space */
.add-btn-space {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-spacer {
  width: 16px;
}

/* Quick input */
.quick-input {
  flex: 1;
  font-size: 14px;
  min-width: 120px;
  padding: 0px;
  height: 24px;
  overflow: hidden;
}

.quick-input :deep(.q-field__control) {
  background: transparent;
  height: 24px !important;
  min-height: 24px !important;
  overflow: hidden;
}

.quick-input :deep(.q-field__inner) {
  height: 24px !important;
  min-height: 24px !important;
}

.quick-input :deep(.q-field__marginal) {
  height: 24px !important;
}

.quick-input :deep(.q-field__native) {
  color: #333;
  font-weight: 500;
  height: 24px !important;
  line-height: 24px !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Placeholder */
.quick-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  min-width: 120px;
}

.quick-placeholder:hover {
  background: rgba(25, 118, 210, 0.05);
  color: #1976d2;
}

.add-icon {
  color: #999;
  transition: color 0.2s ease;
}

.quick-placeholder:hover .add-icon {
  color: #1976d2;
}

.placeholder-text {
  font-size: 13px;
  color: #999;
  font-style: italic;
  transition: color 0.2s ease;
}

.quick-placeholder:hover .placeholder-text {
  color: #1976d2;
}

/* Action buttons */
.quick-actions {
  display: flex;
  gap: 2px;
  height: 24px;
  align-items: center;
}

.action-btn {
  min-width: 18px !important;
  width: 18px;
  height: 18px;
  border-radius: 3px;
}

.action-btn:hover {
  transform: scale(1.1);
}

/* Meta space alignment */
.quick-add-row::after {
  content: '';
  min-width: 120px;
  opacity: 0;
}

/* Focus states */
.quick-input.q-field--focused {
  background: rgba(25, 118, 210, 0.02);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .quick-add-row {
    padding: 2px 3px;
  }

  .placeholder-text {
    font-size: 12px;
  }

  .quick-input {
    font-size: 13px;
  }

  .quick-add-row::after {
    min-width: 80px;
  }
}
</style>