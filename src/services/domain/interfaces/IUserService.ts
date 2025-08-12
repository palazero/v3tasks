/**
 * 用戶領域服務介面
 * 定義用戶相關的核心業務操作
 */

import type { User, UserRole, CreateUserRequest, UpdateUserRequest } from '@/types'

export interface IUserService {
  /**
   * 建立新用戶
   */
  createUser(request: CreateUserRequest): Promise<User>

  /**
   * 更新用戶資訊
   */
  updateUser(id: string, updates: UpdateUserRequest): Promise<User>

  /**
   * 刪除用戶
   */
  deleteUser(id: string): Promise<void>

  /**
   * 根據 ID 取得用戶
   */
  getUserById(id: string): Promise<User | null>

  /**
   * 根據電子郵件取得用戶
   */
  getUserByEmail(email: string): Promise<User | null>

  /**
   * 取得所有用戶
   */
  getAllUsers(): Promise<User[]>

  /**
   * 取得指定角色的用戶
   */
  getUsersByRole(role: UserRole): Promise<User[]>

  /**
   * 更新用戶角色
   */
  updateUserRole(id: string, role: UserRole): Promise<User>

  /**
   * 更新用戶狀態（啟用/停用）
   */
  updateUserStatus(id: string, isActive: boolean): Promise<User>

  /**
   * 檢查用戶權限
   */
  hasPermission(userId: string, permission: string): Promise<boolean>

  /**
   * 搜尋用戶
   */
  searchUsers(query: string): Promise<User[]>

  /**
   * 取得用戶統計資訊
   */
  getUserStats(userId: string): Promise<{
    totalProjects: number
    totalTasks: number
    completedTasks: number
    overdueTasksCount: number
  }>
}