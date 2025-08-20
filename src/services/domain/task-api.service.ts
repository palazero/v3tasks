/**
 * 任務 API 服務實作
 * 擴展原有 TaskService，支援 API 呼叫與智慧資料源切換
 */

import type { ITaskService } from './interfaces/ITaskService'
import type { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '@/types'
import type { IHttpService } from '../infrastructure/http/http.service'
import { TaskApiRepository } from '../repositories/task-api.repository'
import { getProjectRepository } from '../repositories'
import { configManager } from '../infrastructure/config/app.config'
import { nanoid } from 'nanoid'

export class TaskApiService implements ITaskService {
  private repository: TaskApiRepository
  private httpService: IHttpService

  constructor(httpService: IHttpService) {
    this.httpService = httpService
    this.repository = new TaskApiRepository(httpService)
    
    // 監聽配置變更並調整資料源策略
    configManager.onConfigChange((config) => {
      this.updateDataSourceStrategy(config.dataSource.strategy)
    })
  }

  /**
   * 建立新任務
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    // 驗證專案存在
    if (request.projectId) {
      const projectRepo = getProjectRepository()
      const project = await projectRepo.findById(request.projectId)
      if (!project) {
        throw new Error(`專案不存在: ${request.projectId}`)
      }
    }

    // 準備任務資料
    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      ...request,
      status: request.status || 'todo',
      priority: request.priority || 'medium',
      progress: request.progress || 0,
      customFields: request.customFields || {},
      tags: request.tags || []
    }

    return await this.repository.create(taskData)
  }

  /**
   * 更新任務
   */
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`任務不存在: ${id}`)
    }

    // 如果更新專案，驗證目標專案存在
    if (updates.projectId && updates.projectId !== existingTask.projectId) {
      const projectRepo = getProjectRepository()
      const targetProject = await projectRepo.findById(updates.projectId)
      if (!targetProject) {
        throw new Error(`目標專案不存在: ${updates.projectId}`)
      }
    }

    return await this.repository.update(id, updates)
  }

  /**
   * 刪除任務
   */
  async deleteTask(id: string): Promise<void> {
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`任務不存在: ${id}`)
    }

    await this.repository.delete(id)
  }

  /**
   * 根據 ID 取得任務
   */
  async getTaskById(id: string): Promise<Task | null> {
    return await this.repository.findById(id)
  }

  /**
   * 取得專案的所有任務
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await this.repository.findByProjectId(projectId)
  }

  /**
   * 取得用戶的所有任務
   */
  async getTasksByUser(userId: string): Promise<Task[]> {
    return await this.repository.findByAssigneeId(userId)
  }

  /**
   * 更新任務狀態
   */
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const updates: UpdateTaskRequest = { status }
    
    // 如果狀態改為完成，更新進度為 100%
    if (status === 'done') {
      updates.progress = 100
      updates.completedAt = new Date().toISOString()
    }

    return await this.updateTask(id, updates)
  }

  /**
   * 更新任務優先級
   */
  async updateTaskPriority(id: string, priority: TaskPriority): Promise<Task> {
    return await this.updateTask(id, { priority })
  }

  /**
   * 批量更新任務
   */
  async batchUpdateTasks(updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]> {
    const results: Task[] = []

    // 如果 API 可用，嘗試批量更新
    if (configManager.isApiEnabled()) {
      try {
        // 將批量更新分組以提升效能
        const statusUpdates = updates.filter(update => update.updates.status)
        if (statusUpdates.length > 0) {
          const taskIds = statusUpdates.map(update => update.id)
          const status = statusUpdates[0].updates.status as string
          
          // 檢查是否都是相同狀態更新
          if (statusUpdates.every(update => update.updates.status === status)) {
            const batchResults = await this.repository.batchUpdateStatus(taskIds, status)
            results.push(...batchResults)
            
            // 移除已處理的更新
            const processedIds = new Set(taskIds)
            updates = updates.filter(update => !processedIds.has(update.id))
          }
        }
      } catch (error) {
        console.warn('[TaskService] 批量更新失敗，回退到逐一更新:', error)
      }
    }

    // 處理剩餘的更新
    for (const { id, updates: taskUpdates } of updates) {
      try {
        const updatedTask = await this.repository.update(id, taskUpdates)
        results.push(updatedTask)
      } catch (error) {
        console.warn(`批量更新任務失敗 ${id}:`, error)
      }
    }

    return results
  }

  /**
   * 複製任務
   */
  async duplicateTask(id: string, overrides?: Partial<Task>): Promise<Task> {
    return await this.repository.duplicateTask(id, overrides)
  }

  /**
   * 移動任務到不同專案
   */
  async moveTaskToProject(taskId: string, targetProjectId: string): Promise<Task> {
    // 驗證目標專案存在
    const projectRepo = getProjectRepository()
    const targetProject = await projectRepo.findById(targetProjectId)
    if (!targetProject) {
      throw new Error(`目標專案不存在: ${targetProjectId}`)
    }

    return await this.repository.moveToProject(taskId, targetProjectId)
  }

  // ============= 擴展功能 =============

  /**
   * 搜尋任務
   */
  async searchTasks(
    query: string, 
    filters?: {
      projectId?: string
      assigneeId?: string
      status?: TaskStatus
      priority?: TaskPriority
      tags?: string[]
      dateRange?: { start: string; end: string }
    }
  ): Promise<Task[]> {
    return await this.repository.searchTasks(query, filters)
  }

  /**
   * 取得任務統計
   */
  async getTaskStatistics(projectId?: string): Promise<{
    total: number
    completed: number
    inProgress: number
    todo: number
    overdue: number
  }> {
    const stats = await this.repository.getTaskStatistics(projectId)
    
    // 計算逾期任務
    let tasks: Task[]
    if (projectId) {
      tasks = await this.getTasksByProject(projectId)
    } else {
      tasks = await this.repository.findAll()
    }

    const now = new Date()
    const overdueCount = tasks.filter(task => 
      task.endDateTime && 
      new Date(task.endDateTime) < now && 
      task.status !== 'done'
    ).length

    return {
      ...stats,
      overdue: overdueCount
    }
  }

  /**
   * 取得用戶工作負載
   */
  async getUserWorkload(userId: string): Promise<{
    totalTasks: number
    activeTasks: number
    completedThisWeek: number
    overdueTasks: number
    upcomingTasks: number
  }> {
    const userTasks = await this.getTasksByUser(userId)
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return {
      totalTasks: userTasks.length,
      activeTasks: userTasks.filter(task => task.status === 'inProgress').length,
      completedThisWeek: userTasks.filter(task => 
        task.status === 'done' && 
        task.completedAt && 
        new Date(task.completedAt) >= startOfWeek
      ).length,
      overdueTasks: userTasks.filter(task => 
        task.endDateTime && 
        new Date(task.endDateTime) < now && 
        task.status !== 'done'
      ).length,
      upcomingTasks: userTasks.filter(task => 
        task.startDateTime && 
        new Date(task.startDateTime) <= nextWeek && 
        new Date(task.startDateTime) >= now
      ).length
    }
  }

  /**
   * 取得專案進度摘要
   */
  async getProjectProgress(projectId: string): Promise<{
    totalTasks: number
    completedTasks: number
    progressPercentage: number
    estimatedCompletion?: string
    milestones: Array<{
      name: string
      dueDate: string
      completed: boolean
    }>
  }> {
    const tasks = await this.getTasksByProject(projectId)
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(task => task.status === 'done').length
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // 簡單的完成日期估算（基於當前進度和剩餘任務）
    let estimatedCompletion: string | undefined
    const remainingTasks = totalTasks - completedTasks
    if (remainingTasks > 0) {
      const completedTasksWithDates = tasks.filter(task => 
        task.status === 'done' && task.completedAt
      )
      
      if (completedTasksWithDates.length > 1) {
        // 計算平均完成速度
        const sortedCompletedTasks = completedTasksWithDates
          .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
        
        const firstCompletion = new Date(sortedCompletedTasks[0].completedAt!)
        const lastCompletion = new Date(sortedCompletedTasks[sortedCompletedTasks.length - 1].completedAt!)
        const daysBetween = (lastCompletion.getTime() - firstCompletion.getTime()) / (1000 * 60 * 60 * 24)
        const tasksPerDay = completedTasksWithDates.length / Math.max(daysBetween, 1)
        
        if (tasksPerDay > 0) {
          const daysToComplete = remainingTasks / tasksPerDay
          estimatedCompletion = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }

    // 提取里程碑（具有截止日期的重要任務）
    const milestones = tasks
      .filter(task => task.endDateTime && (task.priority === 'high' || task.tags?.includes('milestone')))
      .map(task => ({
        name: task.title,
        dueDate: task.endDateTime!,
        completed: task.status === 'done'
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    return {
      totalTasks,
      completedTasks,
      progressPercentage,
      estimatedCompletion,
      milestones
    }
  }

  // ============= 同步與快取管理 =============

  /**
   * 強制同步任務資料
   */
  async syncTasks(): Promise<void> {
    if (!configManager.isSyncEnabled()) {
      throw new Error('同步功能未啟用')
    }

    await this.repository.forceSync()
  }

  /**
   * 取得同步狀態
   */
  getSyncStatus() {
    return this.repository.getSyncStatus()
  }

  /**
   * 清除任務快取
   */
  async clearCache(): Promise<void> {
    await this.repository.clearCache()
  }

  // ============= 私有方法 =============

  /**
   * 更新資料源策略
   */
  private updateDataSourceStrategy(strategy: 'local' | 'api' | 'hybrid'): void {
    switch (strategy) {
      case 'local':
        this.repository.setStrategy('local-only' as any)
        break
      case 'api':
        this.repository.setStrategy('api-only' as any)
        break
      case 'hybrid':
      default:
        this.repository.setStrategy('hybrid' as any)
        break
    }

    console.log(`[TaskService] 資料源策略已更新: ${strategy}`)
  }

  /**
   * 取得 Repository 實例（供測試或進階操作使用）
   */
  getRepository(): TaskApiRepository {
    return this.repository
  }
}