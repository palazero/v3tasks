<template>
  <q-page class="q-pa-md">
    <!-- 專案資訊標題區 -->
    <div class="row items-start justify-between q-mb-md">
      <div class="col row full-width">
        <div class="row items-center q-gutter-sm">
          <q-avatar size="40px" color="primary" text-color="white">
            <q-icon :name="isAllTasksView ? 'list_alt' : projectIcon" />
          </q-avatar>

          <div>
            <h4 class="text-h4 q-my-none text-weight-light">
              {{ isAllTasksView ? '所有任務' : (project?.name || '載入中...') }}
            </h4>
            <p class="text-body2 text-grey-6 q-mt-sm q-mb-none">
              {{ isAllTasksView ? '查看您有權限存取的所有專案任務' : (project?.description || '無描述') }}
            </p>
          </div>

          <!-- 專案狀態標籤（僅專案模式顯示） -->
          <q-badge
            v-if="!isAllTasksView && isProjectOwner"
            color="orange"
            label="擁有者"
            class="q-ml-md"
          />
          <q-badge
            v-else-if="!isAllTasksView && isProjectMember"
            color="blue"
            label="成員"
            class="q-ml-md"
          />
        </div>

        <q-space />

        <!-- 專案成員顯示（僅專案模式顯示） -->
        <div v-if="!isAllTasksView" class="row items-center q-gutter-sm q-mr-md">
          <q-icon name="people" size="20px" class="text-grey-6" />
          <div class="row items-center q-gutter-xs">
            <q-avatar
              v-for="member in projectMembers"
              :key="member.userId"
              size="24px"
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
        <div class="row q-gutter-sm">
          <!-- 統計卡片 -->
          <q-card class="stat-card">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-h6 text-weight-bold">{{ isAllTasksView ? taskStore.taskStats.total : projectStats.total }}</div>
              <div class="text-caption text-grey-6">{{ isAllTasksView ? '總任務數' : '總任務' }}</div>
            </q-card-section>
          </q-card>

          <q-card class="stat-card">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-h6 text-weight-bold text-orange">{{ isAllTasksView ? taskStore.taskStats.inProgress : projectStats.inProgress }}</div>
              <div class="text-caption text-grey-6">進行中</div>
            </q-card-section>
          </q-card>

          <q-card v-if="isAllTasksView" class="stat-card">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-h6 text-weight-bold text-red">{{ taskStore.taskStats.overdue }}</div>
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
    <q-card class="full-width">
      <!-- 標準 Quasar Tabs (暫時不使用拖拉排序) -->
      <q-tabs
        :model-value="viewStore.currentViewId"
        @update:model-value="handleViewChange"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab
          v-for="view in viewStore.sortedViews"
          :key="view.viewId"
          :name="view.viewId"
          :label="view.name"
          :icon="getViewIcon(view.type)"
          @click="handleTabClick(view, $event)"
          class="view-tab"
        >
          <!-- 標籤操作選單 -->
          <q-menu
            :ref="(el) => setTabMenuRef(view.viewId, el)"
            anchor="bottom middle"
            self="top middle"
            :offset="[0, 5]"
          >
            <q-list dense style="min-width: 150px">
              <q-item clickable v-close-popup @click="editView(view)">
                <q-item-section avatar>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>編輯視圖</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="duplicateView(view)">
                <q-item-section avatar>
                  <q-icon name="content_copy" />
                </q-item-section>
                <q-item-section>複製視圖</q-item-section>
              </q-item>

              <q-separator v-if="view.isDeletable" />

              <q-item
                v-if="view.isDeletable"
                clickable
                v-close-popup
                @click="deleteView(view)"
                class="text-negative"
              >
                <q-item-section avatar>
                  <q-icon name="delete" color="negative" />
                </q-item-section>
                <q-item-section>刪除視圖</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
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
      <div class="row items-center justify-between q-pa-xs bg-grey-1">
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
            :project-id="projectId"
            @task-click="handleTaskClick"
            @task-update="handleTaskUpdate"
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

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
// import { VueDraggable } from 'vue-draggable-plus'
import type { Task, View, ViewType, FilterConfig, SortConfig, Project, User } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useViewStore } from '@/stores/view'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePermission } from '@/composables/usePermission'
import { getProjectRepository, getUserRepository } from '@/services/repositories'

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
const tabMenuRefs = ref<Record<string, { show: () => void } | null>>({})

// 判斷是否為 AllTasks 模式
const isAllTasksView = computed(() => props.projectId === 'all')

// 可拖拉的視圖列表（暫時註釋，未使用）
// const draggableViews = computed({
//   get: () => viewStore.sortedViews,
//   set: (newViews: View[]) => {
//     // 當拖拉重新排序時，直接更新
//     void handleTabsReorderImmediate(newViews)
//   }
// })

// 切換到指定視圖（暫時註釋，未使用）
// function switchToView(view: View): void {
//   viewStore.switchView(view.viewId)
// }

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
function setTabMenuRef(viewId: string, el: { show: () => void } | null): void {
  if (el) {
    tabMenuRefs.value[viewId] = el
  }
}

// 處理視圖變化（來自 q-tabs v-model）
function handleViewChange(viewId: string | null): void {
  if (viewId) {
    viewStore.switchView(viewId)
  }
}

// 記錄上次點擊的狀態
const lastClickedViewId = ref<string | null>(null)
const clickStartTime = ref<number>(0)

// Tab 點擊事件處理
function handleTabClick(view: View, event: Event): void {
  // 如果是點擊已選中的 tab，則顯示選單
  const isCurrentlySelected = view.viewId === viewStore.currentViewId
  const now = Date.now()

  if (isCurrentlySelected) {
    // 檢查是否是重複點擊
    const timeSinceLastClick = now - clickStartTime.value
    const isSameTabAsLastClick = lastClickedViewId.value === view.viewId

    if (isSameTabAsLastClick && timeSinceLastClick > 100) {
      // 阻止切換並顯示選單
      event.preventDefault()
      event.stopPropagation()

      setTimeout(() => {
        const menuRef = tabMenuRefs.value[view.viewId]
        if (menuRef) {
          menuRef.show()
        }
      }, 10)
    }
  } else {
    // 切換到新的 tab
    viewStore.switchView(view.viewId)
  }

  // 記錄點擊狀態
  lastClickedViewId.value = view.viewId
  clickStartTime.value = now
}

// Tab 拖拉排序處理（即時更新）（暫時註釋，未使用）
async function _handleTabsReorderImmediate(newViews: View[]): Promise<void> {
  try {
    // 建立新的排序資料
    const reorderData = newViews.map((view, index) => ({
      viewId: view.viewId,
      order: index
    }))

    // 更新視圖順序
    const success = await viewStore.reorderViews(reorderData)

    if (success) {
      $q.notify({
        type: 'positive',
        message: '視圖順序已更新',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Failed to reorder tabs:', error)
    $q.notify({
      type: 'negative',
      message: '更新視圖順序時發生錯誤',
      position: 'top'
    })
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

// 標準 Quasar tabs 樣式
.view-tab {
  position: relative;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
