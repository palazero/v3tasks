/**
 * 專案 API Repository 實作
 * 繼承 BaseApiRepository，提供專案相關的 API 操作
 */

import type { Project } from '@/types'
import type { IHttpService } from '../infrastructure/http/http.service'
import { BaseApiRepository, DataSourceStrategy } from './base-api.repository'
import { db } from '../infrastructure/database/db/database'

export class ProjectApiRepository extends BaseApiRepository<Project> {
  protected entityName = 'Project'

  constructor(httpService: IHttpService) {
    super(db.projects, httpService, {
      strategy: DataSourceStrategy.HYBRID,
      apiEndpoint: '/projects',
      cacheTimeout: 5 * 60 * 1000,  // 5 分鐘（專案變更較少）
      syncInterval: 60 * 1000,       // 1 分鐘
      maxRetries: 3,
      enableOfflineSupport: true
    })
  }

  /**
   * 根據擁有者 ID 查找專案
   */
  async findByOwner(ownerId: string): Promise<Project[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return this.findBy({ ownerId })
      
      case DataSourceStrategy.API_ONLY:
        return this.findByOwnerFromApi(ownerId)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByOwnerHybrid(ownerId)
    }
  }

  /**
   * 根據成員 ID 查找專案（包含擁有和參與的專案）
   */
  async findByMember(userId: string): Promise<Project[]> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<Project[]>(
          `${this.config.apiEndpoint}/by-member/${userId}`
        )
        
        // 更新本地快取
        await this.batchUpdateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'findByMember')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地查詢：擁有的專案 + 參與的專案
    const allProjects = await this.findAll()
    return allProjects.filter(project => 
      project.ownerId === userId || 
      (project.members && project.members.some(member => member.userId === userId))
    )
  }

  /**
   * 新增專案成員
   */
  async addMember(
    projectId: string, 
    member: { userId: string; role: 'owner' | 'member' | 'viewer' }
  ): Promise<Project> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.post<Project>(
          `${this.config.apiEndpoint}/${projectId}/members`,
          member
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'addMember')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地新增成員
    const project = await this.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const members = project.members || []
    
    // 檢查成員是否已存在
    if (members.some(m => m.userId === member.userId)) {
      throw new Error('用戶已是專案成員')
    }

    const updatedMembers = [...members, {
      ...member,
      joinedAt: new Date().toISOString()
    }]

    return this.update(projectId, { members: updatedMembers } as Partial<Project>)
  }

  /**
   * 移除專案成員
   */
  async removeMember(projectId: string, userId: string): Promise<Project> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.delete<Project>(
          `${this.config.apiEndpoint}/${projectId}/members/${userId}`
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'removeMember')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地移除成員
    const project = await this.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const members = project.members || []
    const updatedMembers = members.filter(member => member.userId !== userId)

    return this.update(projectId, { members: updatedMembers } as Partial<Project>)
  }

  /**
   * 更新成員角色
   */
  async updateMemberRole(
    projectId: string, 
    userId: string, 
    role: 'owner' | 'member' | 'viewer'
  ): Promise<Project> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.patch<Project>(
          `${this.config.apiEndpoint}/${projectId}/members/${userId}`,
          { role }
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'updateMemberRole')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地更新成員角色
    const project = await this.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const members = project.members || []
    const updatedMembers = members.map(member => 
      member.userId === userId 
        ? { ...member, role, updatedAt: new Date().toISOString() }
        : member
    )

    return this.update(projectId, { members: updatedMembers } as Partial<Project>)
  }

  /**
   * 歸檔專案
   */
  async archiveProject(projectId: string): Promise<Project> {
    return this.update(projectId, { 
      isArchived: true,
      archivedAt: new Date().toISOString()
    } as Partial<Project>)
  }

  /**
   * 恢復已歸檔的專案
   */
  async restoreProject(projectId: string): Promise<Project> {
    return this.update(projectId, { 
      isArchived: false,
      archivedAt: undefined
    } as Partial<Project>)
  }

  /**
   * 複製專案
   */
  async duplicateProject(
    projectId: string, 
    newName: string,
    options?: {
      includeTasks?: boolean
      includeMembers?: boolean
    }
  ): Promise<Project> {
    const originalProject = await this.findById(projectId)
    if (!originalProject) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const duplicatedData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      ...originalProject,
      name: newName,
      members: options?.includeMembers ? originalProject.members : undefined,
      // 移除不需要的欄位
    }

    // 移除不需要的欄位
    delete (duplicatedData as any).id
    delete (duplicatedData as any).createdAt
    delete (duplicatedData as any).updatedAt
    delete (duplicatedData as any)._lastSyncAt
    delete (duplicatedData as any)._isDirty
    delete (duplicatedData as any).isArchived
    delete (duplicatedData as any).archivedAt

    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.post<Project>(
          `${this.config.apiEndpoint}/${projectId}/duplicate`,
          {
            newName,
            includeTasks: options?.includeTasks || false,
            includeMembers: options?.includeMembers || false
          }
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'duplicateProject')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地複製（不包含任務）
    return this.create(duplicatedData)
  }

  // ============= API 專用查詢方法 =============

  /**
   * 從 API 根據擁有者 ID 查找專案
   */
  protected async findByOwnerFromApi(ownerId: string): Promise<Project[]> {
    try {
      const response = await this.httpService.get<Project[]>(
        `${this.config.apiEndpoint}?ownerId=${ownerId}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findByOwner')
      return []
    }
  }

  // ============= 混合模式查詢方法 =============

  /**
   * 混合模式根據擁有者 ID 查找專案
   */
  protected async findByOwnerHybrid(ownerId: string): Promise<Project[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      try {
        const apiProjects = await this.findByOwnerFromApi(ownerId)
        if (apiProjects.length > 0) {
          await this.batchUpdateLocalCache(apiProjects)
          return apiProjects
        }
      } catch (error) {
        this.handleApiError(error, 'findByOwner')
      }
    }

    return this.findBy({ ownerId })
  }

  /**
   * 取得專案統計資訊
   */
  async getProjectStatistics(projectId: string): Promise<{
    totalTasks: number
    completedTasks: number
    activeTasks: number
    overdueTasks: number
    members: number
  }> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<{
          totalTasks: number
          completedTasks: number
          activeTasks: number
          overdueTasks: number
          members: number
        }>(`${this.config.apiEndpoint}/${projectId}/statistics`)
        
        return response.data
      } catch (error) {
        this.handleApiError(error, 'getProjectStatistics')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地統計（基本版本）
    const project = await this.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    return {
      totalTasks: 0,        // 需要從 TaskRepository 查詢
      completedTasks: 0,    // 需要從 TaskRepository 查詢
      activeTasks: 0,       // 需要從 TaskRepository 查詢
      overdueTasks: 0,      // 需要從 TaskRepository 查詢
      members: project.members ? project.members.length : 0
    }
  }

  /**
   * 搜尋專案
   */
  async searchProjects(query: string, userId?: string): Promise<Project[]> {
    let projects: Project[]
    
    if (userId) {
      projects = await this.findByMember(userId)
    } else {
      projects = await this.findAll()
    }

    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.description && project.description.toLowerCase().includes(lowerQuery))
      )
    }

    return projects
  }

  /**
   * 取得使用者可存取的專案列表
   */
  async getAccessibleProjects(userId: string): Promise<Project[]> {
    // 先嘗試 API 查詢
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<Project[]>(
          `${this.config.apiEndpoint}/accessible?userId=${userId}`
        )
        
        // 更新本地快取
        await this.batchUpdateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'getAccessibleProjects')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地查詢：擁有的 + 參與的 + 公開的專案
    return this.findByMember(userId)
  }
}