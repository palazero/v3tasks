<template>
  <div class="task-list-view">
    <!-- AllTasks 專案分組顯示 -->
    <template v-if="projectId === 'all' && view.config.groupBy === 'projectId'">
      <div
        v-for="[projectId, projectTasks] in groupedTasks"
        :key="projectId"
        class="project-group q-mb-lg"
      >
        <!-- 專案分組標題 -->
        <div class="project-group-header q-pa-xs bg-grey-2 rounded-borders-top">
          <div class="row items-center justify-between">
            <div class="row items-center q-gutter-sm">
              <q-avatar size="24px" color="primary" text-color="white">
                <q-icon name="folder" />
              </q-avatar>
              <span class="text-h6 text-weight-medium">
                {{ getProjectName(projectId) }}
              </span>
              <q-badge color="grey" :label="projectTasks.length" />
            </div>

            <q-btn
              flat
              dense
              icon="open_in_new"
              size="sm"
              @click="$router.push({ name: 'ProjectView', params: { projectId } })"
            >
              <q-tooltip>開啟專案</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- 專案任務列表 -->
        <div class="project-tasks bg-white rounded-borders-bottom">
          <DraggableTaskList
            :tasks="projectTasks"
            :show-project="false"
            @task-click="emit('task-click', $event)"
            @task-update="(taskId: string, updates: Partial<Task>) => emit('task-update', taskId, updates)"
            @tasks-reorder="handleTasksReorder"
            @add-subtask="handleAddSubtask"
            @indent-task="handleIndentTask"
            @outdent-task="handleOutdentTask"
            @toggle-expanded="handleToggleExpanded"
          />
        </div>
      </div>
    </template>

    <!-- 一般列表顯示（不分組或專案內視圖） -->
    <template v-else>
      <div class="task-list bg-white rounded-borders">
        <DraggableTaskList
          :tasks="tasks"
          :show-project="projectId === 'all'"
          @task-click="emit('task-click', $event)"
          @task-update="(taskId: string, updates: Partial<Task>) => emit('task-update', taskId, updates)"
          @tasks-reorder="handleTasksReorder"
          @add-subtask="handleAddSubtask"
          @indent-task="handleIndentTask"
          @outdent-task="handleOutdentTask"
          @toggle-expanded="handleToggleExpanded"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import type { Task, View } from '@/types'
// import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTaskStore } from '@/stores/task'
import { getProjectRepository } from '@/services/repositories'
import DraggableTaskList from '@/components/task/DraggableTaskList.vue'

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

const $q = useQuasar()
const taskStore = useTaskStore()
const projectRepo = getProjectRepository()

// 專案名稱快取
const projectNamesCache = new Map<string, string>()

// 事件處理函數
async function handleTasksReorder(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<void> {
  const success = await taskStore.batchUpdateTasks(updates)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務順序已更新',
      position: 'top'
    })
  }
}

async function handleAddSubtask(parentTask: Task, title: string): Promise<void> {
  const newTask = await taskStore.addSubtask(parentTask, title)
  if (newTask) {
    $q.notify({
      type: 'positive',
      message: `子任務「${title}」已建立`,
      position: 'top'
    })
  }
}

async function handleIndentTask(task: Task): Promise<void> {
  const success = await taskStore.indentTaskAction(task)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務層級已調整',
      position: 'top'
    })
  }
}

async function handleOutdentTask(task: Task): Promise<void> {
  const success = await taskStore.outdentTaskAction(task)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務層級已調整',
      position: 'top'
    })
  }
}

async function handleToggleExpanded(task: Task): Promise<void> {
  const success = await taskStore.toggleTaskExpanded(task)
  if (!success) {
    $q.notify({
      type: 'negative',
      message: '更新任務狀態失敗',
      position: 'top'
    })
  }
}

// 根據專案分組任務
const groupedTasks = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return new Map()
  }

  const grouped = new Map<string, Task[]>()

  props.tasks.forEach(task => {
    const projectId = task.projectId
    if (!grouped.has(projectId)) {
      grouped.set(projectId, [])
    }
    grouped.get(projectId)!.push(task)
  })

  // 每個分組內部排序
  grouped.forEach((tasks) => {
    tasks.sort((a, b) => {
      // 按 order 排序，然後按建立時間
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  return grouped
})

// 取得專案名稱
function getProjectName(projectId: string): string {
  if (projectNamesCache.has(projectId)) {
    return projectNamesCache.get(projectId)!
  }

  // 異步載入專案名稱
  projectRepo.findById(projectId).then(project => {
    if (project) {
      projectNamesCache.set(projectId, project.name)
    }
  }).catch(console.error)

  return '載入中...'
}
</script>

<style scoped lang="scss">
.task-list-view {
  .project-group {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;

    .project-group-header {
      border-bottom: 1px solid #e0e0e0;
    }

    .project-tasks {
      .task-item:last-child {
        border-bottom: none;
      }
    }
  }

  .task-list {
    border: 1px solid #e0e0e0;

    .task-item:last-child {
      border-bottom: none;
    }
  }
}
</style>
