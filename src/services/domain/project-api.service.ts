/**
 * 專案 API 服務實作
 * 將原有的本地資料庫操作替換為後端 API 呼叫
 */

import type { IProjectService } from './interfaces/IProjectService'
import type { 
  Project, 
  ProjectMember, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ProjectMemberRequest 
} from '@/types'
import { ProjectApiService } from '../infrastructure/http/api.service'

export class ProjectApiDomainService implements IProjectService {
  /**
   * 建立新專案
   */
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await ProjectApiService.createProject({
      name: request.name,
      description: request.description || '',
      icon: request.icon || '📁',
      ownerId: request.ownerId,
      isArchived: false,
      ...request
    })

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '建立專案失敗')
    }

    return response.data
  }

  /**
   * 更新專案資訊
   */
  async updateProject(id: string, updates: UpdateProjectRequest): Promise<Project> {
    const response = await ProjectApiService.updateProject(id, updates)

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '更新專案失敗')
    }

    return response.data
  }

  /**
   * 刪除專案
   */
  async deleteProject(id: string): Promise<void> {
    const response = await ProjectApiService.deleteProject(id)

    if (!response.success) {
      throw new Error(response.error?.message || '刪除專案失敗')
    }
  }

  /**
   * 根據 ID 取得專案
   */
  async getProjectById(id: string): Promise<Project | null> {
    const response = await ProjectApiService.getProject(id)

    if (!response.success) {
      if (response.error?.code === 'HTTP_404') {
        return null
      }
      throw new Error(response.error?.message || '取得專案失敗')
    }

    return response.data || null
  }

  /**
   * 取得所有專案
   */
  async getAllProjects(): Promise<Project[]> {
    const response = await ProjectApiService.getProjects()

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '取得專案列表失敗')
    }

    return response.data
  }

  /**
   * 取得用戶參與的專案
   */
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    // 如果後端支援用戶篩選，可以修改為直接 API 呼叫
    const allProjects = await this.getAllProjects()
    return allProjects.filter(project => 
      project.ownerId === userId ||
      project.members?.some(member => member.userId === userId)
    )
  }

  /**
   * 取得用戶擁有的專案
   */
  async getProjectsByOwnerId(ownerId: string): Promise<Project[]> {
    const allProjects = await this.getAllProjects()
    return allProjects.filter(project => project.ownerId === ownerId)
  }

  /**
   * 新增專案成員
   */
  async addProjectMember(projectId: string, memberRequest: ProjectMemberRequest): Promise<ProjectMember> {
    const response = await ProjectApiService.addProjectMember(projectId, {
      userId: memberRequest.userId,
      role: memberRequest.role || 'member',
      ...memberRequest
    })

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '新增專案成員失敗')
    }

    return response.data
  }

  /**
   * 移除專案成員
   */
  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const response = await ProjectApiService.removeProjectMember(projectId, userId)

    if (!response.success) {
      throw new Error(response.error?.message || '移除專案成員失敗')
    }
  }

  /**
   * 取得專案成員列表
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await ProjectApiService.getProjectMembers(projectId)

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '取得專案成員失敗')
    }

    return response.data
  }

  /**
   * 更新專案成員角色
   */
  async updateProjectMemberRole(
    projectId: string, 
    userId: string, 
    role: string
  ): Promise<ProjectMember> {
    // 這個方法需要後端提供專門的端點
    // 目前使用移除再新增的方式
    await this.removeProjectMember(projectId, userId)
    return await this.addProjectMember(projectId, { userId, role })
  }

  /**
   * 檢查用戶是否為專案成員
   */
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getProjectMembers(projectId)
      return members.some(member => member.userId === userId)
    } catch {
      return false
    }
  }

  /**
   * 檢查用戶是否為專案擁有者
   */
  async isProjectOwner(projectId: string, userId: string): Promise<boolean> {
    try {
      const project = await this.getProjectById(projectId)
      return project?.ownerId === userId
    } catch {
      return false
    }
  }

  /**
   * 搜尋專案
   */
  async searchProjects(query: string, userId?: string): Promise<Project[]> {
    // 如果後端支援搜尋，可以修改為直接 API 呼叫
    const projects = userId 
      ? await this.getProjectsByUserId(userId)
      : await this.getAllProjects()
    
    const searchTerm = query.toLowerCase()
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * 歸檔專案
   */
  async archiveProject(projectId: string): Promise<Project> {
    return await this.updateProject(projectId, { isArchived: true })
  }

  /**
   * 取消歸檔專案
   */
  async unarchiveProject(projectId: string): Promise<Project> {
    return await this.updateProject(projectId, { isArchived: false })
  }

  /**
   * 取得專案統計資訊
   */
  async getProjectStats(projectId: string): Promise<{
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    totalMembers: number
    overdueTasksCount: number
  }> {
    // TODO: 當後端有任務 API 時，更新此實作
    try {
      const members = await this.getProjectMembers(projectId)
      
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        totalMembers: members.length,
        overdueTasksCount: 0
      }
    } catch {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        totalMembers: 0,
        overdueTasksCount: 0
      }
    }
  }
}