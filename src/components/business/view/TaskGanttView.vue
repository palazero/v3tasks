<template>
  <div class="gantt-wrapper">
    <!-- 欄位管理對話框 -->
    <ViewColumnManager
      v-model="showColumnManager"
      :view-type="'gantt'"
      :columns="currentColumnConfig"
      :field-definitions="allFieldDefinitions"
      @apply="handleColumnConfigUpdate"
    />

    <!-- 甘特圖容器 -->
    <div ref="ganttContainer" class="gantt-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import type { Task, ColumnConfig, ViewConfiguration } from '@/types'
import { useDhtmlxGantt } from '@/composables/useDhtmlxGantt'
import { useCustomFields } from '@/composables/useCustomFields'
import { useQuasar } from 'quasar'
import { getProjectRepository, getUserRepository } from '@/services/repositories'
import type { Project, User } from '@/types'
import ViewColumnManager from '@/components/business/view/ViewColumnManager.vue'
import { getFieldsForView, type FieldDefinition } from '@/config/columnDefinitions'
import { getColumnConfigService } from '@/services/application/column-config.service'

// Props
interface Props {
  tasks: Task[]
  projectId?: string
  configuration?: ViewConfiguration

  // 工具列事件
  expandAll?: boolean
  collapseAll?: boolean
  zoomIn?: boolean
  zoomOut?: boolean
  fitToScreen?: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
  'task-create': [taskData: Partial<Task>]
  'task-delete': [taskId: string]
  'configuration-update': [configuration: ViewConfiguration]

  // 甘特圖設定變更事件
  'gantt-settings-changed': [settings: {
    timelineScale: string
    showWeekends: boolean
    showDependencies: boolean
    showProgress: boolean
    timelineDragEnabled: boolean
  }]
}>()

const $q = useQuasar()
const ganttContainer = ref<HTMLElement>()

// Composables
const {
  settings: ganttSettings,
  timelineScaleOptions,
  convertTasksToDhtmlx,
  convertDhtmlxToTask,
  convertSingleTask,
  parseDhtmlxDate,
  getGanttConfig,
  getTimelineScales,
  getChineseLocale
} = useDhtmlxGantt()

// 狀態
const ganttInstance = ref(false)
const taskMap = ref<Map<string, Task>>(new Map())
const timelineDragEnabled = ref(true)
const projectsMap = ref<Map<string, string>>(new Map())
const usersMap = ref<Map<string, string>>(new Map())
const projectRepo = getProjectRepository()
const userRepo = getUserRepository()
const { customFields: projectCustomFields } = useCustomFields(props.projectId || '')
const columnConfigService = getColumnConfigService()

// 更新控制標誌
let isExternalUpdate = false

// 欄位管理狀態
const showColumnManager = ref(false)
const currentColumnConfig = ref<ColumnConfig[]>([])
const allFieldDefinitions = ref<FieldDefinition[]>([])

// 初始化甘特圖
function initializeGantt(): void {
  if (!ganttContainer.value) {
    return
  }

  // 設定中文語言包
  gantt.locale = getChineseLocale()

  // 基礎配置（傳入欄位配置）
  const config = getGanttConfig(currentColumnConfig.value)
  Object.assign(gantt.config, config)

  // 額外配置
  gantt.config.open_tree_initially = true
  gantt.config.preserve_scroll = true
  gantt.config.touch = true
  gantt.config.touch_drag = true
  gantt.config.sort = true

  // 時間軸拖拉配置
  gantt.config.drag_timeline = {
    useKey: false,  // 不需要按住特定按鍵就能拖拉
    ignore: '.gantt_task_line, .gantt_task_link'  // 忽略任務條和連線
  }

  // 啟用拖拽功能
  gantt.config.drag_progress = ganttSettings.value.showProgress
  gantt.config.drag_resize = true
  gantt.config.drag_move = true
  gantt.config.drag_links = ganttSettings.value.showDependencies

  // 啟用擴展功能 (GPL 版本支援)
  gantt.plugins({
    tooltip: true,
    undo: true,
    marker: true,
    keyboard_navigation: true,
    inline_editors: true,
    drag_timeline: true  // 啟用時間軸拖拉功能
  })

  // 自訂 tooltip
  gantt.templates.tooltip_text = (start, end, task): string => {
    // 安全的日期格式化函數
    const formatDate = (date: unknown): string => {
      try {
        if (!date) return '未設定'

        // 如果是字串，嘗試轉換為日期
        if (typeof date === 'string') {
          const parsedDate = new Date(date)
          if (isNaN(parsedDate.getTime())) return '無效日期'
          return gantt.date.date_to_str('%Y-%m-%d')(parsedDate)
        }

        // 如果是日期對象
        if (date instanceof Date) {
          if (isNaN(date.getTime())) return '無效日期'
          return gantt.date.date_to_str('%Y-%m-%d')(date)
        }

        // 嘗試直接使用 gantt 的日期格式化（可能是 gantt 內部日期格式）
        return gantt.date.date_to_str('%Y-%m-%d')(date)
      } catch (error) {
        return '日期錯誤'
      }
    }

    // 專案根節點使用特殊的 tooltip
    if (task.status === 'project') {
      return `<b>專案:</b> ${task.text.replace('📁 ', '').split(' (')[0]}<br/>
              <b>時間:</b> ${formatDate(start)} - ${formatDate(end)}`
    }

    const originalTask = taskMap.value.get(task.id)
    return `<b>任務:</b> ${task.text}<br/>
            <b>狀態:</b> ${getStatusText(task.status)}<br/>
            <b>指派人:</b> ${originalTask?.assigneeId || '未指派'}<br/>
            <b>時間:</b> ${formatDate(start)} - ${formatDate(end)}`
  }

  // 自訂任務條樣式
  gantt.templates.task_class = (start, end, task): string => {
    if (task.status === 'project') {
      return 'gantt-project-bar'
    }
    return ''
  }

  // 設定事件處理器
  setupEventHandlers()

  // 初始化甘特圖
  gantt.init(ganttContainer.value)
  ganttInstance.value = true

  // 初始化縮放配置
  updateTimelineZoom()

  // 載入初始資料
  void loadGanttData()

  // 新增今日標記線
  addTodayMarker()
}

// 設定事件處理器
function setupEventHandlers(): void {
  // 防止專案根節點被拖拉或編輯
  gantt.attachEvent('onBeforeTaskDrag', (id) => {
    const task = gantt.getTask(id)
    return task?.status !== 'project' // 專案節點無法拖拉
  })

  gantt.attachEvent('onBeforeLightbox', (id) => {
    const task = gantt.getTask(id)
    return task?.status !== 'project' // 專案節點無法編輯
  })

  // 任務更新事件
  gantt.attachEvent('onAfterTaskUpdate', (id, item) => {
    // 跳過專案根節點
    if (item.status === 'project') return

    // 跳過外部更新觸發的事件，避免迴圈
    if (isExternalUpdate) {
      return
    }

    const originalTask = taskMap.value.get(id)
    if (originalTask) {
      const updates = convertDhtmlxToTask(item, originalTask)
      emit('task-update', id, updates)
    }
  })

  // 進度更新事件
  gantt.attachEvent('onAfterProgressDrag', (id, progress) => {
    const task = gantt.getTask(id)
    // 跳過專案根節點
    if (task?.status === 'project') return

    let statusId = 'todo'
    if (progress >= 1) statusId = 'done'
    else if (progress > 0) statusId = 'inProgress'

    emit('task-update', id, { statusId })
  })

  // 任務雙擊事件
  gantt.attachEvent('onTaskDblClick', (id) => {
    const task = gantt.getTask(id)
    // 跳過專案根節點
    if (task?.status === 'project') return false

    const originalTask = taskMap.value.get(id)
    if (originalTask) {
      emit('task-click', originalTask)
    }
    return false // 阻止預設編輯器
  })

  // 任務刪除事件
  gantt.attachEvent('onAfterTaskDelete', (id) => {
    emit('task-delete', id)
  })

  // 右鍵選單事件
  gantt.attachEvent('onContextMenu', (taskId, linkId, e) => {
    e.preventDefault()
    if (taskId) {
      showTaskContextMenu(e, taskId)
    } else if (!linkId) {
      showContextMenu(e)
    }
    return false
  })

  // 滾輪縮放事件
  gantt.attachEvent('onGanttReady', () => {
    const ganttElement = ganttContainer.value
    if (ganttElement) {
      ganttElement.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()

          if (e.deltaY < 0) {
            // 滾輪向上 - 放大
            zoomIn()
          } else {
            // 滾輪向下 - 縮小
            zoomOut()
          }
        }
      }, { passive: false })
    }
  })
}

// 載入用戶資訊
async function loadUsersInfo(): Promise<void> {
  try {
    // 從任務中取得唯一的用戶 ID
    const userIds = [...new Set(props.tasks.map(task => task.assigneeId).filter(Boolean))]

    if (userIds.length === 0) {
      return
    }

    // 批次載入用戶資訊
    const users = await userRepo.findByIds(userIds)

    // 更新用戶名稱映射
    usersMap.value.clear()
    users.forEach(user => {
      usersMap.value.set(user.userId, user.name)
    })

  } catch (error) {
    console.error('Failed to load users info:', error)
    // 如果載入失敗，使用用戶 ID 作為名稱
    const userIds = [...new Set(props.tasks.map(task => task.assigneeId).filter(Boolean))]
    userIds.forEach(userId => {
      usersMap.value.set(userId, `用戶 ${userId}`)
    })
  }
}

// 載入專案資訊（All Projects 模式）
async function loadProjectsInfo(): Promise<void> {
  try {
    // 從任務中取得唯一的專案 ID
    const projectIds = [...new Set(props.tasks.map(task => task.projectId))]

    // 批次載入專案資訊
    const projects = await Promise.all(
      projectIds.map(async (projectId) => {
        const project = await projectRepo.findById(projectId)
        return { projectId, project }
      })
    )

    // 更新專案名稱映射
    projectsMap.value.clear()
    projects.forEach(({ projectId, project }) => {
      if (project) {
        projectsMap.value.set(projectId, project.name)
      } else {
        projectsMap.value.set(projectId, `專案 ${projectId}`)
      }
    })

  } catch (error) {
    console.error('Failed to load projects info:', error)
    // 如果載入失敗，使用預設名稱
    const projectIds = [...new Set(props.tasks.map(task => task.projectId))]
    projectIds.forEach(projectId => {
      projectsMap.value.set(projectId, `專案 ${projectId}`)
    })
  }
}

// 載入甘特圖資料
async function loadGanttData(): Promise<void> {
  if (!ganttInstance.value) return

  // 建立任務映射
  taskMap.value.clear()
  props.tasks.forEach(task => {
    taskMap.value.set(task.taskId, task)
  })

  // 判斷是否為 All Projects 模式
  const isAllProjects = props.projectId === 'all'

  // 載入用戶資訊（所有模式都需要）
  await loadUsersInfo()

  // 如果是 All Projects 模式，載入專案資訊
  if (isAllProjects) {
    await loadProjectsInfo()
  }

  // 轉換資料格式
  const dhtmlxData = convertTasksToDhtmlx(props.tasks, isAllProjects, projectsMap.value, usersMap.value)

  // 清空並載入新資料
  gantt.clearAll()
  gantt.parse(dhtmlxData)

  // 載入資料後重新新增今日標記線
  addTodayMarker()
}

// 精準更新單個任務
function updateSingleTask(taskId: string, taskData: Task): void {
  if (!ganttInstance.value || !gantt.isTaskExists(taskId)) {
    return
  }

  isExternalUpdate = true
  try {
    // 更新任務映射
    taskMap.value.set(taskId, taskData)

    // 獲取現有的甘特圖任務資料作為基礎
    const existingTask = gantt.getTask(taskId)

    // 使用標準轉換函數處理單個任務
    const convertedTask = convertSingleTask(taskData, usersMap.value)

    // 轉換日期字串為 Date 對象（dhtmlx-gantt updateTask 方法需要 Date 對象）
    let startDate = null
    if (convertedTask.start_date) {
      try {
        // 如果是字串格式，解析為 Date 對象
        if (typeof convertedTask.start_date === 'string') {
          startDate = parseDhtmlxDate(convertedTask.start_date)
        } else {
          startDate = convertedTask.start_date
        }
      } catch (error) {
        startDate = taskData.startDateTime ? new Date(taskData.startDateTime) : new Date()
      }
    }

    // 合併現有任務資料和轉換後的資料，保留必要的甘特圖內部屬性
    const updatedTask = {
      ...existingTask,
      ...convertedTask,
      // 確保 ID 保持一致
      id: taskId,
      // 保留父任務關係（避免意外改變層級結構）
      parent: existingTask.parent,
      // 使用 Date 對象格式的開始日期
      start_date: startDate
    }

    // 更新甘特圖中的任務
    gantt.updateTask(taskId, updatedTask)

    // 刷新任務顯示
    gantt.refreshTask(taskId)
  } catch (error) {
    // 如果精準更新失敗，嘗試完整轉換方式
    try {
      const isAllProjects = props.projectId === 'all'
      const dhtmlxData = convertTasksToDhtmlx([taskData], isAllProjects, projectsMap.value, usersMap.value)

      if (dhtmlxData.data && dhtmlxData.data.length > 0) {
        const convertedTask = dhtmlxData.data[0]
        const existingTask = gantt.getTask(taskId)

        // 處理日期格式（批量轉換也可能返回字串格式）
        let batchStartDate = convertedTask.start_date
        if (typeof convertedTask.start_date === 'string') {
          try {
            batchStartDate = parseDhtmlxDate(convertedTask.start_date)
          } catch (error) {
            batchStartDate = taskData.startDateTime ? new Date(taskData.startDateTime) : new Date()
          }
        }

        // 確保保留重要的甘特圖內部屬性
        const finalTask = {
          ...convertedTask,
          id: taskId,
          parent: existingTask.parent,
          start_date: batchStartDate
        }

        gantt.updateTask(taskId, finalTask)
        gantt.refreshTask(taskId)
      }
    } catch (fallbackError) {
      // 最後手段：重載整個甘特圖
      void loadGanttData()
    }
  } finally {
    isExternalUpdate = false
  }
}

// 找出變化的任務
function findChangedTasks(newTasks: Task[], oldTasks?: Task[]): Task[] {
  if (!oldTasks || oldTasks.length === 0) {
    return newTasks // 首次載入，返回所有任務
  }

  const oldTaskMap = new Map(oldTasks.map(t => [t.taskId, t]))
  const changedTasks: Task[] = []

  for (const newTask of newTasks) {
    const oldTask = oldTaskMap.get(newTask.taskId)

    if (!oldTask) {
      // 新增的任務
      changedTasks.push(newTask)
    } else if (isTaskChanged(newTask, oldTask)) {
      // 修改的任務
      changedTasks.push(newTask)
    }
  }

  return changedTasks
}

// 檢查任務是否有變化
function isTaskChanged(newTask: Task, oldTask: Task): boolean {
  // 比較關鍵欄位
  const keyFields = [
    'title', 'statusId', 'priorityId', 'assigneeId', 'progress',
    'startDateTime', 'endDateTime', 'description', 'tags'
  ]

  for (const field of keyFields) {
    const newValue = newTask[field as keyof Task]
    const oldValue = oldTask[field as keyof Task]

    // 特殊處理日期比較
    if (field === 'startDateTime' || field === 'endDateTime') {
      const newDate = newValue ? new Date(newValue as Date).getTime() : null
      const oldDate = oldValue ? new Date(oldValue as Date).getTime() : null
      if (newDate !== oldDate) return true
    }
    // 特殊處理陣列比較 (tags)
    else if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) return true
    }
    // 特殊處理物件比較 (description)
    else if (typeof newValue === 'object' && typeof oldValue === 'object') {
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) return true
    }
    // 一般比較
    else if (newValue !== oldValue) {
      return true
    }
  }

  return false
}

// 新增今日標記線
function addTodayMarker(): void {
  if (!ganttInstance.value) return

  // 清除現有的今日標記
  gantt.deleteMarker('today')

  // 新增今日標記線
  const today = new Date()
  gantt.addMarker({
    id: 'today',
    start_date: today,
    css: 'today-marker',
    text: '今日',
    title: `今日: ${gantt.date.date_to_str('%Y年%m月%d日')(today)}`
  })
}

// 更新時間軸
function updateTimeline(): void {
  if (!ganttInstance.value) return

  // 取得當前欄位寬度
  const currentWidth = Math.round(getBaseColumnWidth(ganttSettings.value.timelineScale) * timelineZoomLevel.value)
  gantt.config.scales = getTimelineScales(ganttSettings.value.timelineScale, currentWidth)
  gantt.render()

  // 重新新增今日標記線
  addTodayMarker()
}

// 工具欄功能
function addNewTask(): void {
  const today = new Date()
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  emit('task-create', {
    title: '新任務',
    startDateTime: today,
    endDateTime: endDate,
    statusId: 'todo',
    projectId: props.projectId
  })
}

function expandAll(): void {
  if (!ganttInstance.value) return

  gantt.eachTask((task) => {
    if (gantt.hasChild(task.id)) {
      gantt.open(task.id)
    }
  })
  gantt.render()
}

function collapseAll(): void {
  if (!ganttInstance.value) return

  gantt.eachTask((task) => {
    if (gantt.hasChild(task.id)) {
      gantt.close(task.id)
    }
  })
  gantt.render()
}

// 時間軸細粒度縮放狀態
const timelineZoomLevel = ref(1.0) // 1.0 為預設縮放級別
const minZoomLevel = 0.3 // 最小縮放級別
const maxZoomLevel = 3.0 // 最大縮放級別

function zoomIn(): void {
  if (!ganttInstance.value) return

  // 細粒度縮放：持續調整同一尺度內的寬度
  if (timelineZoomLevel.value < maxZoomLevel) {
    timelineZoomLevel.value = Math.min(maxZoomLevel, timelineZoomLevel.value + 0.2)
    updateTimelineZoom() // 這會觸發自動尺度切換檢查
  }
  // 移除手動切換邏輯，改由 checkAutoScaleSwitch 自動處理
}

function zoomOut(): void {
  if (!ganttInstance.value) return

  // 細粒度縮放：持續調整同一尺度內的寬度
  if (timelineZoomLevel.value > minZoomLevel) {
    timelineZoomLevel.value = Math.max(minZoomLevel, timelineZoomLevel.value - 0.2)
    updateTimelineZoom() // 這會觸發自動尺度切換檢查
  }
  // 移除手動切換邏輯，改由 checkAutoScaleSwitch 自動處理
}

// 更新時間軸縮放
function updateTimelineZoom(): void {
  if (!ganttInstance.value) return

  // 根據縮放級別調整列寬度
  const baseWidth = getBaseColumnWidth(ganttSettings.value.timelineScale)
  let scaledWidth = Math.round(baseWidth * timelineZoomLevel.value)

  // 檢查是否需要自動切換時間尺度
  const scaleChanged = checkAutoScaleSwitch(scaledWidth)

  // 如果時間尺度發生切換，重新計算寬度
  if (scaleChanged) {
    const newBaseWidth = getBaseColumnWidth(ganttSettings.value.timelineScale)
    scaledWidth = Math.round(newBaseWidth * timelineZoomLevel.value)
  }

  // 動態更新甘特圖配置
  gantt.config.min_column_width = scaledWidth
  gantt.config.scale_width = scaledWidth

  // 根據新的欄位寬度更新時間軸格式
  gantt.config.scales = getTimelineScales(ganttSettings.value.timelineScale, scaledWidth)

  // 重新渲染甘特圖
  gantt.render()
}

// 檢查是否需要自動切換時間尺度
function checkAutoScaleSwitch(currentWidth: number): boolean {
  const currentScale = ganttSettings.value.timelineScale

  // 縮小時的自動切換邏輯
  if (currentScale === 'day' && currentWidth < 24) {
    // 日視圖小於 24px 時自動切換為週視圖
    ganttSettings.value.timelineScale = 'week'
    timelineZoomLevel.value = 1.0 // 重置縮放級別
    return true
  }

  if (currentScale === 'week' && currentWidth < 30) {
    // 週視圖小於 30px 時自動切換為月視圖
    ganttSettings.value.timelineScale = 'month'
    timelineZoomLevel.value = 1.0 // 重置縮放級別
    return true
  }

  // 放大時的自動切換邏輯（反向切換）
  if (currentScale === 'week' && currentWidth > 120) {
    // 週視圖大於 120px 時可以切換回日視圖
    ganttSettings.value.timelineScale = 'day'
    // 設定為最小日視圖寬度對應的縮放級別 (24px / 40px = 0.6)
    timelineZoomLevel.value = 0.6
    return true
  }

  if (currentScale === 'month' && currentWidth > 180) {
    // 月視圖大於 180px 時可以切換回週視圖
    ganttSettings.value.timelineScale = 'week'
    // 設定為最小週視圖寬度對應的縮放級別 (30px / 80px = 0.375，但最小是0.3)
    timelineZoomLevel.value = Math.max(0.3, 30 / 80)
    return true
  }

  return false // 沒有發生切換
}

// 取得基礎列寬度
function getBaseColumnWidth(scale: string): number {
  const baseWidths: Record<string, number> = {
    'day': 40,    // 日視圖基礎寬度
    'week': 80,   // 週視圖基礎寬度
    'month': 120  // 月視圖基礎寬度
  }
  return baseWidths[scale] || 40
}

function fitToScreen(): void {
  if (!ganttInstance.value) return
  gantt.render()
}

// 右鍵選單
function showContextMenu(e: MouseEvent): void {
  const menu = createContextMenu([
    {
      text: '新增任務',
      icon: '➕',
      action: () => addNewTask()
    }
  ])

  showMenu(menu, e)
}

function showTaskContextMenu(e: MouseEvent, taskId: string): void {
  const task = gantt.getTask(taskId)
  if (!task) return

  const menu = createContextMenu([
    {
      text: '編輯任務',
      icon: '✏️',
      action: () => {
        const originalTask = taskMap.value.get(taskId)
        if (originalTask) {
          emit('task-click', originalTask)
        }
      }
    },
    {
      text: '新增任務',
      icon: '➕',
      action: () => {
        emit('task-create', {
          title: '新任務',
          startDateTime: new Date(),
          endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          statusId: 'todo',
          parentTaskId: task.parent === 0 ? undefined : String(task.parent),
          projectId: props.projectId
        })
      }
    },
    {
      text: '新增子任務',
      icon: '📁',
      action: () => {
        emit('task-create', {
          title: '新子任務',
          startDateTime: new Date(),
          endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          statusId: 'todo',
          parentTaskId: taskId,
          projectId: props.projectId
        })
      }
    },
    { type: 'divider' },
    {
      text: '刪除任務',
      icon: '🗑️',
      danger: true,
      action: () => {
        $q.dialog({
          title: '確認刪除',
          message: `確定要刪除任務「${task.text}」嗎？`,
          cancel: true
        }).onOk(() => {
          emit('task-delete', taskId)
        })
      }
    }
  ])

  showMenu(menu, e)
}

function createContextMenu(items: Array<{
  text?: string
  icon?: string
  action?: () => void
  danger?: boolean
  type?: 'divider'
}>): HTMLElement {
  const menu = document.createElement('div')
  menu.className = 'gantt-context-menu'
  menu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: inherit;
    user-select: none;
    overflow: hidden;
    min-width: 150px;
    z-index: 1000;
  `

  items.forEach(item => {
    if (item.type === 'divider') {
      const divider = document.createElement('div')
      divider.style.cssText = `
        height: 1px;
        background: #e0e0e0;
        margin: 4px 0;
      `
      menu.appendChild(divider)
      return
    }

    const menuItem = document.createElement('div')
    menuItem.innerHTML = `${item.icon} ${item.text}`
    menuItem.style.cssText = `
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
      ${item.danger ? 'color: #d32f2f;' : ''}
    `

    menuItem.onmouseover = (): void => {
      menuItem.style.backgroundColor = item.danger ? '#ffebee' : '#f5f5f5'
    }
    menuItem.onmouseout = (): void => {
      menuItem.style.backgroundColor = 'white'
    }

    menuItem.onclick = (): void => {
      item.action?.()
      document.body.removeChild(menu)
    }

    menu.appendChild(menuItem)
  })

  return menu
}

function showMenu(menu: HTMLElement, e: MouseEvent): void {
  menu.style.left = e.clientX + 'px'
  menu.style.top = e.clientY + 'px'

  document.body.appendChild(menu)

  const closeMenu = (event: MouseEvent): void => {
    if (!menu.contains(event.target as Node)) {
      if (menu.parentNode) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', closeMenu)
    }
  }

  setTimeout(() => {
    document.addEventListener('click', closeMenu)
  }, 100)
}

// 輔助函數
function getStatusText(status?: string): string {
  const statusMap = {
    'todo': '待辦',
    'inProgress': '進行中',
    'done': '已完成'
  }
  return statusMap[status as keyof typeof statusMap] || status || '未知'
}

// 比較兩個陣列是否相等
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, i) => val === b[i])
}

// 監聽器
watch(() => props.tasks, (newTasks, oldTasks) => {
  if (!ganttInstance.value) return

  // 首次載入或任務數量大幅變化，使用完整重載
  if (!oldTasks || oldTasks.length === 0 ||
      Math.abs(newTasks.length - oldTasks.length) > 5) {
    void loadGanttData()
    return
  }

  // 找出變化的任務並精準更新
  const changedTasks = findChangedTasks(newTasks, oldTasks)

  if (changedTasks.length === 0) {
    return
  }

  if (changedTasks.length > 10) {
    // 如果變化太多，還是用完整重載比較好
    void loadGanttData()
  } else {
    // 精準更新變化的任務

    // 先載入最新的用戶和專案資訊
    void loadUsersInfo()
    if (props.projectId === 'all') {
      void loadProjectsInfo()
    }

    // 批量精準更新
    changedTasks.forEach(task => {
      updateSingleTask(task.taskId, task)
    })
  }
}, { deep: true })

watch(() => ganttSettings.value?.timelineScale, updateTimeline)

watch(() => ganttSettings.value?.showProgress, (showProgress) => {
  if (ganttInstance.value && showProgress !== undefined) {
    gantt.config.drag_progress = showProgress
    gantt.render()
  }
})

watch(() => ganttSettings.value?.showDependencies, (showDeps) => {
  if (ganttInstance.value && showDeps !== undefined) {
    gantt.config.drag_links = showDeps
    gantt.render()
  }
})

watch(timelineDragEnabled, (enabled) => {
  if (ganttInstance.value) {
    gantt.config.drag_timeline = enabled ? {
      useKey: false,
      ignore: '.gantt_task_line, .gantt_task_link'
    } : null
    gantt.render()
  }
})

// 監聽工具列操作 props
watch(() => props.expandAll, (value) => {
  if (value) expandAll()
})

watch(() => props.collapseAll, (value) => {
  if (value) collapseAll()
})

watch(() => props.zoomIn, (value) => {
  if (value) zoomIn()
})

watch(() => props.zoomOut, (value) => {
  if (value) zoomOut()
})

watch(() => props.fitToScreen, (value) => {
  if (value) fitToScreen()
})

// 監聽設定變更並發出事件
watch([
  () => ganttSettings.value?.timelineScale,
  () => ganttSettings.value?.showWeekends,
  () => ganttSettings.value?.showDependencies,
  () => ganttSettings.value?.showProgress,
  timelineDragEnabled
], () => {
  if (ganttSettings.value) {
    emit('gantt-settings-changed', {
      timelineScale: ganttSettings.value.timelineScale,
      showWeekends: ganttSettings.value.showWeekends,
      showDependencies: ganttSettings.value.showDependencies,
      showProgress: ganttSettings.value.showProgress,
      timelineDragEnabled: timelineDragEnabled.value
    })
  }
}, { deep: true })

// 暴露給父組件的方法和資料
defineExpose({
  expandAll,
  collapseAll,
  zoomIn,
  zoomOut,
  fitToScreen,
  addNewTask,
  ganttSettings,
  timelineDragEnabled,
  timelineScaleOptions,
  timelineZoomLevel,
  openColumnManager,
  updateSingleTask
})

// 初始化欄位定義
function initializeFieldDefinitions(): void {
  // 取得所有可用的欄位定義（系統 + 自訂）
  allFieldDefinitions.value = getFieldsForView('gantt', projectCustomFields.value || [])

  // 初始化欄位配置
  if (props.configuration?.visibleColumns) {
    // 使用現有配置
    const mergedConfig = columnConfigService.mergeWithFieldDefinitions(
      props.configuration.visibleColumns,
      allFieldDefinitions.value
    )
    currentColumnConfig.value = Array.isArray(mergedConfig) ? mergedConfig : []
  } else {
    // 使用預設配置
    const defaultConfig = columnConfigService.getDefaultColumns(
      'gantt',
      projectCustomFields.value || []
    )
    currentColumnConfig.value = Array.isArray(defaultConfig) ? defaultConfig : []
  }

  // 確保 currentColumnConfig.value 是陣列
  if (!Array.isArray(currentColumnConfig.value)) {
    currentColumnConfig.value = []
  }
}

// 處理欄位配置更新
async function handleColumnConfigUpdate(columns: ColumnConfig[]): Promise<void> {
  if (!Array.isArray(columns)) {
    return
  }

  currentColumnConfig.value = columns

  // 重新初始化甘特圖以應用新配置
  if (ganttInstance.value) {
    try {
      // 檢查 gantt 對象是否存在
      if (!gantt) {
        return
      }

      // 獲取新的配置
      const newConfig = getGanttConfig(currentColumnConfig.value)

    // 比較當前配置和新配置
    const currentColumnCount = gantt.config.columns ? gantt.config.columns.length : 0
    const newColumnCount = newConfig.columns ? newConfig.columns.length : 0

    // 檢查是否需要完全重新初始化
    // 對於任何欄位變更（包括寬度），都使用完全重新初始化以確保正確顯示
    const currentColumns = gantt.config.columns || []
    const newColumns = newConfig.columns || []

    // 比較欄位數量、名稱、寬度是否有變化
    const columnsChanged = currentColumnCount !== newColumnCount ||
                          !arraysEqual(
                            currentColumns.map((c) => (c as { name?: string }).name || ''),
                            newColumns.map((c) => (c as { name?: string }).name || '')
                          ) ||
                          !arraysEqual(
                            currentColumns.map((c) => (c as { width?: number }).width || 0),
                            newColumns.map((c) => (c as { width?: number }).width || 0)
                          )

    const needFullReinit = columnsChanged

    if (needFullReinit) {
      try {
        // 嘗試直接更新配置而不銷毀實例
        Object.assign(gantt.config, newConfig)
        gantt.resetLayout()
        gantt.render()
      } catch (simpleUpdateError) {
        // 保存當前資料和狀態
        const currentData = gantt.serialize()

        // 銷毀當前實例
        try {
          gantt.clearAll()
          gantt.destructor()
        } catch (e) {
          // 忽略銷毀錯誤
        }
        ganttInstance.value = false

        // 等待一個 tick 確保 DOM 清理完成
        await nextTick()

        // 重置 gantt 實例到初始狀態
        try {
          if (typeof gantt.resetSkin === 'function') {
            gantt.resetSkin()
          }
        } catch (e) {
          // 忽略重置錯誤
        }

        // 重新初始化甘特圖配置
        if (ganttContainer.value) {
        // 設定中文語言包
        gantt.locale = getChineseLocale()

        // 應用新配置
        Object.assign(gantt.config, newConfig)

        // 額外配置
        gantt.config.open_tree_initially = true
        gantt.config.preserve_scroll = true
        gantt.config.touch = true
        gantt.config.touch_drag = true
        gantt.config.sort = true

        // 啟用拖拽功能
        gantt.config.drag_progress = ganttSettings.value.showProgress
        gantt.config.drag_resize = true
        gantt.config.drag_move = true
        gantt.config.drag_links = ganttSettings.value.showDependencies

        // 時間軸拖拉配置
        gantt.config.drag_timeline = {
          useKey: false,
          ignore: '.gantt_task_line, .gantt_task_link'
        }

        // 啟用擴展功能 (GPL 版本支援)
        gantt.plugins({
          tooltip: true,
          undo: true,
          marker: true,
          keyboard_navigation: false,
          inline_editors: true,
          drag_timeline: true
        })

        // 重新設定事件處理器
        setupEventHandlers()

        // 初始化甘特圖
        gantt.init(ganttContainer.value)
        ganttInstance.value = true

        // 重新載入資料
        if (currentData && currentData.data && currentData.data.length > 0) {
          gantt.parse(currentData)
        } else {
          // 重新載入原始資料
          await loadGanttData()
        }

        addTodayMarker()

        // 強制重新計算格線寬度以確保總寬度正確更新
        gantt.render()

        // 使用 nextTick 確保 DOM 更新完成後再執行尺寸計算
        void nextTick(() => {
          // 重新計算格線尺寸
          if (typeof gantt.refreshSize === 'function') {
            gantt.refreshSize()
          }

          // 強制重新計算欄位寬度總和
          if (typeof gantt.resetLayout === 'function') {
            gantt.resetLayout()
          }

          // 最後再渲染一次確保正確顯示
          gantt.render()
        })
        }
      }
    }

    } catch (error) {
      // 忽略配置更新錯誤
    }
  }

  // 發出配置更新事件（設置標誌避免循環）
  isInternalUpdate = true
  emit('configuration-update', {
    ...props.configuration,
    viewType: props.configuration?.viewType || 'gantt',
    visibleColumns: columns
  })
  // 重置標誌
  nextTick(() => {
    isInternalUpdate = false
  })
}

// 暴露方法給父元件
function openColumnManager(): void {
  showColumnManager.value = true
}

// 監聽自訂欄位變化
watch(() => projectCustomFields.value, () => {
  initializeFieldDefinitions()
}, { deep: true })

// 監聽配置變化（避免在組件內部更新時觸發）
let isInternalUpdate = false
watch(() => props.configuration?.visibleColumns, () => {
  if (!isInternalUpdate) {
    initializeFieldDefinitions()
  }
}, { deep: true })

// 生命週期
onMounted(() => {
  // 先初始化欄位定義
  initializeFieldDefinitions()

  void nextTick(() => {
    initializeGantt()
  })
})

onBeforeUnmount(() => {
  if (ganttInstance.value) {
    gantt.clearAll()
    ganttInstance.value = false
  }

  // 清理右鍵選單
  const menu = document.querySelector('.gantt-context-menu')
  if (menu && menu.parentNode) {
    menu.parentNode.removeChild(menu)
  }
})
</script>

<style scoped>
.gantt-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 6px;
  overflow: hidden;
}

.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section:last-child {
  flex: 1;
  justify-content: flex-end;
}

.gantt-container {
  width: 100%;
  height: calc(100vh - 250px);
  min-height: 400px;
  background: white;
  font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
}

/* dhtmlx-gantt 樣式調整 */
:deep(.gantt_container),
:deep(.gantt_grid),
:deep(.gantt_grid_head_cell),
:deep(.gantt_grid_data),
:deep(.gantt_task_text),
:deep(.gantt_scale_cell),
:deep(.gantt_tooltip),
:deep(.gantt_task_row) {
  font-size: 14px !important;
  font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif !important;
}

:deep(.gantt_tooltip) {
  border-radius: 4px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}

:deep(.gantt_task) {
  border-radius: 3px !important;
}

:deep(.gantt_task_progress) {
  border-radius: 3px !important;
}

/* 專案根節點樣式 */
:deep(.gantt-project-bar) {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
  border: 2px solid #2196f3 !important;
  border-radius: 6px !important;
  opacity: 0.9 !important;
}

:deep(.gantt-project-bar .gantt_task_progress) {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  border-radius: 4px !important;
}

/* 專案根節點文字樣式 */
:deep(.gantt_task_row) {
  &:has(.gantt-project-bar) {
    background-color: rgba(33, 150, 243, 0.05) !important;
    font-weight: bold !important;
    color: #1976d2 !important;
  }
}

/* 今日標記線樣式 */
:deep(.today-marker) {
  background-color: rgba(255, 82, 82, 0.8) !important;
  border-left: 2px solid #ff5252 !important;
  position: relative;
  z-index: 10 !important;
}

:deep(.today-marker .gantt_marker_content) {
  background: #ff5252 !important;
  color: white !important;
  padding: 2px 8px !important;
  border-radius: 12px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  position: absolute !important;
  top: -20px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

/* 今日標記線的垂直線 */
:deep(.gantt_marker_area .today-marker) {
  width: 2px !important;
  background: linear-gradient(to bottom,
    rgba(255, 82, 82, 0.9) 0%,
    rgba(255, 82, 82, 0.3) 100%) !important;
  border-radius: 1px !important;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .gantt-toolbar {
    padding: 6px 8px;
    gap: 8px;
  }

  .toolbar-section {
    gap: 4px;
  }

  .gantt-container {
    min-height: 300px;
    height: calc(100vh - 200px);
  }

  :deep(.gantt_grid) {
    width: 200px !important;
  }

  /* 在小螢幕上簡化今日標記 */
  :deep(.today-marker .gantt_marker_content) {
    font-size: 10px !important;
    padding: 1px 4px !important;
  }
}
</style>
