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
              @change="(event) => onTaskMove(event, column.status)"
              @start="onDragStart"
              @end="onDragEnd"
              class="task-list"
              :data-column-status="column.status"
            >
              <!-- Task Cards -->
              <div
                v-for="task in column.tasks"
                :key="task.taskId"
                class="task-card"
                :class="[
                  `priority-${task.priority || 'medium'}`,
                  { 'task-overdue': isOverdue(task) }
                ]"
                @click="editTask(task.taskId)"
              >
                <!-- Task Header -->
                <div class="task-header">
                  <div class="task-title">{{ task.title }}</div>
                  <q-btn
                    flat
                    dense
                    round
                    size="xs"
                    icon="more_vert"
                    class="task-menu-btn"
                    @click.stop="showTaskMenu(task, $event)"
                  />
                </div>

                <!-- Task Description -->
                <div v-if="getTaskDescription(task)" class="task-description">
                  {{ getTaskDescription(task) }}
                  <span v-if="getTaskDescriptionLength(task) > 100">...</span>
                </div>

                <!-- Task Meta -->
                <div class="task-meta">
                  <!-- Project Name (only show when in 'all' project view) -->
                  <div v-if="props.projectId === 'all'" class="task-project">
                    <q-chip
                      size="xs"
                      color="blue-grey-2"
                      text-color="blue-grey-8"
                      icon="folder"
                    >
                      {{ getProjectName(task.projectId) }}
                    </q-chip>
                  </div>
                  
                  <!-- Priority Badge -->
                  <q-chip
                    :color="getPriorityColor(task.priority || 'medium')"
                    text-color="white"
                    size="xs"
                    icon="flag"
                  >
                    {{ getPriorityText(task.priority || 'medium') }}
                  </q-chip>

                  <!-- Tags -->
                  <div v-if="task.tags && task.tags.length > 0" class="task-tags">
                    <q-chip
                      v-for="tag in task.tags.slice(0, 2)"
                      :key="tag"
                      size="xs"
                      color="grey-3"
                      text-color="grey-8"
                    >
                      {{ tag }}
                    </q-chip>
                    <span v-if="task.tags.length > 2" class="more-tags">
                      +{{ task.tags.length - 2 }}
                    </span>
                  </div>
                </div>

                <!-- Task Footer -->
                <div class="task-footer">
                  <!-- Assignee -->
                  <div v-if="task.assigneeId" class="task-assignee">
                    <q-avatar size="20px" color="primary" text-color="white">
                      {{ getAssigneeName(task.assigneeId).charAt(0) }}
                    </q-avatar>
                    <span class="assignee-name">{{ getAssigneeName(task.assigneeId) }}</span>
                  </div>

                  <!-- Due Date -->
                  <div v-if="task.endTime" class="task-due-date">
                    <q-icon
                      name="schedule"
                      size="xs"
                      :color="isOverdue(task) ? 'negative' : 'grey-6'"
                    />
                    <span
                      class="due-date-text"
                      :class="{ 'text-negative': isOverdue(task) }"
                    >
                      {{ formatDueDate(task.endTime) }}
                    </span>
                  </div>
                </div>

                <!-- Subtasks Indicator -->
                <div v-if="hasSubtasks(task)" class="subtasks-indicator">
                  <q-icon name="account_tree" size="xs" />
                  <span>{{ getSubtaskCount(task) }} 子任務</span>
                </div>
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
import { computed, reactive, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { Task, View, RichTextNode, Project } from '@/types'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/user'
import { getProjectRepository } from '@/services/repositories'

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
  'add-task': [statusId?: string]
  'edit-task': [taskId: string]
  'add-subtask': [parentTaskId: string]
  'duplicate-task': [taskId: string]
  'delete-task': [taskId: string]
  'config-change': [config: Record<string, unknown>]
}>()

const $q = useQuasar()
const userStore = useUserStore()
const projectRepo = getProjectRepository()

// Refs
const taskMenu = ref()
const selectedTask = ref<Task | null>(null)
const isDragging = ref(false)
const projectsCache = ref<Map<string, Project>>(new Map())

// Kanban columns definition with reactive task arrays
const kanbanColumns = reactive([
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
const flatTasks = computed(() => flattenTasks(props.tasks))

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
  const column = kanbanColumns.find(col => col.status === status)
  return column?.tasks.length || 0
}

function getAssigneeName(assigneeId: string): string {
  const user = userStore.availableUsers.find(u => u.userId === assigneeId)
  return user?.name || '未指定'
}

function getProjectName(projectId: string): string {
  // 檢查快取
  if (projectsCache.value.has(projectId)) {
    return projectsCache.value.get(projectId)!.name
  }
  
  // 如果不在快取中，非同步載入專案資訊
  loadProject(projectId)
  
  return '載入中...'
}

async function loadProject(projectId: string): Promise<void> {
  if (projectsCache.value.has(projectId)) return
  
  try {
    const project = await projectRepo.findById(projectId)
    if (project) {
      projectsCache.value.set(projectId, project)
    }
  } catch (error) {
    console.warn('Failed to load project:', projectId, error)
    // 設定錯誤專案以避免重複載入
    projectsCache.value.set(projectId, { name: '未知專案' } as Project)
  }
}

// Priority helpers
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'purple',
    medium: 'orange',
    high: 'red'
  }
  return colors[priority] || 'grey'
}

function getPriorityText(priority: string): string {
  const texts: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return texts[priority] || priority
}

// Date helpers
function isOverdue(task: Task): boolean {
  if (!task.endTime) return false
  return new Date(task.endTime) < new Date()
}

function formatDueDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) {
    return '已逾期'
  } else if (diff < 86400000) {
    return '今天到期'
  } else if (diff < 172800000) {
    return '明天到期'
  } else {
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })
  }
}

// Task helpers
function hasSubtasks(task: Task): boolean {
  return task.children && task.children.length > 0
}

function getSubtaskCount(task: Task): number {
  return task.children ? task.children.length : 0
}

function getTaskDescription(task: Task): string {
  if (!task.description || !task.description.content) {
    return ''
  }
  // Extract plain text from rich text content
  const plainText = extractPlainText(task.description)
  return plainText.substring(0, 100)
}

function getTaskDescriptionLength(task: Task): number {
  if (!task.description || !task.description.content) {
    return 0
  }
  const plainText = extractPlainText(task.description)
  return plainText.length
}

function extractPlainText(richText: Task['description']): string {
  if (!richText || !richText.content) {
    return ''
  }

  let text = ''
  function processNode(node: RichTextNode): void {
    if (node.text) {
      text += node.text
    }
    if (node.content) {
      node.content.forEach(processNode)
    }
  }

  richText.content.forEach(processNode)
  return text
}

// Synchronize tasks from props to local kanban columns
function syncTasksToColumns(): void {
  // Skip sync during drag operations to avoid conflicts
  if (isDragging.value) {
    return
  }

  // Clear all columns first
  kanbanColumns.forEach(column => {
    column.tasks.length = 0
  })

  // Distribute tasks to appropriate columns based on status
  flatTasks.value.forEach(task => {
    const taskStatus = task.statusId || 'todo'
    const column = kanbanColumns.find(col => col.status === taskStatus)
    if (column) {
      column.tasks.push(task)
    }
  })

  // Sort tasks in each column by order and creation time
  kanbanColumns.forEach(column => {
    column.tasks.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })
}

// Event handlers
function addTaskToColumn(status: string): void {
  emit('add-task', status)
}

function editTask(taskId: string): void {
  emit('edit-task', taskId)
}

function editSelectedTask(): void {
  if (selectedTask.value) {
    emit('edit-task', selectedTask.value.taskId)
  }
}

function addSubtaskToSelected(): void {
  if (selectedTask.value) {
    emit('add-subtask', selectedTask.value.taskId)
  }
}

function duplicateSelectedTask(): void {
  if (selectedTask.value) {
    emit('duplicate-task', selectedTask.value.taskId)
  }
}

function deleteSelectedTask(): void {
  if (selectedTask.value) {
    emit('delete-task', selectedTask.value.taskId)
  }
}

function showTaskMenu(task: Task, event: Event): void {
  selectedTask.value = task
  taskMenu.value.show(event)
}

function onDragStart(): void {
  isDragging.value = true
}

function onDragEnd(): void {
  isDragging.value = false
}

function onTaskMove(event: Record<string, unknown>, columnStatus: string): void {
  if (event.added) {
    const task = event.added.element as Task

    // Update the task's status to the new column
    emit('task-update', task.taskId, { statusId: columnStatus })

    const columnTitle = kanbanColumns.find(col => col.status === columnStatus)?.title || columnStatus
    $q.notify({
      type: 'positive',
      message: `任務已移至${columnTitle}`,
      position: 'top'
    })
  }
}

// Preload projects when tasks change
function preloadProjects(): void {
  if (props.projectId !== 'all') return
  
  const projectIds = new Set<string>()
  flatTasks.value.forEach(task => {
    if (task.projectId) {
      projectIds.add(task.projectId)
    }
  })
  
  projectIds.forEach(projectId => {
    if (!projectsCache.value.has(projectId)) {
      loadProject(projectId)
    }
  })
}

// Watch for task changes and sync to local columns
watch(() => props.tasks, () => {
  syncTasksToColumns()
  preloadProjects()
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
  padding: 8px;
}

.task-list {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.task-card.task-overdue {
  border-left: 4px solid #f44336;
}

.priority-high {
  border-left: 4px solid #f44336;
}

.priority-medium {
  border-left: 4px solid #ff9800;
}

.priority-low {
  border-left: 4px solid #9c27b0;
}

.task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  flex: 1;
  margin-right: 8px;
}

.task-menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-card:hover .task-menu-btn {
  opacity: 1;
}

.task-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.task-project {
  display: flex;
  align-items: center;
  margin-right: 4px;
}

.task-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
}

.more-tags {
  font-size: 10px;
  color: #666;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 8px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 4px;
}

.assignee-name {
  color: #666;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-due-date {
  display: flex;
  align-items: center;
  gap: 2px;
}

.due-date-text {
  color: #666;
}

.subtasks-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
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
  margin-top: 8px;
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
.kanban-view-wrapper.card-small .task-card {
  padding: 8px;
}

.kanban-view-wrapper.card-small .task-title {
  font-size: 13px;
}

.kanban-view-wrapper.card-large .task-card {
  padding: 16px;
}

.kanban-view-wrapper.card-large .task-title {
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

  .task-card {
    padding: 10px;
  }

  .task-title {
    font-size: 13px;
  }

  .task-menu-btn {
    opacity: 1;
  }
}
</style>
