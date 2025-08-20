/**
 * 任務 API Repository 實作
 * 繼承 BaseApiRepository，提供任務相關的 API 操作
 */

import type { Task } from '@/types'
import type { IHttpService } from '../infrastructure/http/http.service'
import { BaseApiRepository, DataSourceStrategy } from './base-api.repository'
import { db } from '../infrastructure/database/db/database'

export class TaskApiRepository extends BaseApiRepository<Task> {
  protected entityName = 'Task'

  constructor(httpService: IHttpService) {
    super(db.tasks, httpService, {
      strategy: DataSourceStrategy.HYBRID,
      apiEndpoint: '/tasks',
      cacheTimeout: 2 * 60 * 1000,  // 2 分鐘
      syncInterval: 15 * 1000,       // 15 秒
      maxRetries: 3,
      enableOfflineSupport: true
    })
  }

  /**
   * 根據專案 ID 查找任務
   */
  async findByProjectId(projectId: string): Promise<Task[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return this.findBy({ projectId })
      
      case DataSourceStrategy.API_ONLY:
        return this.findByProjectIdFromApi(projectId)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByProjectIdHybrid(projectId)
    }
  }

  /**
   * 根據指派用戶 ID 查找任務
   */
  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return this.findBy({ assigneeId })
      
      case DataSourceStrategy.API_ONLY:
        return this.findByAssigneeIdFromApi(assigneeId)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByAssigneeIdHybrid(assigneeId)
    }
  }

  /**
   * 根據狀態查找任務
   */
  async findByStatus(status: string): Promise<Task[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return this.findBy({ status })
      
      case DataSourceStrategy.API_ONLY:
        return this.findByStatusFromApi(status)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByStatusHybrid(status)
    }
  }

  /**
   * 批量更新任務狀態
   */
  async batchUpdateStatus(taskIds: string[], status: string): Promise<Task[]> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.patch<Task[]>(
          `${this.config.apiEndpoint}/batch-status`,
          { taskIds, status }
        )

        // 更新本地快取
        const updatedTasks = response.data
        for (const task of updatedTasks) {
          await this.updateLocalCache(task)
        }

        return updatedTasks
      } catch (error) {
        this.handleApiError(error, 'batchUpdateStatus')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地批量更新
    const results: Task[] = []
    for (const taskId of taskIds) {
      try {
        const updatedTask = await this.update(taskId, { status } as Partial<Task>)
        results.push(updatedTask)
      } catch (error) {
        console.warn(`批量更新任務狀態失敗 ${taskId}:`, error)
      }
    }

    return results
  }

  /**
   * 移動任務到不同專案
   */
  async moveToProject(taskId: string, targetProjectId: string): Promise<Task> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.patch<Task>(
          `${this.config.apiEndpoint}/${taskId}/move`,
          { projectId: targetProjectId }
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'moveToProject')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地移動
    return this.update(taskId, { projectId: targetProjectId } as Partial<Task>)
  }

  /**
   * 複製任務
   */
  async duplicateTask(taskId: string, overrides?: Partial<Task>): Promise<Task> {
    const originalTask = await this.findById(taskId)
    if (!originalTask) {
      throw new Error(`任務不存在: ${taskId}`)
    }

    const duplicatedData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      ...originalTask,
      title: `${originalTask.title} (副本)`,
      status: 'todo',
      progress: 0,
      completedAt: undefined,
      ...overrides
    }

    // 移除不需要的欄位
    delete (duplicatedData as any).id
    delete (duplicatedData as any).createdAt
    delete (duplicatedData as any).updatedAt
    delete (duplicatedData as any)._lastSyncAt
    delete (duplicatedData as any)._isDirty

    return this.create(duplicatedData)
  }

  // ============= API 專用查詢方法 =============

  /**
   * 從 API 根據專案 ID 查找任務
   */
  protected async findByProjectIdFromApi(projectId: string): Promise<Task[]> {
    try {
      const response = await this.httpService.get<Task[]>(
        `${this.config.apiEndpoint}?projectId=${projectId}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findByProjectId')
      return []
    }
  }

  /**
   * 從 API 根據指派用戶 ID 查找任務
   */
  protected async findByAssigneeIdFromApi(assigneeId: string): Promise<Task[]> {
    try {
      const response = await this.httpService.get<Task[]>(
        `${this.config.apiEndpoint}?assigneeId=${assigneeId}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findByAssigneeId')
      return []
    }
  }

  /**
   * 從 API 根據狀態查找任務
   */
  protected async findByStatusFromApi(status: string): Promise<Task[]> {
    try {
      const response = await this.httpService.get<Task[]>(
        `${this.config.apiEndpoint}?status=${status}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findByStatus')
      return []
    }
  }

  // ============= 混合模式查詢方法 =============

  /**
   * 混合模式根據專案 ID 查找任務
   */
  protected async findByProjectIdHybrid(projectId: string): Promise<Task[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      try {
        const apiTasks = await this.findByProjectIdFromApi(projectId)
        if (apiTasks.length > 0) {
          // 只快取這個專案的任務
          await this.batchUpdateLocalCache(apiTasks)
          return apiTasks
        }
      } catch (error) {
        this.handleApiError(error, 'findByProjectId')
      }
    }

    return this.findBy({ projectId })
  }

  /**
   * 混合模式根據指派用戶 ID 查找任務
   */
  protected async findByAssigneeIdHybrid(assigneeId: string): Promise<Task[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      try {
        const apiTasks = await this.findByAssigneeIdFromApi(assigneeId)
        if (apiTasks.length > 0) {
          await this.batchUpdateLocalCache(apiTasks)
          return apiTasks
        }
      } catch (error) {
        this.handleApiError(error, 'findByAssigneeId')
      }
    }

    return this.findBy({ assigneeId })
  }

  /**
   * 混合模式根據狀態查找任務
   */
  protected async findByStatusHybrid(status: string): Promise<Task[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      try {
        const apiTasks = await this.findByStatusFromApi(status)
        if (apiTasks.length > 0) {
          await this.batchUpdateLocalCache(apiTasks)
          return apiTasks
        }
      } catch (error) {
        this.handleApiError(error, 'findByStatus')
      }
    }

    return this.findBy({ status })
  }

  /**
   * 取得任務統計資訊
   */
  async getTaskStatistics(projectId?: string): Promise<{
    total: number
    completed: number
    inProgress: number
    todo: number
  }> {
    let tasks: Task[]
    
    if (projectId) {
      tasks = await this.findByProjectId(projectId)
    } else {
      tasks = await this.findAll()
    }

    return {
      total: tasks.length,
      completed: tasks.filter(task => task.status === 'done').length,
      inProgress: tasks.filter(task => task.status === 'inProgress').length,
      todo: tasks.filter(task => task.status === 'todo').length
    }
  }

  /**
   * 搜尋任務
   */
  async searchTasks(query: string, filters?: {
    projectId?: string
    assigneeId?: string
    status?: string
    tags?: string[]
  }): Promise<Task[]> {
    let tasks = await this.findAll()

    // 應用篩選條件
    if (filters) {
      if (filters.projectId) {
        tasks = tasks.filter(task => task.projectId === filters.projectId)
      }
      if (filters.assigneeId) {
        tasks = tasks.filter(task => task.assigneeId === filters.assigneeId)
      }
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status)
      }
      if (filters.tags && filters.tags.length > 0) {
        tasks = tasks.filter(task => 
          task.tags && filters.tags!.some(tag => task.tags!.includes(tag))
        )
      }
    }

    // 文字搜尋
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(lowerQuery) ||
        (task.description && task.description.toLowerCase().includes(lowerQuery))
      )
    }

    return tasks
  }
}