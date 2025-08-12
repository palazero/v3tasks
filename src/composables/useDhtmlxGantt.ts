/**
 * dhtmlx-gantt GPL 版本 Composable
 * 提供 dhtmlx-gantt 整合功能，只使用 GPL 授權的功能
 */

import { ref } from 'vue'
import type { Task, ColumnConfig } from '@/types'

// dhtmlx-gantt 資料格式
export interface DhtmlxTask {
  id: string
  text: string
  start_date: string
  duration: number
  progress: number
  parent: string | 0
  status?: string
  assignee?: string | undefined
  priority?: string | undefined
}

export interface DhtmlxLink {
  id: string
  source: string
  target: string
  type: '0' | '1' | '2' | '3' // 0: finish-start, 1: start-start, 2: finish-finish, 3: start-finish
}

export interface DhtmlxData {
  data: DhtmlxTask[]
  links: DhtmlxLink[]
}

export interface GanttSettings {
  timelineScale: 'day' | 'week' | 'month'
  showWeekends: boolean
  showDependencies: boolean
  showProgress: boolean
  allowTimelineDrag: boolean
}

export function useDhtmlxGantt(): {
  settings: ReturnType<typeof ref<GanttSettings>>
  timelineScaleOptions: Array<{ label: string; value: 'day' | 'week' | 'month' }>
  convertTasksToDhtmlx: (tasks: Task[], isAllProjects?: boolean, projectsMap?: Map<string, string>, usersMap?: Map<string, string>) => DhtmlxData
  convertDhtmlxToTask: (dhtmlxTask: DhtmlxTask, originalTask: Task) => Partial<Task>
  formatDateForDhtmlx: (date: Date) => string
  parseDhtmlxDate: (dateString: string) => Date
  getGanttConfig: (columnConfig?: ColumnConfig[]) => Record<string, unknown>
  getTimelineScales: (scale: 'day' | 'week' | 'month') => Array<Record<string, unknown>>
  getChineseLocale: () => Record<string, unknown>
} {
  // 甘特圖設定
  const settings = ref<GanttSettings>({
    timelineScale: 'day',
    showWeekends: true,
    showDependencies: true,
    showProgress: true,
    allowTimelineDrag: true
  })

  // 時間軸縮放選項
  const timelineScaleOptions = [
    { label: '日', value: 'day' as const },
    { label: '週', value: 'week' as const },
    { label: '月', value: 'month' as const }
  ]

  /**
   * 將 Task 資料轉換為 dhtmlx-gantt 格式
   */
  function convertTasksToDhtmlx(tasks: Task[], isAllProjects = false, projectsMap?: Map<string, string>, usersMap?: Map<string, string>): DhtmlxData {
    const dhtmlxTasks: DhtmlxTask[] = []
    const dhtmlxLinks: DhtmlxLink[] = []

    if (isAllProjects) {
      // All Projects 模式：按專案分組
      const projectGroups = new Map<string, Task[]>()
      
      // 將任務按專案分組
      tasks.forEach(task => {
        const projectId = task.projectId
        if (!projectGroups.has(projectId)) {
          projectGroups.set(projectId, [])
        }
        projectGroups.get(projectId)!.push(task)
      })

      // 為每個專案創建根節點和任務
      projectGroups.forEach((projectTasks, projectId) => {
        const projectName = projectsMap?.get(projectId) || `專案 ${projectId}`
        
        // 計算專案統計
        const totalTasks = projectTasks.length
        const completedTasks = projectTasks.filter(t => t.statusId === 'done').length
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        
        // 計算專案時間範圍
        const projectDates = projectTasks
          .map(t => ({ 
            start: t.startDateTime ? new Date(t.startDateTime) : new Date(),
            end: t.endDateTime ? new Date(t.endDateTime) : new Date()
          }))
          .filter(d => d.start && d.end)
          
        const minStartDate = projectDates.length > 0 
          ? new Date(Math.min(...projectDates.map(d => d.start.getTime())))
          : new Date()
        const maxEndDate = projectDates.length > 0 
          ? new Date(Math.max(...projectDates.map(d => d.end.getTime())))
          : new Date(minStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        const projectDuration = Math.max(1, Math.ceil((maxEndDate.getTime() - minStartDate.getTime()) / (24 * 60 * 60 * 1000)))

        // 創建專案根節點
        dhtmlxTasks.push({
          id: `project_${projectId}`,
          text: `📁 ${projectName} (${totalTasks}個任務, ${progressPercent}% 完成)`,
          start_date: formatDateForDhtmlx(minStartDate),
          duration: projectDuration,
          progress: progressPercent / 100,
          parent: 0,
          status: 'project',
          assignee: '',
          priority: ''
        })

        // 轉換專案內的任務
        projectTasks.forEach(task => {
          const taskData = convertSingleTask(task, usersMap)
          // 調整父節點關係：頂層任務的父節點改為專案根節點
          if (!task.parentTaskId) {
            taskData.parent = `project_${projectId}`
          }
          dhtmlxTasks.push(taskData)
          
          // 處理依賴關係
          if (task.dependencyIds && task.dependencyIds.length > 0) {
            task.dependencyIds.forEach((depId, index) => {
              dhtmlxLinks.push({
                id: `${depId}_${task.taskId}_${index}`,
                source: depId,
                target: task.taskId,
                type: '0'
              })
            })
          }
        })
      })
    } else {
      // 單一專案模式：保持原有邏輯
      tasks.forEach(task => {
        dhtmlxTasks.push(convertSingleTask(task, usersMap))
        
        // 轉換依賴關係
        if (task.dependencyIds && task.dependencyIds.length > 0) {
          task.dependencyIds.forEach((depId, index) => {
            dhtmlxLinks.push({
              id: `${depId}_${task.taskId}_${index}`,
              source: depId,
              target: task.taskId,
              type: '0'
            })
          })
        }
      })
    }

    return {
      data: dhtmlxTasks,
      links: dhtmlxLinks
    }
  }

  /**
   * 轉換單個任務
   */
  function convertSingleTask(task: Task, usersMap?: Map<string, string>): DhtmlxTask {
    const startDate = task.startDateTime ? new Date(task.startDateTime) : new Date()
    const endDate = task.endDateTime ? new Date(task.endDateTime) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // 計算工期（天數）
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
    
    // 計算進度
    let progress = 0
    switch (task.statusId) {
      case 'done':
        progress = 1
        break
      case 'inProgress':
        progress = 0.5
        break
      case 'todo':
        progress = 0
        break
      default:
        progress = 0
    }

    // 取得指派人名稱
    const assigneeName = task.assigneeId && usersMap ? usersMap.get(task.assigneeId) : undefined

    return {
      id: task.taskId,
      text: task.title,
      start_date: formatDateForDhtmlx(startDate),
      duration: duration,
      progress: progress,
      parent: task.parentTaskId || 0,
      status: task.statusId,
      assignee: assigneeName || undefined,
      priority: task.priorityId || undefined
    }
  }

  /**
   * 將 dhtmlx-gantt 任務資料轉換回 Task 格式
   */
  function convertDhtmlxToTask(dhtmlxTask: DhtmlxTask, originalTask: Task): Partial<Task> {
    const startDate = parseDhtmlxDate(dhtmlxTask.start_date)
    const endDate = new Date(startDate.getTime() + dhtmlxTask.duration * 24 * 60 * 60 * 1000)

    let statusId = originalTask.statusId
    if (dhtmlxTask.progress >= 1) {
      statusId = 'done'
    } else if (dhtmlxTask.progress > 0) {
      statusId = 'inProgress'
    } else {
      statusId = 'todo'
    }

    const updates: Partial<Task> = {
      title: dhtmlxTask.text,
      startDateTime: startDate,
      endDateTime: endDate,
      statusId: statusId
    }
    
    if (dhtmlxTask.assignee) {
      updates.assigneeId = dhtmlxTask.assignee
    }
    
    if (dhtmlxTask.priority) {
      updates.priorityId = dhtmlxTask.priority
    }
    
    if (dhtmlxTask.parent !== 0) {
      updates.parentTaskId = String(dhtmlxTask.parent)
    }
    
    return updates
  }

  /**
   * 格式化日期為 dhtmlx-gantt 格式
   */
  function formatDateForDhtmlx(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  /**
   * 解析 dhtmlx-gantt 日期格式
   */
  function parseDhtmlxDate(dateString: string): Date {
    // dhtmlx-gantt 格式: "YYYY-MM-DD HH:mm" or "YYYY-MM-DD"
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? new Date() : date
  }

  /**
   * 取得甘特圖配置
   */
  function getGanttConfig(columnConfig?: ColumnConfig[]): Record<string, unknown> {
    // 生成動態欄位配置
    const columns = generateGanttColumns(columnConfig)
    
    return {
      // 日期格式
      date_format: '%Y-%m-%d %H:%i',
      
      // 時間軸配置
      scale_height: 50,
      row_height: 30,
      
      // 基本設定
      autofit: false,
      fit_tasks: false,
      
      // 動態欄位配置
      columns,

      // 時間軸配置
      scales: getTimelineScales(settings.value.timelineScale)
    }
  }

  /**
   * 根據欄位配置生成甘特圖欄位定義
   */
  function generateGanttColumns(columnConfig?: ColumnConfig[]): Array<Record<string, unknown>> {
    // 預設欄位配置（如果沒有提供配置）
    if (!columnConfig) {
      return [
        {
          name: 'text',
          label: '任務名稱',
          width: 200,
          tree: true,
          editor: { type: 'text', map_to: 'text' }
        },
        {
          name: 'start_date',
          label: '開始日期',
          width: 120,
          align: 'center',
          editor: { type: 'date', map_to: 'start_date' }
        },
        {
          name: 'duration',
          label: '工期',
          width: 60,
          align: 'center',
          editor: { type: 'number', map_to: 'duration' }
        },
        {
          name: 'status',
          label: '狀態',
          width: 80,
          align: 'center',
          template: generateStatusTemplate
        },
        {
          name: 'assignee',
          label: '指派人',
          width: 100,
          align: 'center',
          template: generateAssigneeTemplate
        }
      ]
    }

    // 根據配置生成欄位
    const visibleColumns = columnConfig
      .filter(col => col.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    return visibleColumns.map(col => {
      const column: Record<string, unknown> = {
        name: col.key,
        label: col.label,
        width: col.width || getDefaultColumnWidth(col.key),
        align: getColumnAlignment(col.key)
      }

      // 任務名稱欄位特殊處理（樹狀結構）
      if (col.key === 'title') {
        column.name = 'text'
        column.tree = true
        column.editor = { type: 'text', map_to: 'text' }
      }
      // 日期欄位
      else if (col.key === 'startDate') {
        column.name = 'start_date'
        column.editor = { type: 'date', map_to: 'start_date' }
      }
      else if (col.key === 'duration') {
        column.editor = { type: 'number', map_to: 'duration' }
      }
      // 狀態欄位
      else if (col.key === 'status') {
        column.template = generateStatusTemplate
      }
      // 指派人欄位
      else if (col.key === 'assignee') {
        column.template = generateAssigneeTemplate
      }
      // 優先級欄位
      else if (col.key === 'priority') {
        column.template = generatePriorityTemplate
      }
      // 進度欄位
      else if (col.key === 'progress') {
        column.template = generateProgressTemplate
      }
      // 自訂欄位
      else if (col.key.startsWith('custom_')) {
        column.template = generateCustomFieldTemplate
      }

      return column
    })
  }

  /**
   * 取得預設欄位寬度
   */
  function getDefaultColumnWidth(fieldKey: string): number {
    const widthMap: Record<string, number> = {
      title: 200,
      status: 80,
      assignee: 100,
      priority: 80,
      startDate: 120,
      deadline: 120,
      duration: 60,
      progress: 80,
      tags: 120,
      creator: 100,
      createdAt: 120,
      updatedAt: 120,
      description: 150
    }
    return widthMap[fieldKey] || 100
  }

  /**
   * 取得欄位對齊方式
   */
  function getColumnAlignment(fieldKey: string): string {
    const centerFields = ['status', 'priority', 'duration', 'progress', 'createdAt', 'updatedAt']
    return centerFields.includes(fieldKey) ? 'center' : 'left'
  }

  /**
   * 生成狀態模板函數
   */
  function generateStatusTemplate(task: DhtmlxTask): string {
    const statusMap = {
      'todo': '待辦',
      'inProgress': '進行中',
      'done': '已完成'
    }
    return statusMap[task.status as keyof typeof statusMap] || task.status || ''
  }

  /**
   * 生成指派人模板函數
   */
  function generateAssigneeTemplate(task: DhtmlxTask): string {
    if (!task.assignee) {
      return '<span style="color: #999;">未指派</span>'
    }
    // 取得用戶名稱的第一個字符作為頭像
    const initial = task.assignee.charAt(0).toUpperCase()
    return `<div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #1976d2; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
                ${initial}
              </div>
              <span style="font-size: 12px;">${task.assignee}</span>
            </div>`
  }

  /**
   * 生成優先級模板函數
   */
  function generatePriorityTemplate(task: DhtmlxTask): string {
    const priorityMap = {
      'urgent': '🔴 急',
      'high': '🟠 高',
      'medium': '🟡 中',
      'low': '🟢 低'
    }
    return priorityMap[task.priority as keyof typeof priorityMap] || task.priority || ''
  }

  /**
   * 生成進度模板函數
   */
  function generateProgressTemplate(task: DhtmlxTask): string {
    const progress = Math.round((task.progress || 0) * 100)
    const color = progress >= 100 ? '#4caf50' : progress >= 50 ? '#ff9800' : '#2196f3'
    return `<div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 40px; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${progress}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
              </div>
              <span style="font-size: 11px; color: ${color}; font-weight: 500;">${progress}%</span>
            </div>`
  }

  /**
   * 生成自訂欄位模板函數
   */
  function generateCustomFieldTemplate(task: DhtmlxTask): string {
    // 自訂欄位暫時顯示為簡單文字，後續可根據欄位類型擴展
    return task.text || ''
  }

  /**
   * 取得時間軸配置
   */
  function getTimelineScales(scale: 'day' | 'week' | 'month'): Array<Record<string, unknown>> {
    switch (scale) {
      case 'day':
        return [
          { unit: 'month', step: 1, format: '%Y年%m月' },
          { unit: 'day', step: 1, format: '%m/%d' }
        ]
      case 'week':
        return [
          { unit: 'month', step: 1, format: '%Y年%m月' },
          { unit: 'week', step: 1, format: '第%W週' }
        ]
      case 'month':
        return [
          { unit: 'year', step: 1, format: '%Y年' },
          { unit: 'month', step: 1, format: '%m月' }
        ]
      default:
        return [
          { unit: 'month', step: 1, format: '%Y年%m月' },
          { unit: 'day', step: 1, format: '%m/%d' }
        ]
    }
  }

  /**
   * 取得中文語言包
   */
  function getChineseLocale(): Record<string, unknown> {
    return {
      date: {
        month_full: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        month_short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        day_full: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        day_short: ['日', '一', '二', '三', '四', '五', '六']
      },
      labels: {
        new_task: '新任務',
        icon_save: '儲存',
        icon_cancel: '取消',
        icon_details: '詳情',
        icon_edit: '編輯',
        icon_delete: '刪除',
        confirm_closing: '確定要關閉嗎？您的修改將會遺失！',
        confirm_deleting: '確定要刪除任務嗎？',
        section_description: '描述',
        section_time: '時間期間',
        section_type: '類型',
        column_text: '任務名稱',
        column_start_date: '開始時間',
        column_duration: '持續時間',
        column_add: '',
        link: '連結',
        confirm_link_deleting: '將會被刪除',
        link_start: ' (開始)',
        link_end: ' (結束)',
        type_task: '任務',
        type_project: '專案',
        type_milestone: '里程碑',
        minutes: '分鐘',
        hours: '小時',
        days: '天',
        weeks: '星期',
        months: '月',
        years: '年'
      }
    }
  }

  return {
    settings,
    timelineScaleOptions,
    convertTasksToDhtmlx,
    convertDhtmlxToTask,
    formatDateForDhtmlx,
    parseDhtmlxDate,
    getGanttConfig,
    getTimelineScales,
    getChineseLocale
  }
}