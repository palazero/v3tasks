<template>
  <q-page class="q-pa-md">
    <!-- 頁面標題 -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="text-h4 q-my-none text-weight-light">
          <q-icon name="list_alt" class="q-mr-sm" />
          所有任務
        </h4>
        <p class="text-body2 text-grey-6 q-mt-sm">
          查看您有權限存取的所有專案任務
        </p>
      </div>

      <!-- 統計卡片 -->
      <div class="row q-gutter-md">
        <q-card class="stat-card">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-h6 text-weight-bold">{{ taskStore.taskStats.total }}</div>
            <div class="text-caption text-grey-6">總任務數</div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-h6 text-weight-bold text-orange">{{ taskStore.taskStats.inProgress }}</div>
            <div class="text-caption text-grey-6">進行中</div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-h6 text-weight-bold text-red">{{ taskStore.taskStats.overdue }}</div>
            <div class="text-caption text-grey-6">已逾期</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 視圖 Tabs -->
    <q-card class="full-width">
      <q-tabs
        v-model="viewStore.currentViewId"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab
          v-for="view in viewStore.views"
          :key="view.viewId"
          :name="view.viewId"
          :label="view.name"
          :icon="getViewIcon(view.type)"
          @click="viewStore.switchView(view.viewId)"
        />

        <!-- 新增視圖按鈕 -->
        <q-btn
          flat
          dense
          icon="add"
          label="新增視圖"
          class="q-ml-md"
          @click="showCreateViewDialog = true"
        />
      </q-tabs>

      <q-separator />

      <!-- 視圖工具列 -->
      <div class="row items-center justify-between q-pa-md bg-grey-1">
        <div class="row items-center q-gutter-sm">
          <!-- 搜尋 -->
          <q-input
            v-model="searchQuery"
            placeholder="搜尋任務..."
            dense
            outlined
            style="min-width: 250px"
            debounce="300"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
            <template v-slot:append>
              <q-icon
                v-if="searchQuery"
                name="clear"
                class="cursor-pointer"
                @click="searchQuery = ''"
              />
            </template>
          </q-input>

          <!-- 篩選按鈕 -->
          <q-btn
            dense
            flat
            icon="filter_list"
            label="篩選"
            :color="hasActiveFilters ? 'primary' : 'grey'"
            @click="showFilterDialog = true"
          >
            <q-badge
              v-if="activeFiltersCount > 0"
              color="primary"
              :label="activeFiltersCount"
              rounded
              floating
            />
          </q-btn>

          <!-- 排序按鈕 -->
          <q-btn
            dense
            flat
            icon="sort"
            label="排序"
            :color="hasActiveSorts ? 'primary' : 'grey'"
            @click="showSortDialog = true"
          />
        </div>

        <!-- 右側操作 -->
        <div class="row items-center q-gutter-sm">
          <q-btn
            color="primary"
            icon="add"
            label="新增任務"
            @click="showCreateTaskDialog = true"
          />
        </div>
      </div>

      <!-- 視圖內容區 -->
      <q-tab-panels
        v-model="viewStore.currentViewId"
        animated
        class="bg-white"
        style="min-height: 400px"
      >
        <q-tab-panel
          v-for="view in viewStore.views"
          :key="view.viewId"
          :name="view.viewId"
          class="q-pa-none"
        >
          <!-- 根據視圖類型顯示不同元件 -->
          <component
            :is="getViewComponent(view.type)"
            :view="view"
            :tasks="filteredTasks"
            :project-id="'all'"
            @task-click="handleTaskClick"
            @task-update="handleTaskUpdate"
          />
        </q-tab-panel>
      </q-tab-panels>

      <!-- 載入狀態 -->
      <div v-if="taskStore.isLoading || viewStore.isLoading" class="q-pa-xl text-center">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md">載入中...</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-if="taskStore.error || viewStore.error" class="q-pa-xl text-center">
        <q-icon name="error" size="3em" color="negative" />
        <div class="q-mt-md text-negative">
          {{ taskStore.error || viewStore.error }}
        </div>
        <q-btn
          flat
          color="primary"
          label="重新載入"
          @click="loadData"
          class="q-mt-md"
        />
      </div>

      <!-- 無任務狀態 -->
      <div
        v-if="!taskStore.isLoading && !viewStore.isLoading &&
              !taskStore.error && !viewStore.error &&
              filteredTasks.length === 0"
        class="q-pa-xl text-center text-grey-6"
      >
        <q-icon name="task_alt" size="4em" />
        <div class="q-mt-md text-h6">目前沒有任務</div>
        <div class="q-mt-sm">點擊上方「新增任務」按鈕建立第一個任務</div>
      </div>
    </q-card>

    <!-- 建立任務對話框 -->
    <TaskDialog
      v-model="showCreateTaskDialog"
      mode="create"
      @task-created="handleTaskCreated"
    />

    <!-- 編輯任務對話框 -->
    <TaskDialog
      v-model="showEditTaskDialog"
      mode="edit"
      :task="selectedTask as Task"
      @task-updated="handleTaskUpdated"
    />

    <!-- 建立視圖對話框 -->
    <CreateViewDialog
      v-model="showCreateViewDialog"
      project-id="all"
      @view-created="handleViewCreated"
    />

    <!-- 篩選對話框 -->
    <FilterDialog
      v-model="showFilterDialog"
      :filters="currentFilters"
      @filters-updated="handleFiltersUpdated"
    />

    <!-- 排序對話框 -->
    <SortDialog
      v-model="showSortDialog"
      :sorts="currentSorts"
      @sorts-updated="handleSortsUpdated"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent, type Component } from 'vue'
import { useQuasar } from 'quasar'
import type { Task, View, ViewType, FilterConfig, SortConfig } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useViewStore } from '@/stores/view'

// 動態導入視圖元件
const TaskListView = defineAsyncComponent(() => import('@/components/views/TaskListView.vue'))
const TaskTableView = defineAsyncComponent(() => import('@/components/views/TaskTableView.vue'))
const TaskBoardView = defineAsyncComponent(() => import('@/components/views/TaskBoardView.vue'))
const TaskGanttView = defineAsyncComponent(() => import('@/components/views/TaskGanttView.vue'))
const TaskDashboardView = defineAsyncComponent(() => import('@/components/views/TaskDashboardView.vue'))

// 動態導入對話框元件
const TaskDialog = defineAsyncComponent(() => import('@/components/task/TaskDialog.vue'))
const CreateViewDialog = defineAsyncComponent(() => import('@/components/view/CreateViewDialog.vue'))
const FilterDialog = defineAsyncComponent(() => import('@/components/common/FilterDialog.vue'))
const SortDialog = defineAsyncComponent(() => import('@/components/common/SortDialog.vue'))

const $q = useQuasar()
const taskStore = useTaskStore()
const viewStore = useViewStore()

// 狀態
const searchQuery = ref('')
const showCreateTaskDialog = ref(false)
const showEditTaskDialog = ref(false)
const showCreateViewDialog = ref(false)
const showFilterDialog = ref(false)
const showSortDialog = ref(false)
const selectedTask = ref<Task | null>(null)

// 計算屬性
const currentFilters = computed(() => taskStore.currentFilters)
const currentSorts = computed(() => taskStore.currentSorts)

const hasActiveFilters = computed(() => currentFilters.value.length > 0)
const hasActiveSorts = computed(() => currentSorts.value.length > 0)
const activeFiltersCount = computed(() => currentFilters.value.length)

// 篩選後的任務
const filteredTasks = computed(() => {
  let tasks = taskStore.filteredTasks

  // 應用搜尋
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter((task: Task) =>
      task.title.toLowerCase().includes(query) ||
      (typeof task.description === 'object' &&
       JSON.stringify(task.description).toLowerCase().includes(query))
    )
  }

  return tasks
})

// 取得視圖圖示
function getViewIcon(type: ViewType): string {
  const icons: Record<ViewType, string> = {
    list: 'list',
    table: 'table_view',
    board: 'view_kanban',
    gantt: 'timeline',
    dashboard: 'dashboard'
  } as unknown as Record<ViewType, string>
  return icons[type] || 'view_list'
}

// 取得視圖元件
function getViewComponent(type: ViewType): Component {
  const components: Record<ViewType, Component> = {
    list: TaskListView,
    table: TaskTableView,
    board: TaskBoardView,
    gantt: TaskGanttView,
    dashboard: TaskDashboardView
  } as unknown as Record<ViewType, Component>
  return components[type] || TaskListView
}

// 載入資料
async function loadData(): Promise<void> {
  await Promise.all([
    taskStore.loadAllUserTasks(),
    viewStore.loadAllTasksViews()
  ])
}

// 處理任務點擊
function handleTaskClick(task: Task): void {
  selectedTask.value = task
  showEditTaskDialog.value = true
}

// 處理任務更新
async function handleTaskUpdate(taskId: string, updates: Partial<Task>): Promise<void> {
  const success = await taskStore.updateTask(taskId, updates)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務已更新',
      position: 'top'
    })
  }
}

// 處理任務建立
function handleTaskCreated(task: Task): void {
  $q.notify({
    type: 'positive',
    message: `任務「${task.title}」建立成功`,
    position: 'top'
  })
}

// 處理任務編輯完成
function handleTaskUpdated(task: Task): void {
  $q.notify({
    type: 'positive',
    message: `任務「${task.title}」已更新`,
    position: 'top'
  })
}

// 處理視圖建立
async function handleViewCreated(view: View): Promise<void> {
  try {
    // 使用 ViewStore 的 createView 方法來正確保存視圖
    const createdView = await viewStore.createView(
      view.projectId,
      view.name,
      view.type,
      view.config
    )
    
    if (createdView) {
      // 切換到新建立的視圖
      viewStore.switchView(createdView.viewId)
      
      $q.notify({
        type: 'positive',
        message: `視圖「${view.name}」建立成功`,
        position: 'top'
      })
    } else {
      throw new Error('Failed to create view')
    }
  } catch (error) {
    console.error('Failed to create view:', error)
    $q.notify({
      type: 'negative',
      message: '建立視圖失敗',
      position: 'top'
    })
  }
}

// 處理篩選更新
function handleFiltersUpdated(filters: FilterConfig[]): void {
  taskStore.setFilters(filters)
}

// 處理排序更新
function handleSortsUpdated(sorts: SortConfig[]): void {
  taskStore.setSorts(sorts)
}

// 監聽視圖變更，更新篩選和排序
watch(() => viewStore.currentView, (newView) => {
  if (newView) {
    taskStore.setFilters(newView.config.filters)
    taskStore.setSorts(newView.config.sorts)
    taskStore.setGroupBy(newView.config.groupBy || null)
  }
})

// 初始化
onMounted(async () => {
  await loadData()
})
</script>

<style scoped lang="scss">
.stat-card {
  min-width: 80px;
}

.q-tab-panel {
  padding: 0;
}
</style>
