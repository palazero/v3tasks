<template>
  <div class="gantt-wrapper">
    <!-- 甘特圖容器 -->
    <div ref="ganttContainer" class="gantt-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import type { Task } from '@/types'
import { useDhtmlxGantt } from '@/composables/useDhtmlxGantt'
import { useQuasar } from 'quasar'
import { getProjectRepository, getUserRepository } from '@/services/repositories'
import type { Project, User } from '@/types'

// Props
interface Props {
  tasks: Task[]
  projectId?: string
  
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

// 初始化甘特圖
function initializeGantt(): void {
  if (!ganttContainer.value) {
    return
  }

  // 設定中文語言包
  gantt.locale = getChineseLocale()

  // 基礎配置
  const config = getGanttConfig()
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
    // 專案根節點使用特殊的 tooltip
    if (task.status === 'project') {
      return `<b>專案:</b> ${task.text.replace('📁 ', '').split(' (')[0]}<br/>
              <b>時間:</b> ${gantt.date.date_to_str('%Y-%m-%d')(start)} - ${gantt.date.date_to_str('%Y-%m-%d')(end)}`
    }
    
    const originalTask = taskMap.value.get(task.id)
    return `<b>任務:</b> ${task.text}<br/>
            <b>狀態:</b> ${getStatusText(task.status)}<br/>
            <b>指派人:</b> ${originalTask?.assigneeId || '未指派'}<br/>
            <b>時間:</b> ${gantt.date.date_to_str('%Y-%m-%d')(start)} - ${gantt.date.date_to_str('%Y-%m-%d')(end)}`
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
  
  gantt.config.scales = getTimelineScales(ganttSettings.value.timelineScale)
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

function zoomIn(): void {
  if (!ganttInstance.value) return
  
  const scales = ['month', 'week', 'day']
  const currentIndex = scales.indexOf(ganttSettings.value.timelineScale)
  if (currentIndex < scales.length - 1) {
    ganttSettings.value.timelineScale = scales[currentIndex + 1] as 'day' | 'week' | 'month'
  }
}

function zoomOut(): void {
  if (!ganttInstance.value) return
  
  const scales = ['month', 'week', 'day']
  const currentIndex = scales.indexOf(ganttSettings.value.timelineScale)
  if (currentIndex > 0) {
    ganttSettings.value.timelineScale = scales[currentIndex - 1] as 'day' | 'week' | 'month'
  }
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

// 監聽器
watch(() => props.tasks, () => {
  if (ganttInstance.value) {
    void loadGanttData()
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
  timelineScaleOptions
})

// 生命週期
onMounted(() => {
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