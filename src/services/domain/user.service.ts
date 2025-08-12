/**
 * 用戶領域服務實作
 * 實作用戶相關的核心業務邏輯
 */

import type { IUserService } from './interfaces/IUserService'
import type { User, UserRole, CreateUserRequest, UpdateUserRequest } from '@/types'
import { getUserRepository, getProjectRepository, getTaskRepository } from '../repositories'
import { nanoid } from 'nanoid'

export class UserService implements IUserService {
  /**
   * 建立新用戶
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    const userRepo = getUserRepository()
    
    // 檢查電子郵件是否已存在
    const existingUser = await userRepo.findOneBy({ email: request.email })
    if (existingUser) {
      throw new Error(`電子郵件已存在: ${request.email}`)
    }

    const newUser: User = {
      ...request,
      userId: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: request.isActive ?? true,
      role: request.role || 'user'
    }

    return await userRepo.create(newUser)
  }

  /**
   * 更新用戶資訊
   */
  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    const userRepo = getUserRepository()
    
    const existingUser = await userRepo.findById(id)
    if (!existingUser) {
      throw new Error(`用戶不存在: ${id}`)
    }

    // 如果更新電子郵件，檢查是否已存在
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await userRepo.findOneBy({ email: updates.email })
      if (emailExists) {
        throw new Error(`電子郵件已存在: ${updates.email}`)
      }
    }

    const updatedUser = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await userRepo.update(id, updatedUser)
  }

  /**
   * 刪除用戶
   */
  async deleteUser(id: string): Promise<void> {
    const userRepo = getUserRepository()
    
    const existingUser = await userRepo.findById(id)
    if (!existingUser) {
      throw new Error(`用戶不存在: ${id}`)
    }

    // TODO: 考慮處理用戶相關的任務和專案
    await userRepo.delete(id)
  }

  /**
   * 根據 ID 取得用戶
   */
  async getUserById(id: string): Promise<User | null> {
    const userRepo = getUserRepository()
    return await userRepo.findById(id)
  }

  /**
   * 根據電子郵件取得用戶
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const userRepo = getUserRepository()
    return await userRepo.findOneBy({ email })
  }

  /**
   * 取得所有用戶
   */
  async getAllUsers(): Promise<User[]> {
    const userRepo = getUserRepository()
    return await userRepo.findAll()
  }

  /**
   * 取得指定角色的用戶
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const userRepo = getUserRepository()
    return await userRepo.findBy({ role })
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
    const userRepo = getUserRepository()
    const allUsers = await userRepo.findAll()
    
    const searchTerm = query.toLowerCase()
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * 取得用戶統計資訊
   */
  async getUserStats(userId: string): Promise<{
    totalProjects: number
    totalTasks: number
    completedTasks: number
    overdueTasksCount: number
  }> {
    const projectRepo = getProjectRepository()
    const taskRepo = getTaskRepository()
    
    // 取得用戶參與的專案
    const allProjects = await projectRepo.findAll()
    const userProjects = allProjects.filter(project => 
      project.ownerId === userId ||
      project.members?.some(member => member.userId === userId)
    )

    // 取得用戶的任務
    const userTasks = await taskRepo.findBy({ assigneeId: userId })
    
    // 計算完成的任務
    const completedTasks = userTasks.filter(task => task.status === 'done')
    
    // 計算逾期任務
    const now = new Date()
    const overdueTasks = userTasks.filter(task => 
      task.endDateTime && 
      new Date(task.endDateTime) < now && 
      task.status !== 'done'
    )

    return {
      totalProjects: userProjects.length,
      totalTasks: userTasks.length,
      completedTasks: completedTasks.length,
      overdueTasksCount: overdueTasks.length
    }
  }
}