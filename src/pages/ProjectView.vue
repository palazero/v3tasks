<template>
  <q-page class="project-view-layout">
    <!-- 專案資訊標題區 -->
    <div class="project-header row items-start justify-between q-mb-sm">
      <div class="col row full-width">
        <div class="row items-center q-gutter-sm">
          <q-avatar size="32px" color="primary" text-color="white">
            <q-icon v-if="isAllTasksView" name="list_alt" />
            <span v-else class="text-h5">{{ projectIcon }}</span>
          </q-avatar>

          <div>
            <div class="text-h5 q-my-none text-weight-medium">
              {{ isAllTasksView ? '所有任務' : (project?.name || '載入中...') }}
            </div>
            <p class="text-caption text-grey-6 q-mt-xs q-mb-none">
              {{ isAllTasksView ? '查看您有權限存取的所有專案任務' : (project?.description || '無描述') }}
            </p>
          </div>

          <!-- 專案狀態標籤（僅專案模式顯示） -->
          <q-badge
            v-if="!isAllTasksView && isProjectOwner"
            color="orange"
            label="擁有者"
            class="q-ml-sm"
          />
          <q-badge
            v-else-if="!isAllTasksView && isProjectMember"
            color="blue"
            label="成員"
            class="q-ml-sm"
          />
        </div>

        <q-space />

        <!-- 專案成員顯示（僅專案模式顯示） -->
        <div v-if="!isAllTasksView" class="row items-center q-gutter-xs q-mr-sm">
          <q-icon name="people" size="16px" class="text-grey-6" />
          <div class="row items-center q-gutter-xs">
            <q-avatar
              v-for="member in projectMembers"
              :key="member.userId"
              size="20px"
              class="cursor-pointer"
            >
              <img
                v-if="member.avatar"
                :src="member.avatar"
                :alt="member.name"
              >
              <q-icon v-else name="person" />
              <q-tooltip>{{ member.name }}</q-tooltip>
            </q-avatar>
          </div>
        </div>
      </div>

      <q-space />
      <!-- 右側操作按鈕 -->
      <div class="col-auto">
        <div class="row q-gutter-xs">
          <!-- 統計卡片 -->
          <q-card class="stat-card compact">
            <q-card-section class="q-pa-xs text-center">
              <div class="text-subtitle1 text-weight-bold">{{ isAllTasksView ? taskStore.taskStats.total : projectStats.total }}</div>
              <div class="text-caption text-grey-6">{{ isAllTasksView ? '總任務數' : '總任務' }}</div>
            </q-card-section>
          </q-card>

          <q-card class="stat-card compact">
            <q-card-section class="q-pa-xs text-center">
              <div class="text-subtitle1 text-weight-bold text-orange">{{ isAllTasksView ? taskStore.taskStats.inProgress : projectStats.inProgress }}</div>
              <div class="text-caption text-grey-6">進行中</div>
            </q-card-section>
          </q-card>

          <q-card v-if="isAllTasksView" class="stat-card compact">
            <q-card-section class="q-pa-xs text-center">
              <div class="text-subtitle1 text-weight-bold text-red">{{ taskStore.taskStats.overdue }}</div>
              <div class="text-caption text-grey-6">已逾期</div>
            </q-card-section>
          </q-card>

          <!-- 專案設定按鈕（僅專案模式顯示） -->
          <q-btn
            v-if="!isAllTasksView && isProjectOwner"
            flat
            icon="settings"
            @click="goToSettings"
          >
            <q-tooltip>專案設定</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- 視圖 Tabs -->
    <q-card class="view-card-container">
      <!-- 標準 Quasar Tabs (暫時不使用拖拉排序) -->
      <q-tabs
        :model-value="viewStore.currentViewId"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        inline-label
      >
        <q-tab
          v-for="view in viewStore.sortedViews"
          :key="view.viewId"
          :name="view.viewId"
          :label="view.name"
          :icon="getViewIcon(view.type)"
          :ref="(el) => setTabMenuRef(view.viewId, el as HTMLElement)"
          @click="handleTabClick(view)"
          class="view-tab"
        >
        </q-tab>

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
      <div class="row items-center justify-between compact-toolbar bg-grey-1">
        <div class="row items-center q-gutter-xs">
          <!-- 搜尋 -->
          <q-input
            v-model="searchQuery"
            placeholder="搜尋任務..."
            dense
            style="min-width: 180px"
            class="compact-input"
            debounce="300"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="sm" />
            </template>
            <template v-slot:append>
              <q-icon
                v-if="searchQuery"
                name="clear"
                size="sm"
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
            size="sm"
            :color="hasActiveFilters ? 'primary' : 'grey'"
            @click="showFilterDialog = true"
            class="compact-btn"
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
            size="sm"
            :color="hasActiveSorts ? 'primary' : 'grey'"
            @click="showSortDialog = true"
            class="compact-btn"
          />
        </div>

        <!-- 右側操作 -->
        <div class="row items-center q-gutter-xs">
          <q-btn
            color="primary"
            icon="add"
            label="新增任務"
            size="sm"
            @click="showCreateTaskDialog = true"
            class="compact-btn"
          />
        </div>
      </div>

      <!-- 視圖內容區 -->
      <q-tab-panels
        v-model="viewStore.currentViewId"
        animated
        class="view-content-panels bg-white"
      >
        <q-tab-panel
          v-for="view in viewStore.views"
          :key="view.viewId"
          :name="view.viewId"
          class="view-panel q-pa-none"
        >
          <!-- 根據視圖類型顯示不同元件 -->
          <component
            :is="getViewComponent(view.type)"
            :view="view"
            :tasks="filteredTasks"
            :project-id="projectId"
            @task-click="handleTaskClick"
            @task-update="handleTaskUpdate"
            @task-create="handleTaskCreate"
            @task-delete="handleTaskDelete"
          />
        </q-tab-panel>
      </q-tab-panels>

      <!-- 載入狀態 -->
      <div v-if="isLoading" class="q-pa-xl text-center">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md">載入中...</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-if="error" class="q-pa-xl text-center">
        <q-icon name="error" size="3em" color="negative" />
        <div class="q-mt-md text-negative">{{ error }}</div>
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
        v-if="!isLoading && !error && filteredTasks.length === 0"
        class="q-pa-xl text-center text-grey-6"
      >
        <q-icon name="task_alt" size="4em" />
        <div class="q-mt-md text-h6">此專案尚無任務</div>
        <div class="q-mt-sm">點擊上方「新增任務」按鈕建立第一個任務</div>
      </div>
    </q-card>

    <!-- 對話框們 -->
    <TaskDialog
      v-model="showCreateTaskDialog"
      mode="create"
      :project-id="projectId"
      @task-created="handleTaskCreated"
    />

    <TaskDialog
      v-model="showEditTaskDialog"
      mode="edit"
      :task="selectedTask as Task"
      @task-updated="handleTaskUpdated"
    />

    <CreateViewDialog
      v-model="showCreateViewDialog"
      :project-id="props.projectId"
      @view-created="handleViewCreated"
    />

    <EditViewDialog
      v-model="showEditViewDialog"
      :view="selectedView"
      @view-updated="handleViewUpdated"
    />

    <FilterDialog
      v-model="showFilterDialog"
      :filters="currentFilters"
      @filters-updated="handleFiltersUpdated"
    />

    <SortDialog
      v-model="showSortDialog"
      :sorts="currentSorts"
      @sorts-updated="handleSortsUpdated"
    />

    <!-- 標籤操作選單 -->
    <q-menu
      v-model="menuVisible"
      :target="menuTarget"
      anchor="bottom middle"
      self="top middle"
      :offset="[0, 5]"
    >
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="editView(selectedViewForMenu!)">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>編輯視圖</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="duplicateView(selectedViewForMenu!)">
          <q-item-section avatar>
            <q-icon name="content_copy" />
          </q-item-section>
          <q-item-section>複製視圖</q-item-section>
        </q-item>

        <q-separator v-if="selectedViewForMenu?.isDeletable" />

        <q-item
          v-if="selectedViewForMenu?.isDeletable"
          clickable
          v-close-popup
          @click="deleteView(selectedViewForMenu!)"
          class="text-negative"
        >
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section>刪除視圖</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { Task, View, ViewType, FilterConfig, SortConfig, Project, User } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useViewStore } from '@/stores/view'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePermission } from '@/composables/usePermission'
import { getProjectRepository, getUserRepository } from '@/services/repositories'
import { eventBus, EVENTS } from '@/services/eventBus'

// 動態導入元件
const TaskListView = defineAsyncComponent(() => import('@/components/views/TaskListView.vue'))
const TaskTableView = defineAsyncComponent(() => import('@/components/views/TaskTableView.vue'))
const TaskBoardView = defineAsyncComponent(() => import('@/components/views/TaskBoardView.vue'))
const TaskGanttView = defineAsyncComponent(() => import('@/components/views/TaskGanttView.vue'))
const TaskDashboardView = defineAsyncComponent(() => import('@/components/views/TaskDashboardView.vue'))

const TaskDialog = defineAsyncComponent(() => import('@/components/task/TaskDialog.vue'))
const CreateViewDialog = defineAsyncComponent(() => import('@/components/view/CreateViewDialog.vue'))
const EditViewDialog = defineAsyncComponent(() => import('@/components/view/EditViewDialog.vue'))
const FilterDialog = defineAsyncComponent(() => import('@/components/common/FilterDialog.vue'))
const SortDialog = defineAsyncComponent(() => import('@/components/common/SortDialog.vue'))

// Props
const props = defineProps<{
  projectId: string
}>()

const router = useRouter()
const $q = useQuasar()
const taskStore = useTaskStore()
const viewStore = useViewStore()
const { userId: currentUserId } = useCurrentUser()
const { isProjectOwner: checkIsProjectOwner } = usePermission()

// Repository
const projectRepo = getProjectRepository()
const userRepo = getUserRepository()

// 狀態
const project = ref<Project | null>(null)
const projectMembers = ref<User[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

// 對話框狀態
const showCreateTaskDialog = ref(false)
const showEditTaskDialog = ref(false)
const showCreateViewDialog = ref(false)
const showEditViewDialog = ref(false)
const showFilterDialog = ref(false)
const showSortDialog = ref(false)
const selectedTask = ref<Task | undefined>(undefined)
const selectedView = ref<View | undefined>(undefined)

// 選單 refs 管理
const tabMenuRefs = ref<Record<string, HTMLElement | null>>({})
const menuVisible = ref(false)
const menuTarget = ref<HTMLElement | null>(null)
const selectedViewForMenu = ref<View | null>(null)

// 判斷是否為 AllTasks 模式
const isAllTasksView = computed(() => props.projectId === 'all')

// 計算屬性
const currentFilters = computed(() => taskStore.currentFilters)
const currentSorts = computed(() => taskStore.currentSorts)

const hasActiveFilters = computed(() => currentFilters.value.length > 0)
const hasActiveSorts = computed(() => currentSorts.value.length > 0)
const activeFiltersCount = computed(() => currentFilters.value.length)

const isProjectOwner = computed(() => {
  return project.value ? checkIsProjectOwner(project.value.ownerId) : false
})

const isProjectMember = computed(() => {
  if (!project.value) return false
  return project.value.ownerId === currentUserId.value ||
         project.value.memberIds.includes(currentUserId.value)
})

const projectIcon = computed(() => {
  // 如果專案有自訂圖示，使用自訂圖示
  if (project.value?.icon && project.value.icon !== '') {
    return project.value.icon
  }
  // 否則根據是否為擁有者來決定預設圖示
  return isProjectOwner.value ? 'folder_special' : 'folder'
})

const projectStats = computed(() => taskStore.taskStats)

// 篩選後的任務
const filteredTasks = computed(() => {
  let tasks = taskStore.filteredTasks

  // 應用搜尋
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter(task =>
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
  }
  return icons[type] || 'view_list'
}

// 取得視圖元件
function getViewComponent(type: ViewType): Component {
  const components = {
    list: TaskListView,
    table: TaskTableView,
    board: TaskBoardView,
    gantt: TaskGanttView,
    dashboard: TaskDashboardView
  }
  return components[type] || TaskListView
}

// 載入專案資料
async function loadProjectData(): Promise<void> {
  // AllTasks 模式不需要載入專案資料
  if (isAllTasksView.value) {
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // 載入專案資訊
    const projectData = await projectRepo.findById(props.projectId)
    if (!projectData) {
      throw new Error('專案不存在')
    }
    project.value = projectData

    // 載入專案成員
    const memberIds = [projectData.ownerId, ...projectData.memberIds]
    const members = await userRepo.findByIds(memberIds)
    projectMembers.value = members

  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入專案資料失敗'
    console.error('Failed to load project data:', err)
  } finally {
    isLoading.value = false
  }
}

// 載入所有資料
async function loadData(): Promise<void> {
  // 清理上一個專案的視圖狀態
  viewStore.clearCurrentProject()

  if (isAllTasksView.value) {
    // AllTasks 模式：載入所有用戶任務和AllTasks視圖
    await Promise.all([
      taskStore.loadAllUserTasks(),
      viewStore.loadAllTasksViews()
    ])
  } else {
    // 專案模式：載入專案資料、任務和視圖
    await Promise.all([
      loadProjectData(),
      taskStore.loadProjectTasks(props.projectId),
      viewStore.loadProjectViews(props.projectId)
    ])
  }
}

// 前往專案設定
function goToSettings(): void {
  void router.push({
    name: 'ProjectSettings',
    params: { projectId: props.projectId }
  })
}

// 設定標籤選單 ref
function setTabMenuRef(viewId: string, el: HTMLElement | null): void {
  if (el) tabMenuRefs.value[viewId] = el.$el
}

// Tab 點擊事件處理
function handleTabClick(view: View): void {
  const lastViewId = viewStore.getLastViewId(props.projectId)
  if (lastViewId !== view.viewId) {
    menuTarget.value = null
    menuVisible.value = false
    selectedViewForMenu.value = null
    viewStore.switchView(view.viewId)
  } else {
    menuTarget.value = tabMenuRefs.value[view.viewId]
    selectedViewForMenu.value = view
    menuVisible.value = !menuVisible.value
  }
}

// 編輯視圖
function editView(view: View): void {
  selectedView.value = view
  showEditViewDialog.value = true
}

// 複製視圖
function duplicateView(view: View): void {
  $q.dialog({
    title: '複製視圖',
    message: '請輸入新視圖的名稱',
    prompt: {
      model: `${view.name} (複製)`,
      type: 'text'
    },
    cancel: true,
    persistent: false
  }).onOk((viewName: string) => {
    if (viewName) {
      void viewStore.duplicateView(view.viewId, viewName).then((newView) => {
        if (newView) {
          $q.notify({
            type: 'positive',
            message: `視圖「${newView.name}」複製成功`,
            position: 'top'
          })
        }
      })
    }
  })
}

// 刪除視圖
function deleteView(view: View): void {
  if (!view.isDeletable) return

  $q.dialog({
    title: '刪除視圖',
    message: `確定要刪除視圖「${view.name}」嗎？此操作無法復原。`,
    cancel: true,
    persistent: false
  }).onOk(() => {
    void viewStore.deleteView(view.viewId).then((success) => {
      if (success) {
        $q.notify({
          type: 'positive',
          message: '視圖已刪除',
          position: 'top'
        })
      }
    })
  })
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

// 處理甘特圖任務建立
function handleTaskCreate(taskData: Partial<Task>): void {
  // 設定預設值
  const newTaskData = {
    ...taskData,
    projectId: taskData.projectId || props.projectId,
    statusId: taskData.statusId || 'todo',
    priorityId: taskData.priorityId || 'medium'
  }

  selectedTask.value = newTaskData as Task
  showCreateTaskDialog.value = true
}

// 處理甘特圖任務刪除
async function handleTaskDelete(taskId: string): Promise<void> {
  const success = await taskStore.deleteTask(taskId)
  if (success) {
    $q.notify({
      type: 'positive',
      message: '任務已刪除',
      position: 'top'
    })
  }
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

// 處理視圖更新
function handleViewUpdated(view: View): void {
  $q.notify({
    type: 'positive',
    message: `視圖「${view.name}」已更新`,
    position: 'top'
  })
}

// 處理篩選更新
function handleFiltersUpdated(filters: FilterConfig[]): void {
  taskStore.setFilters(filters)
}

// 處理排序更新
function handleSortsUpdated(sorts: SortConfig[]): void {
  taskStore.setSorts(sorts)
}

// 監聽視圖變更
watch(() => viewStore.currentView, (newView) => {
  if (newView) {
    taskStore.setFilters(newView.config.filters)
    taskStore.setSorts(newView.config.sorts)
    taskStore.setGroupBy(newView.config.groupBy || null)
  }
})

// 監聽專案 ID 變更
watch(() => props.projectId, () => {
  void loadData()
}, { immediate: false })

// 監聽專案更新事件
eventBus.on(EVENTS.PROJECT_UPDATED, (updatedProject: unknown) => {
  // 如果更新的是當前專案，重新載入專案資料
  if (updatedProject && typeof updatedProject === 'object' && updatedProject !== null && 'projectId' in updatedProject) {
    const project = updatedProject as { projectId: string }
    if (project.projectId === props.projectId) {
      void loadProjectData()
    }
  }
})

// 初始化
onMounted(async () => {
  await loadData()
})
</script>

<style scoped lang="scss">
// 頁面整體佈局 - 直接作用在 q-page 上
.project-view-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px); // 扣除可能的 header 高度
  min-height: unset !important; // 覆蓋 Quasar 預設的 min-height
  padding: 8px;
  box-sizing: border-box;
}

// 專案標題區域 - 固定高度
.project-header {
  flex-shrink: 0;
  margin-bottom: 8px;
}

// 視圖卡片容器 - 填滿剩餘空間
.view-card-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; // 卡片容器不滾動
}

// 視圖內容面板 - 只有這個區域有滾軸
.view-content-panels {
  flex: 1;
  overflow: auto; // 只有內容面板有滾軸
  min-height: 0;
}

// 視圖面板 - 讓內容自然展開
.view-panel {
  padding: 0;
}

// 統計卡片緊湊樣式
.stat-card {
  min-width: 70px;

  &.compact {
    .q-card__section {
      padding: 6px 8px !important;
    }
  }
}

// 緊湊工具列
.compact-toolbar {
  min-height: 40px;
  padding: 0 8px;
}

// 緊湊輸入框
.compact-input :deep(.q-field__control) {
  min-height: 28px;
  max-height: 28px;
}

.compact-input :deep(.q-field__native) {
  min-height: 28px;
  max-height: 28px;
}

.compact-input :deep(.q-field__marginal) {
  min-height: 28px;
  max-height: 28px;
}

// 緊湊按鈕
.compact-btn {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.875rem;
}

.q-tab-panel {
  padding: 0;
}

// 標準 Quasar tabs 樣式
.view-tab {
  position: relative;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}

// 頭像和圖示尺寸調整
:deep(.q-avatar) {
  &.cursor-pointer {
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }
  }
}
</style>
