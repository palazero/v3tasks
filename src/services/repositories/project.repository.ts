/**
 * 專案 Repository
 * 處理專案相關的資料存取
 */

import { BaseRepository } from './base.repository'
import { db } from '../db/database'
import type { Project } from '@/types'

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super(db.projects)
  }

  /**
   * 取得用戶擁有的專案
   */
  async findByOwner(ownerId: string): Promise<Project[]> {
    return await this.table.where('ownerId').equals(ownerId).toArray()
  }

  /**
   * 取得用戶參與的專案（包含擁有和成員）
   */
  async findByMember(userId: string): Promise<Project[]> {
    const projects = await this.findAll()
    return projects.filter(project => 
      project.ownerId === userId || project.memberIds.includes(userId)
    )
  }

  /**
   * 取得未封存的專案
   */
  async findActive(): Promise<Project[]> {
    return await this.table.where('isArchived').equals(false).toArray()
  }

  /**
   * 取得已封存的專案
   */
  async findArchived(): Promise<Project[]> {
    return await this.table.where('isArchived').equals(true).toArray()
  }

  /**
   * 根據名稱模糊搜尋專案
   */
  async searchByName(keyword: string): Promise<Project[]> {
    const allProjects = await this.findAll()
    const lowerKeyword = keyword.toLowerCase()
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 新增專案成員
   */
  async addMember(projectId: string, userId: string): Promise<void> {
    const project = await this.findById(projectId)
    if (project && !project.memberIds.includes(userId)) {
      project.memberIds.push(userId)
      await this.update(projectId, { memberIds: project.memberIds })
    }
  }

  /**
   * 移除專案成員
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    const project = await this.findById(projectId)
    if (project) {
      project.memberIds = project.memberIds.filter(id => id !== userId)
      await this.update(projectId, { memberIds: project.memberIds })
    }
  }

  /**
   * 轉移專案擁有者
   */
  async transferOwnership(projectId: string, newOwnerId: string): Promise<void> {
    const project = await this.findById(projectId)
    if (project) {
      // 將原擁有者加入成員列表
      if (!project.memberIds.includes(project.ownerId)) {
        project.memberIds.push(project.ownerId)
      }
      // 從成員列表中移除新擁有者
      project.memberIds = project.memberIds.filter(id => id !== newOwnerId)
      
      await this.update(projectId, {
        ownerId: newOwnerId,
        memberIds: project.memberIds
      })
    }
  }

  /**
   * 封存專案
   */
  async archive(projectId: string): Promise<void> {
    await this.update(projectId, { isArchived: true })
  }

  /**
   * 取消封存專案
   */
  async unarchive(projectId: string): Promise<void> {
    await this.update(projectId, { isArchived: false })
  }

  /**
   * 檢查用戶是否為專案擁有者
   */
  async isOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await this.findById(projectId)
    return project?.ownerId === userId
  }

  /**
   * 檢查用戶是否為專案成員
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const project = await this.findById(projectId)
    if (!project) return false
    return project.ownerId === userId || project.memberIds.includes(userId)
  }

  /**
   * 取得專案統計資訊
   */
  async getStats(): Promise<{
    total: number
    active: number
    archived: number
  }> {
    const [total, archived] = await Promise.all([
      this.count(),
      this.countBy({ isArchived: true })
    ])

    return {
      total,
      active: total - archived,
      archived
    }
  }

  /**
   * 複製專案
   */
  async duplicate(projectId: string, newName: string, newOwnerId: string): Promise<string> {
    const project = await this.findById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const newProject: Project = {
      ...project,
      projectId: '', // 將由資料庫自動生成
      name: newName,
      ownerId: newOwnerId,
      memberIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false
    }

    // @ts-ignore - projectId will be generated
    delete newProject.projectId
    
    const newId = await this.create(newProject as Project)
    return String(newId)
  }
}

// 建立單例實例
let projectRepositoryInstance: ProjectRepository | null = null

/**
 * 取得 ProjectRepository 實例
 */
export function getProjectRepository(): ProjectRepository {
  if (!projectRepositoryInstance) {
    projectRepositoryInstance = new ProjectRepository()
  }
  return projectRepositoryInstance
}