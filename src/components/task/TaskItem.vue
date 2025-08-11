<template>
  <div
    class="task-item-compact"
    :class="[
      `task-level-${level}`,
      `task-status-${task.statusId}`,
      `task-priority-${task.priorityId}`,
      { 
        'has-children': hasChildren, 
        'expanded': isExpanded, 
        'drop-target': hasChildren,
        'selected': isSelected 
      }
    ]"
    :data-task-id="task.taskId"
  >
    <!-- Drag Handle -->
    <q-icon
      name="drag_indicator"
      class="drag-handle"
      size="xs"
    />

    <!-- Select Checkbox -->
    <q-checkbox
      :model-value="isSelected"
      @update:model-value="toggleSelection"
      class="select-checkbox"
      size="xs"
    />

    <!-- Single compact row (only縮排內容) -->
    <div class="task-row-compact" :style="dynamicIndentStyle">
      <!-- Expand/collapse button (always visible) -->
      <q-btn
        :icon="getExpandButtonIcon"
        flat
        dense
        size="xs"
        class="expand-btn-compact"
        :class="{ 'add-subtask-btn': !hasChildren }"
        @click.stop="handleExpandClick"
      >
        <q-tooltip>{{ getExpandButtonTooltip }}</q-tooltip>
      </q-btn>

      <!-- Status indicator -->
      <div class="status-indicator-compact" @click="cycleStatus">
        <q-icon
          v-if="task.statusId === 'inProgress'"
          name="play_circle"
          color="primary"
          size="16px"
          class="status-icon"
        />
        <q-icon
          v-else-if="task.statusId === 'done'"
          name="check_circle"
          color="positive"
          size="16px"
          class="status-icon animate-scale"
        />
        <q-icon
          v-else-if="task.statusId === 'cancelled'"
          name="cancel"
          color="negative"
          size="16px"
          class="status-icon"
        />
        <q-icon
          v-else
          name="radio_button_unchecked"
          color="grey-6"
          size="16px"
          class="status-icon"
        />
      </div>

      <!-- Priority badge -->
      <div class="priority-badge" :class="`priority-${task.priorityId}`">
        {{ priorityText }}
      </div>

      <!-- Task title (clickable) -->
      <div
        class="task-title-compact"
        @click="$emit('click')"
        :class="{ 'has-children-title': hasChildren }"
      >
        {{ task.title }}
      </div>

      <!-- Hover Action Buttons -->
      <div class="hover-actions">
        <q-btn
          flat
          dense
          size="xs"
          icon="edit"
          class="action-btn"
          @click="$emit('edit')"
        >
          <q-tooltip>編輯任務</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="xs"
          icon="add"
          class="action-btn"
          @click="$emit('add-subtask')"
        >
          <q-tooltip>新增子任務</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="xs"
          icon="content_copy"
          class="action-btn"
          @click="$emit('duplicate')"
        >
          <q-tooltip>複製任務</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="xs"
          icon="delete"
          class="action-btn delete-btn"
          @click="$emit('delete')"
        >
          <q-tooltip>刪除任務</q-tooltip>
        </q-btn>
      </div>

      <!-- Task meta info in single line -->
      <div class="task-meta-compact">
        <!-- Project (AllTasks view only) -->
        <span v-if="showProject && projectName" class="meta-project">
          <q-icon :name="projectIcon" :color="projectIconColor" size="xs" />
          {{ projectName }}
        </span>
        
        <!-- Assignee -->
        <span v-if="assigneeInfo" class="meta-assignee">
          <q-icon name="person" size="xs" />
          {{ assigneeInfo.name }}
        </span>
        
        <!-- Date -->
        <span v-if="task.endDateTime" class="meta-date" :class="{ 'overdue': isOverdue }">
          <q-icon name="schedule" size="xs" />
          {{ formatDate(task.endDateTime) }}
        </span>
        
        <!-- Progress -->
        <span v-if="task.progress && task.progress > 0" class="meta-progress">
          <q-icon name="trending_up" size="xs" />
          {{ task.progress }}%
        </span>
        
        <!-- Children count -->
        <span v-if="hasChildren" class="meta-children">
          <q-icon name="account_tree" size="xs" />
          {{ childrenCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task } from '@/types'
// import { DEFAULT_PRIORITIES } from '@/types' // Currently unused
import { useCurrentUser } from '@/composables/useCurrentUser'
import { getProjectRepository } from '@/services/repositories'

// Props
const props = defineProps<{
  task: Task
  level?: number
  hasChildren?: boolean
  isExpanded?: boolean
  isSelected?: boolean
  showProject?: boolean
  childrenCount?: number
}>()

// Emits
const emit = defineEmits<{
  click: []
  'toggle-expand': []
  'add-subtask': []
  edit: []
  duplicate: []
  delete: []
  'status-change': [statusId: string]
  'toggle-selection': [selected: boolean]
}>()

const { getUserDisplayName, getUserAvatar } = useCurrentUser()
const projectRepo = getProjectRepository()

// 狀態
const projectName = ref<string | null>(null)
const projectIcon = ref<string>('folder')
const projectIconColor = ref<string>('grey-6')

// 計算屬性
const isOverdue = computed(() => {
  if (!props.task.endDateTime || props.task.statusId === 'done') {
    return false
  }
  return new Date(props.task.endDateTime) < new Date()
})

const priorityText = computed(() => {
  const priorityMap: Record<string, string> = { 
    low: '低', 
    medium: '中', 
    high: '高',
    urgent: '急'
  }
  return priorityMap[props.task.priorityId] || '中'
})

const assigneeInfo = computed(() => {
  if (!props.task.assigneeId) return null
  return {
    name: getUserDisplayName(props.task.assigneeId),
    avatar: getUserAvatar(props.task.assigneeId)
  }
})

const dynamicIndentStyle = computed(() => {
  const baseIndent = 10
  const extraIndent = (props.level || 0) * 24
  const totalIndent = baseIndent + extraIndent
  return { 
    paddingLeft: `${totalIndent}px`
  }
})

const getExpandButtonIcon = computed(() => {
  if (props.hasChildren) {
    // Default to expanded if isExpanded is undefined
    const expanded = props.isExpanded !== false
    return expanded ? 'expand_less' : 'expand_more'
  } else {
    return 'add'
  }
})

const getExpandButtonTooltip = computed(() => {
  if (props.hasChildren) {
    const expanded = props.isExpanded !== false
    return expanded ? '收合子任務' : '展開子任務'
  } else {
    return '新增子任務'
  }
})

// 載入專案資訊
if (props.showProject) {
  projectRepo.findById(props.task.projectId).then(project => {
    if (project) {
      projectName.value = project.name
      projectIcon.value = project.icon || 'folder'
      projectIconColor.value = project.iconColor || 'grey-6'
    }
  }).catch(console.error)
}

// 方法
function handleExpandClick(): void {
  if (props.hasChildren) {
    emit('toggle-expand')
  } else {
    emit('add-subtask')
  }
}

function cycleStatus(): void {
  const statusCycle = ['todo', 'inProgress', 'done']
  const currentIndex = statusCycle.indexOf(props.task.statusId || 'todo')
  const nextIndex = (currentIndex + 1) % statusCycle.length
  const newStatus = statusCycle[nextIndex]
  
  if (newStatus) {
    emit('status-change', newStatus)
  }
}

function toggleSelection(selected: boolean): void {
  emit('toggle-selection', selected)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '明天'
  } else if (diffDays === -1) {
    return '昨天'
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays}天後`
  } else if (diffDays < 0 && diffDays >= -7) {
    return `${Math.abs(diffDays)}天前`
  } else {
    return d.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>

<style scoped lang="scss">
/* Compact task item layout */
.task-item-compact {
  border-bottom: 1px solid #f0f0f0;
  background: white;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  min-height: 24px;
}

.task-item-compact::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transition: left 0.5s ease;
}

.task-item-compact:hover {
  background: #fafafa;
  border-color: #d0d0d0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}

.task-item-compact:hover::before {
  left: 100%;
}

.task-item-compact.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.task-row-compact {
  display: flex;
  align-items: center;
  padding: 2px 2px;
  gap: 2px;
  min-height: 24px;
  flex-wrap: nowrap;
  min-width: 0;
  width: 100%;
}

/* Drag handle */
.drag-handle {
  cursor: grab;
  color: #999;
  transition: color 0.2s ease;
  font-size: 12px;
  width: 16px;
  height: 16px;
  padding: 0;
  opacity: 0;
  pointer-events: none;
}

.drag-handle:hover {
  color: #555;
}

.drag-handle:active {
  cursor: grabbing;
  color: #333;
}

.task-item-compact:hover .drag-handle,
.task-item-compact:focus-within .drag-handle {
  opacity: 1;
  pointer-events: auto;
}

/* Select checkbox */
.select-checkbox {
  margin: 0;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.select-checkbox :deep(.q-checkbox__bg) {
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
}

.select-checkbox:hover :deep(.q-checkbox__bg) {
  background: rgba(25, 118, 210, 0.05);
  border-color: #1976d2;
}

.task-item-compact:hover .select-checkbox,
.task-item-compact:focus-within .select-checkbox,
.task-item-compact.selected .select-checkbox {
  opacity: 1;
  pointer-events: auto;
}

/* Expand button */
.expand-btn-compact {
  min-width: 16px !important;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: all 0.2s ease;
  background: rgba(25, 118, 210, 0.05);
  border: 1px solid rgba(25, 118, 210, 0.1);
}

.expand-btn-compact:hover {
  background: rgba(25, 118, 210, 0.1);
  border-color: rgba(25, 118, 210, 0.3);
  transform: scale(1.1);
}

/* Add subtask button styling */
.add-subtask-btn {
  background: rgba(76, 175, 80, 0.05);
  border: 1px solid rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.add-subtask-btn:hover {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
  color: #388e3c;
  transform: scale(1.1);
}

/* Status indicator */
.status-indicator-compact {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.status-indicator-compact:hover {
  background: rgba(0,0,0,0.05);
  transform: scale(1.1);
}

.animate-scale {
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Priority badge */
.priority-badge {
  font-size: 8px;
  font-weight: 600;
  padding: 1px 3px;
  border-radius: 4px;
  min-width: 16px;
  text-align: center;
  text-transform: uppercase;
  transition: all 0.2s ease;
  cursor: default;
}

.task-item-compact:hover .priority-badge {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.priority-urgent {
  background: #ffebee;
  color: #c62828;
}

.priority-high {
  background: #ffebee;
  color: #c62828;
}

.priority-medium {
  background: #fff3e0;
  color: #ef6c00;
}

.priority-low {
  background: #f3e5f5;
  color: #7b1fa2;
}

/* Task title */
.task-title-compact {
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  min-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
  padding: 2px 4px;
  border-radius: 4px;
}

.task-title-compact:hover {
  color: #1976d2;
  background: rgba(25, 118, 210, 0.05);
  transform: translateX(2px);
}

.has-children-title {
  cursor: pointer;
  user-select: none;
}

.has-children-title:hover {
  background: rgba(25, 118, 210, 0.08);
}

/* Meta information */
.task-meta-compact {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 10px;
  color: #666;
  min-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-project,
.meta-assignee,
.meta-date,
.meta-progress,
.meta-children {
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.meta-project {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1976d2;
}

.meta-assignee {
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #4caf50;
}

.meta-date {
  min-width: 60px;
  color: #666;
  
  &.overdue {
    color: #f44336;
    font-weight: 600;
  }
}

.meta-progress {
  color: #2196f3;
  font-weight: 600;
}

.meta-children {
  color: #ff9800;
}

/* Hover Action Buttons */
.hover-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.25s ease;
  pointer-events: none;
}

.task-item-compact:hover .hover-actions {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.action-btn {
  min-width: 18px !important;
  width: 18px;
  height: 18px;
  color: #666;
  transition: all 0.2s ease;
  border-radius: 3px;
}

.action-btn:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

/* Status-based styling */
.task-status-done .task-title-compact {
  text-decoration: line-through;
  opacity: 0.7;
}

.task-status-cancelled .task-item-compact {
  border-left: 3px solid #f44336;
  background: #fff5f5;
}

.task-status-inProgress .task-item-compact {
  border-left: 3px solid #2196f3;
  background: #f8fafe;
}

.task-status-done .task-item-compact {
  background: #f8fff8;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .task-row-compact {
    padding: 2px 3px;
  }

  .task-meta-compact {
    min-width: auto;
    gap: 4px;
  }

  .meta-project,
  .meta-assignee {
    max-width: 50px;
  }

  /* Mobile: Show actions on tap instead of hover */
  .hover-actions {
    opacity: 0.7;
    transform: translateX(0);
    pointer-events: auto;
  }

  .task-item-compact:active .hover-actions {
    opacity: 1;
  }
}

/* Focus and accessibility */
.action-btn:focus,
.expand-btn-compact:focus,
.status-indicator-compact:focus {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
}
</style>