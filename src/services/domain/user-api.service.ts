/**
 * 用戶 API 服務實作
 * 將原有的本地資料庫操作替換為後端 API 呼叫
 */

import type { IUserService } from './interfaces/IUserService'
import type { User, UserRole, CreateUserRequest, UpdateUserRequest } from '@/types'
import { UserApiService } from '../infrastructure/http/api.service'

export class UserApiDomainService implements IUserService {
  /**
   * 建立新用戶
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    const response = await UserApiService.createUser({
      name: request.name,
      email: request.email,
      role: request.role || 'user',
      isActive: request.isActive ?? true,
      ...request
    })

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '建立用戶失敗')
    }

    return response.data
  }

  /**
   * 更新用戶資訊
   */
  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    const response = await UserApiService.updateUser(id, updates)

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '更新用戶失敗')
    }

    return response.data
  }

  /**
   * 刪除用戶
   */
  async deleteUser(id: string): Promise<void> {
    const response = await UserApiService.deleteUser(id)

    if (!response.success) {
      throw new Error(response.error?.message || '刪除用戶失敗')
    }
  }

  /**
   * 根據 ID 取得用戶
   */
  async getUserById(id: string): Promise<User | null> {
    const response = await UserApiService.getUser(id)

    if (!response.success) {
      if (response.error?.code === 'HTTP_404') {
        return null
      }
      throw new Error(response.error?.message || '取得用戶失敗')
    }

    return response.data || null
  }

  /**
   * 根據電子郵件取得用戶
   */
  async getUserByEmail(email: string): Promise<User | null> {
    // 這個方法需要後端提供專門的端點或使用查詢參數
    const response = await UserApiService.getUsers()

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '取得用戶失敗')
    }

    const users = response.data
    return users.find(user => user.email === email) || null
  }

  /**
   * 取得所有用戶
   */
  async getAllUsers(): Promise<User[]> {
    const response = await UserApiService.getUsers()

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '取得用戶列表失敗')
    }

    return response.data
  }

  /**
   * 取得指定角色的用戶
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    // 如果後端支援角色篩選，可以修改為直接 API 呼叫
    const allUsers = await this.getAllUsers()
    return allUsers.filter(user => user.role === role)
  }

  /**
   * 更新用戶角色
   */
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return await this.updateUser(id, { role })
  }

  /**
   * 更新用戶狀態（啟用/停用）
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    return await this.updateUser(id, { isActive })
  }

  /**
   * 檢查用戶權限
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    if (!user || !user.isActive) {
      return false
    }

    // 基本權限映射 (可依需求擴展)
    const rolePermissions: Record<UserRole, string[]> = {
      'admin': ['*'], // 所有權限
      'user': ['read', 'write', 'create_project']
    }

    const userPermissions = rolePermissions[user.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }

  /**
   * 搜尋用戶
   */
  async searchUsers(query: string): Promise<User[]> {
    // 如果後端支援搜尋，可以修改為直接 API 呼叫
    const allUsers = await this.getAllUsers()
    
    const searchTerm = query.toLowerCase()
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * 取得用戶統計資訊
   * 注意：這個方法需要整合專案和任務 API，目前提供基本實作
   */
  async getUserStats(userId: string): Promise<{
    totalProjects: number
    totalTasks: number
    completedTasks: number
    overdueTasksCount: number
  }> {
    // TODO: 當後端有專案和任務 API 時，更新此實作
    // 目前返回預設值
    return {
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasksCount: 0
    }
  }

  /**
   * 取得當前用戶資訊
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await UserApiService.getCurrentUser()

    if (!response.success) {
      if (response.error?.code === 'HTTP_401') {
        return null
      }
      throw new Error(response.error?.message || '取得當前用戶失敗')
    }

    return response.data || null
  }

  /**
   * 更新當前用戶資訊
   */
  async updateCurrentUser(updates: UpdateUserRequest): Promise<User> {
    const response = await UserApiService.updateCurrentUser(updates)

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || '更新當前用戶失敗')
    }

    return response.data
  }
}