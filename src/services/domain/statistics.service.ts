/**
 * 統計服務 - 提供各種統計資料計算
 */

import { getTaskRepository, getProjectRepository, getUserRepository } from '../repositories'
import type { Task, TaskStatus, TaskPriority, User, Project, CustomFieldDefinition } from '@/types'
import type {
  ReportConfig,
  ReportData,
  ReportDataSet,
  ReportDataPoint,
  ReportDimension,
  ReportAggregation,
  ReportFilter,
  FilterOperator
} from '@/types/report'

export interface TaskStatistics {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  overdue: number
  dueToday: number
  dueThisWeek: number
  completed: number
  completionRate: number
}

export interface ProjectStatistics {
  total: number
  active: number
  archived: number
  tasksPerProject: { projectId: string; projectName: string; taskCount: number }[]
  completionRates: { projectId: string; projectName: string; rate: number }[]
}

export interface UserStatistics {
  assignedTasks: number
  completedTasks: number
  overdueTasks: number
  completionRate: number
  workload: { date: string; taskCount: number }[]
}

export interface TimelineData {
  date: string
  created: number
  completed: number
  active: number
}

export class StatisticsService {
  private taskRepo = getTaskRepository()
  private projectRepo = getProjectRepository()
  private userRepo = getUserRepository()

  /**
   * 獲取任務統計資料
   */
  async getTaskStatistics(projectId?: string): Promise<TaskStatistics> {
    let tasks: Task[]
    
    if (projectId && projectId !== 'all') {
      tasks = await this.taskRepo.findByProject(projectId)
    } else {
      tasks = await this.taskRepo.findAll()
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 狀態統計
    const byStatus: Record<TaskStatus, number> = {
      todo: 0,
      inProgress: 0,
      done: 0,
      cancelled: 0
    }

    // 優先級統計
    const byPriority: Record<TaskPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }

    let overdue = 0
    let dueToday = 0
    let dueThisWeek = 0
    let completed = 0

    tasks.forEach(task => {
      // 狀態統計
      if (task.statusId in byStatus) {
        byStatus[task.statusId as TaskStatus]++
      }

      // 優先級統計
      if (task.priorityId in byPriority) {
        byPriority[task.priorityId as TaskPriority]++
      }

      // 完成任務計數
      if (task.statusId === 'done') {
        completed++
      }

      // 截止日期統計
      if (task.endDateTime) {
        const dueDate = new Date(task.endDateTime)
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

        if (dueDateOnly < today && task.statusId !== 'done') {
          overdue++
        } else if (dueDateOnly.getTime() === today.getTime()) {
          dueToday++
        } else if (dueDateOnly >= today && dueDateOnly < nextWeek) {
          dueThisWeek++
        }
      }
    })

    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      dueToday,
      dueThisWeek,
      completed,
      completionRate
    }
  }

  /**
   * 獲取專案統計資料
   */
  async getProjectStatistics(): Promise<ProjectStatistics> {
    const projects = await this.projectRepo.findAll()
    const allTasks = await this.taskRepo.findAll()

    const active = projects.filter(p => !p.isArchived).length
    const archived = projects.filter(p => p.isArchived).length

    // 每個專案的任務數量
    const tasksPerProject = projects.map(project => {
      const tasks = allTasks.filter(task => task.projectId === project.projectId)
      return {
        projectId: project.projectId,
        projectName: project.name,
        taskCount: tasks.length
      }
    }).sort((a, b) => b.taskCount - a.taskCount)

    // 每個專案的完成率
    const completionRates = projects.map(project => {
      const tasks = allTasks.filter(task => task.projectId === project.projectId)
      const completedTasks = tasks.filter(task => task.statusId === 'done').length
      const rate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0

      return {
        projectId: project.projectId,
        projectName: project.name,
        rate
      }
    }).sort((a, b) => b.rate - a.rate)

    return {
      total: projects.length,
      active,
      archived,
      tasksPerProject,
      completionRates
    }
  }

  /**
   * 獲取用戶統計資料
   */
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    const allTasks = await this.taskRepo.findAll()
    const userTasks = allTasks.filter(task => task.assigneeId === userId)

    const assignedTasks = userTasks.length
    const completedTasks = userTasks.filter(task => task.statusId === 'done').length
    
    // 逾期任務
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const overdueTasks = userTasks.filter(task => {
      if (!task.endDateTime || task.statusId === 'done') return false
      const dueDate = new Date(task.endDateTime)
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
      return dueDateOnly < today
    }).length

    const completionRate = assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0

    // 過去30天的工作量
    const workload: { date: string; taskCount: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]!
      
      const tasksOnDate = userTasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]!
        return createdDate === dateStr
      }).length

      workload.push({
        date: dateStr,
        taskCount: tasksOnDate
      })
    }

    return {
      assignedTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      workload
    }
  }

  /**
   * 獲取時間軸資料 (過去30天)
   */
  async getTimelineData(projectId?: string): Promise<TimelineData[]> {
    let tasks: Task[]
    
    if (projectId && projectId !== 'all') {
      tasks = await this.taskRepo.findByProject(projectId)
    } else {
      tasks = await this.taskRepo.findAll()
    }

    const timeline: TimelineData[] = []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]!

      // 當天創建的任務
      const created = tasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]!
        return createdDate === dateStr
      }).length

      // 當天完成的任務
      const completed = tasks.filter(task => {
        if (task.statusId !== 'done') return false
        const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]!
        return completedDate === dateStr
      }).length

      // 當天活躍的任務 (創建但未完成)
      const active = tasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]!
        const isCreatedByDate = createdDate <= dateStr
        
        if (!isCreatedByDate) return false
        if (task.statusId === 'done') {
          const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]!
          return completedDate > dateStr
        }
        return task.statusId !== 'done'
      }).length

      timeline.push({
        date: dateStr,
        created,
        completed,
        active
      })
    }

    return timeline
  }

  /**
   * 獲取專案進度報告
   */
  async getProjectProgressReport(projectId: string): Promise<unknown> {
    const project = await this.projectRepo.findById(projectId)
    if (!project) return null

    const tasks = await this.taskRepo.findByProject(projectId)
    const taskStats = await this.getTaskStatistics(projectId)

    // 里程碑統計 (根據任務層級)
    const milestones = tasks.filter(task => task.level === 0) // 頂級任務作為里程碑
    const completedMilestones = milestones.filter(task => task.statusId === 'done').length

    // 近期活動
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentActivity = tasks.filter(task => {
      return new Date(task.updatedAt) >= oneWeekAgo
    }).length

    // 風險評估 (逾期任務比例)
    const riskLevel = taskStats.overdue / tasks.length > 0.2 ? 'high' : 
                     taskStats.overdue / tasks.length > 0.1 ? 'medium' : 'low'

    return {
      project,
      taskStats,
      milestones: {
        total: milestones.length,
        completed: completedMilestones,
        rate: milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0
      },
      recentActivity,
      riskLevel,
      estimatedCompletion: this.calculateEstimatedCompletion(tasks)
    }
  }

  /**
   * 計算預估完成時間 (簡化算法)
   */
  private calculateEstimatedCompletion(tasks: Task[]): string | null {
    const incompleteTasks = tasks.filter(task => task.statusId !== 'done')
    if (incompleteTasks.length === 0) return null

    // 簡化：假設每個任務需要1天，根據過去完成速度調整
    const completedTasks = tasks.filter(task => task.statusId === 'done')
    if (completedTasks.length === 0) return null

    // 計算平均完成速度 (任務數/天)
    const now = new Date()
    const projectStart = new Date(Math.min(...tasks.map(t => new Date(t.createdAt).getTime())))
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)))
    const completionRate = completedTasks.length / daysElapsed

    if (completionRate <= 0) return null

    const estimatedDays = Math.ceil(incompleteTasks.length / completionRate)
    const estimatedDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000)
    
    return estimatedDate.toISOString().split('T')[0]!
  }

  /**
   * 生成自訂報表資料
   */
  async generateReportData(config: ReportConfig): Promise<ReportData> {
    // 獲取基礎資料
    let tasks = await this.getFilteredTasks(config)
    
    // 應用篩選條件
    if (config.filters && config.filters.length > 0) {
      tasks = this.applyFilters(tasks, config.filters)
    }
    
    // 根據維度分組資料
    const groupedData = await this.groupByDimension(tasks, config.dimension, config.customFieldId)
    
    // 計算聚合值
    const aggregatedData = this.calculateAggregation(groupedData, config.aggregation, config.customFieldId)
    
    // 轉換為圖表資料格式
    const datasets = this.transformToDatasets(aggregatedData, config)
    const labels = aggregatedData.map(item => item.label)
    
    return {
      config,
      datasets,
      labels,
      totalCount: tasks.length,
      generatedAt: new Date(),
      summary: this.calculateSummary(aggregatedData, config.aggregation)
    }
  }
  
  /**
   * 獲取篩選後的任務資料
   */
  private async getFilteredTasks(config: ReportConfig): Promise<Task[]> {
    if (config.projectId && config.projectId !== 'all') {
      return await this.taskRepo.findByProject(config.projectId)
    }
    return await this.taskRepo.findAll()
  }
  
  /**
   * 應用篩選條件
   */
  private applyFilters(tasks: Task[], filters: ReportFilter[]): Task[] {
    return tasks.filter(task => {
      return filters.every(filter => this.evaluateFilter(task, filter))
    })
  }
  
  /**
   * 評估單個篩選條件
   */
  private evaluateFilter(task: Task, filter: ReportFilter): boolean {
    const fieldValue = this.getFieldValue(task, filter.field)
    
    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value
      case 'notEquals':
        return fieldValue !== filter.value
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
      case 'greaterThan':
        return Number(fieldValue) > Number(filter.value)
      case 'lessThan':
        return Number(fieldValue) < Number(filter.value)
      case 'between':
        if (filter.values && filter.values.length === 2) {
          const val = Number(fieldValue)
          return val >= Number(filter.values[0]) && val <= Number(filter.values[1])
        }
        return false
      case 'in':
        return filter.values ? filter.values.includes(fieldValue) : false
      case 'notIn':
        return filter.values ? !filter.values.includes(fieldValue) : true
      default:
        return true
    }
  }
  
  /**
   * 獲取任務欄位值
   */
  private getFieldValue(task: Task, field: string): unknown {
    // 標準欄位
    const standardFields: Record<string, (task: Task) => unknown> = {
      'title': (task) => task.title,
      'statusId': (task) => task.statusId,
      'priorityId': (task) => task.priorityId,
      'assigneeId': (task) => task.assigneeId,
      'projectId': (task) => task.projectId,
      'createdAt': (task) => task.createdAt,
      'endDateTime': (task) => task.endDateTime,
      'startDateTime': (task) => task.startDateTime,
      'level': (task) => task.level,
      'createdMonth': (task) => new Date(task.createdAt).toISOString().slice(0, 7),
      'dueMonth': (task) => task.endDateTime ? new Date(task.endDateTime).toISOString().slice(0, 7) : null
    }
    
    if (field in standardFields) {
      return standardFields[field]!(task)
    }
    
    // 自訂欄位
    const customField = task.customFields.find(cf => cf.fieldId === field)
    return customField?.value || null
  }
  
  /**
   * 根據維度分組資料
   */
  private async groupByDimension(
    tasks: Task[], 
    dimension: ReportDimension, 
    customFieldId?: string
  ): Promise<{ key: string; label: string; tasks: Task[] }[]> {
    const groups = new Map<string, Task[]>()
    
    // 預先載入必要的參考資料
    const users = dimension === 'assigneeId' ? await this.userRepo.findAll() : []
    const projects = dimension === 'projectId' ? await this.projectRepo.findAll() : []
    
    // 分組邏輯
    tasks.forEach(task => {
      let key: string
      let groupKey: string
      
      if (dimension === 'customField' && customFieldId) {
        const customField = task.customFields.find(cf => cf.fieldId === customFieldId)
        key = String(customField?.value || 'null')
        groupKey = key
      } else {
        key = String(this.getFieldValue(task, dimension))
        groupKey = key
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(task)
    })
    
    // 轉換為標籤格式
    return Array.from(groups.entries()).map(([key, tasks]) => ({
      key,
      label: this.getDimensionLabel(dimension, key, { users, projects, customFieldId }),
      tasks
    }))
  }
  
  /**
   * 獲取維度標籤
   */
  private getDimensionLabel(
    dimension: ReportDimension, 
    key: string, 
    context: { 
      users: User[]
      projects: Project[]
      customFieldId?: string 
    }
  ): string {
    if (key === 'null' || key === 'undefined' || !key) {
      return '未設定'
    }
    
    switch (dimension) {
      case 'assigneeId':
        const user = context.users.find(u => u.userId === key)
        return user ? user.name : '未知用戶'
      
      case 'projectId':
        const project = context.projects.find(p => p.projectId === key)
        return project ? project.name : '未知專案'
      
      case 'statusId':
        const statusLabels: Record<string, string> = {
          'todo': '待辦',
          'inProgress': '進行中',
          'done': '已完成',
          'cancelled': '已取消'
        }
        return statusLabels[key] || key
      
      case 'priorityId':
        const priorityLabels: Record<string, string> = {
          'low': '低',
          'medium': '中',
          'high': '高',
          'urgent': '緊急'
        }
        return priorityLabels[key] || key
      
      case 'createdMonth':
      case 'dueMonth':
        // 格式化月份顯示
        const date = new Date(key + '-01')
        return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
      
      default:
        return key
    }
  }
  
  /**
   * 計算聚合值
   */
  private calculateAggregation(
    groupedData: { key: string; label: string; tasks: Task[] }[],
    aggregation: ReportAggregation,
    customFieldId?: string
  ): ReportDataPoint[] {
    return groupedData.map(group => {
      let value: number
      
      switch (aggregation) {
        case 'count':
          value = group.tasks.length
          break
          
        case 'sum':
          value = this.calculateSum(group.tasks, customFieldId)
          break
          
        case 'average':
          value = this.calculateAverage(group.tasks, customFieldId)
          break
          
        case 'percentage':
          // 百分比需要在外層計算
          value = group.tasks.length
          break
          
        case 'min':
          value = this.calculateMin(group.tasks, customFieldId)
          break
          
        case 'max':
          value = this.calculateMax(group.tasks, customFieldId)
          break
          
        default:
          value = group.tasks.length
      }
      
      return {
        label: group.label,
        value,
        metadata: {
          key: group.key,
          taskCount: group.tasks.length,
          taskIds: group.tasks.map(t => t.taskId)
        }
      }
    })
  }
  
  /**
   * 計算加總
   */
  private calculateSum(tasks: Task[], customFieldId?: string): number {
    if (!customFieldId) return tasks.length
    
    return tasks.reduce((sum, task) => {
      const customField = task.customFields.find(cf => cf.fieldId === customFieldId)
      const value = Number(customField?.value || 0)
      return sum + (isNaN(value) ? 0 : value)
    }, 0)
  }
  
  /**
   * 計算平均值
   */
  private calculateAverage(tasks: Task[], customFieldId?: string): number {
    const sum = this.calculateSum(tasks, customFieldId)
    return tasks.length > 0 ? sum / tasks.length : 0
  }
  
  /**
   * 計算最小值
   */
  private calculateMin(tasks: Task[], customFieldId?: string): number {
    if (!customFieldId || tasks.length === 0) return 0
    
    const values = tasks
      .map(task => {
        const customField = task.customFields.find(cf => cf.fieldId === customFieldId)
        return Number(customField?.value || 0)
      })
      .filter(value => !isNaN(value))
    
    return values.length > 0 ? Math.min(...values) : 0
  }
  
  /**
   * 計算最大值
   */
  private calculateMax(tasks: Task[], customFieldId?: string): number {
    if (!customFieldId || tasks.length === 0) return 0
    
    const values = tasks
      .map(task => {
        const customField = task.customFields.find(cf => cf.fieldId === customFieldId)
        return Number(customField?.value || 0)
      })
      .filter(value => !isNaN(value))
    
    return values.length > 0 ? Math.max(...values) : 0
  }
  
  /**
   * 轉換為圖表資料集格式
   */
  private transformToDatasets(data: ReportDataPoint[], config: ReportConfig): ReportDataSet[] {
    // 如果是百分比聚合，重新計算百分比
    if (config.aggregation === 'percentage') {
      const total = data.reduce((sum, point) => sum + point.value, 0)
      data = data.map(point => ({
        ...point,
        value: total > 0 ? (point.value / total) * 100 : 0
      }))
    }
    
    // 排序資料（按值排序）
    data.sort((a, b) => b.value - a.value)
    
    return [{
      label: this.getAggregationLabel(config.aggregation),
      data,
      backgroundColor: this.generateColors(data.length),
      borderColor: this.generateBorderColors(data.length),
      borderWidth: 1
    }]
  }
  
  /**
   * 獲取聚合方式標籤
   */
  private getAggregationLabel(aggregation: ReportAggregation): string {
    const labels: Record<ReportAggregation, string> = {
      'count': '任務數量',
      'sum': '總計',
      'average': '平均值',
      'percentage': '百分比',
      'min': '最小值',
      'max': '最大值'
    }
    return labels[aggregation]
  }
  
  /**
   * 生成顏色
   */
  private generateColors(count: number): string[] {
    const baseColors = [
      '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', 
      '#0097a7', '#689f38', '#f9a825', '#c2185b', '#303f9f'
    ]
    
    const colors: string[] = []
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]!)
    }
    return colors
  }
  
  /**
   * 生成邊框顏色
   */
  private generateBorderColors(count: number): string[] {
    return this.generateColors(count).map(color => {
      // 將背景色調暗作為邊框色
      return color.replace(/[\d.]+\)$/g, '0.8)')
    })
  }
  
  /**
   * 計算摘要資訊
   */
  private calculateSummary(data: ReportDataPoint[], aggregation: ReportAggregation): {
    total: number
    average?: number
    min?: number
    max?: number
  } {
    const values = data.map(point => point.value)
    const total = values.reduce((sum, value) => sum + value, 0)
    
    const summary: { total: number; average?: number; min?: number; max?: number } = {
      total
    }
    
    if (values.length > 0) {
      summary.average = total / values.length
      summary.min = Math.min(...values)
      summary.max = Math.max(...values)
    }
    
    return summary
  }
  
  /**
   * 驗證報表配置
   */
  validateReportConfig(config: Partial<ReportConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!config.name) {
      errors.push('報表名稱不能為空')
    }
    
    if (!config.chartType) {
      errors.push('必須選擇圖表類型')
    }
    
    if (!config.dimension) {
      errors.push('必須選擇統計維度')
    }
    
    if (!config.aggregation) {
      errors.push('必須選擇聚合方式')
    }
    
    if (config.dimension === 'customField' && !config.customFieldId) {
      errors.push('選擇自訂欄位維度時必須指定欄位ID')
    }
    
    if (['sum', 'average', 'min', 'max'].includes(config.aggregation as string) && !config.customFieldId) {
      errors.push('數值聚合方式需要指定自訂欄位')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 獲取可用的自訂欄位（用於報表建構）
   */
  async getAvailableCustomFields(projectId?: string): Promise<CustomFieldDefinition[]> {
    // 這裡需要實作獲取自訂欄位定義的邏輯
    // 暫時返回空陣列，後續整合自訂欄位服務
    return []
  }
}

// 導出單例實例
export const statisticsService = new StatisticsService()