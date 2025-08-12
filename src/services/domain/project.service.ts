/**
 * 專案領域服務實作
 * 實作專案相關的核心業務邏輯
 */

import type { IProjectService } from './interfaces/IProjectService'
import type { Project, User, ProjectMember, CreateProjectRequest, UpdateProjectRequest } from '@/types'
import { getProjectRepository, getUserRepository } from '../repositories'
import { nanoid } from 'nanoid'

export class ProjectService implements IProjectService {
  /**
   * 建立新專案
   */
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const projectRepo = getProjectRepository()
    
    const newProject: Project = {
      ...request,
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
      members: request.members || []
    }

    return await projectRepo.create(newProject)
  }

  /**
   * 更新專案
   */
  async updateProject(id: string, updates: UpdateProjectRequest): Promise<Project> {
    const projectRepo = getProjectRepository()
    
    const existingProject = await projectRepo.findById(id)
    if (!existingProject) {
      throw new Error(`專案不存在: ${id}`)
    }

    const updatedProject = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await projectRepo.update(id, updatedProject)
  }

  /**
   * 刪除專案
   */
  async deleteProject(id: string): Promise<void> {
    const projectRepo = getProjectRepository()
    
    const existingProject = await projectRepo.findById(id)
    if (!existingProject) {
      throw new Error(`專案不存在: ${id}`)
    }

    // TODO: 考慮是否需要刪除相關任務
    await projectRepo.delete(id)
  }

  /**
   * 根據 ID 取得專案
   */
  async getProjectById(id: string): Promise<Project | null> {
    const projectRepo = getProjectRepository()
    return await projectRepo.findById(id)
  }

  /**
   * 取得所有專案
   */
  async getAllProjects(): Promise<Project[]> {
    const projectRepo = getProjectRepository()
    return await projectRepo.findAll()
  }

  /**
   * 取得用戶可存取的專案
   */
  async getProjectsByUser(userId: string): Promise<Project[]> {
    const projectRepo = getProjectRepository()
    const allProjects = await projectRepo.findAll()
    
    return allProjects.filter(project => 
      project.members?.some(member => member.userId === userId) ||
      project.ownerId === userId
    )
  }

  /**
   * 新增專案成員
   */
  async addProjectMember(projectId: string, member: Omit<ProjectMember, 'joinedAt'>): Promise<void> {
    const projectRepo = getProjectRepository()
    const userRepo = getUserRepository()
    
    // 驗證專案存在
    const project = await projectRepo.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    // 驗證用戶存在
    const user = await userRepo.findById(member.userId)
    if (!user) {
      throw new Error(`用戶不存在: ${member.userId}`)
    }

    // 檢查用戶是否已是成員
    const isAlreadyMember = project.members?.some(m => m.userId === member.userId)
    if (isAlreadyMember) {
      throw new Error(`用戶已是專案成員: ${member.userId}`)
    }

    const newMember: ProjectMember = {
      ...member,
      joinedAt: new Date().toISOString()
    }

    const updatedMembers = [...(project.members || []), newMember]
    await projectRepo.update(projectId, { members: updatedMembers })
  }

  /**
   * 移除專案成員
   */
  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const projectRepo = getProjectRepository()
    
    const project = await projectRepo.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    // 不能移除專案擁有者
    if (project.ownerId === userId) {
      throw new Error('無法移除專案擁有者')
    }

    const updatedMembers = (project.members || []).filter(m => m.userId !== userId)
    await projectRepo.update(projectId, { members: updatedMembers })
  }

  /**
   * 更新成員角色
   */
  async updateMemberRole(projectId: string, userId: string, role: ProjectMember['role']): Promise<void> {
    const projectRepo = getProjectRepository()
    
    const project = await projectRepo.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const memberIndex = (project.members || []).findIndex(m => m.userId === userId)
    if (memberIndex === -1) {
      throw new Error(`用戶不是專案成員: ${userId}`)
    }

    const updatedMembers = [...(project.members || [])]
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      role
    }

    await projectRepo.update(projectId, { members: updatedMembers })
  }

  /**
   * 取得專案成員列表
   */
  async getProjectMembers(projectId: string): Promise<User[]> {
    const projectRepo = getProjectRepository()
    const userRepo = getUserRepository()
    
    const project = await projectRepo.findById(projectId)
    if (!project) {
      throw new Error(`專案不存在: ${projectId}`)
    }

    const memberIds = (project.members || []).map(m => m.userId)
    
    // 加入專案擁有者
    if (project.ownerId && !memberIds.includes(project.ownerId)) {
      memberIds.push(project.ownerId)
    }

    const users: User[] = []
    for (const userId of memberIds) {
      const user = await userRepo.findById(userId)
      if (user) {
        users.push(user)
      }
    }

    return users
  }

  /**
   * 檢查用戶是否為專案成員
   */
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProjectById(projectId)
    if (!project) {
      return false
    }

    return project.ownerId === userId || 
           (project.members || []).some(m => m.userId === userId)
  }

  /**
   * 檢查用戶權限
   */
  async hasProjectPermission(projectId: string, userId: string, permission: string): Promise<boolean> {
    const project = await this.getProjectById(projectId)
    if (!project) {
      return false
    }

    // 專案擁有者擁有所有權限
    if (project.ownerId === userId) {
      return true
    }

    // 根據成員角色檢查權限
    const member = (project.members || []).find(m => m.userId === userId)
    if (!member) {
      return false
    }

    // 基本權限映射 (可依需求擴展)
    const rolePermissions: Record<string, string[]> = {
      'owner': ['*'], // 所有權限
      'admin': ['read', 'write', 'delete', 'manage_members'],
      'member': ['read', 'write'],
      'viewer': ['read']
    }

    const userPermissions = rolePermissions[member.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }

  /**
   * 歸檔專案
   */
  async archiveProject(id: string): Promise<void> {
    await this.updateProject(id, { isArchived: true })
  }

  /**
   * 還原已歸檔專案
   */
  async restoreProject(id: string): Promise<void> {
    await this.updateProject(id, { isArchived: false })
  }
}