/**
 * 專案領域服務介面
 * 定義專案相關的核心業務操作
 */

import type { Project, User, ProjectMember, CreateProjectRequest, UpdateProjectRequest } from '@/types'

export interface IProjectService {
  /**
   * 建立新專案
   */
  createProject(request: CreateProjectRequest): Promise<Project>

  /**
   * 更新專案
   */
  updateProject(id: string, updates: UpdateProjectRequest): Promise<Project>

  /**
   * 刪除專案
   */
  deleteProject(id: string): Promise<void>

  /**
   * 根據 ID 取得專案
   */
  getProjectById(id: string): Promise<Project | null>

  /**
   * 取得所有專案
   */
  getAllProjects(): Promise<Project[]>

  /**
   * 取得用戶可存取的專案
   */
  getProjectsByUser(userId: string): Promise<Project[]>

  /**
   * 新增專案成員
   */
  addProjectMember(projectId: string, member: Omit<ProjectMember, 'joinedAt'>): Promise<void>

  /**
   * 移除專案成員
   */
  removeProjectMember(projectId: string, userId: string): Promise<void>

  /**
   * 更新成員角色
   */
  updateMemberRole(projectId: string, userId: string, role: ProjectMember['role']): Promise<void>

  /**
   * 取得專案成員列表
   */
  getProjectMembers(projectId: string): Promise<User[]>

  /**
   * 檢查用戶是否為專案成員
   */
  isProjectMember(projectId: string, userId: string): Promise<boolean>

  /**
   * 檢查用戶權限
   */
  hasProjectPermission(projectId: string, userId: string, permission: string): Promise<boolean>

  /**
   * 歸檔專案
   */
  archiveProject(id: string): Promise<void>

  /**
   * 還原已歸檔專案
   */
  restoreProject(id: string): Promise<void>
}