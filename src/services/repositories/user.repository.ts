/**
 * 用戶 Repository
 * 處理用戶相關的資料存取
 */

import { BaseRepository } from './base.repository'
import { db } from '../db/database'
import type { User, UserRole } from '@/types'

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(db.users)
  }

  /**
   * 根據 email 查詢用戶
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return await this.table.where('email').equals(email).first()
  }

  /**
   * 根據角色查詢用戶
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return await this.table.where('role').equals(role).toArray()
  }

  /**
   * 根據名稱模糊搜尋用戶
   */
  async searchByName(keyword: string): Promise<User[]> {
    const allUsers = await this.findAll()
    const lowerKeyword = keyword.toLowerCase()
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 取得管理員用戶
   */
  async findAdmins(): Promise<User[]> {
    return await this.findByRole('admin' as UserRole)
  }

  /**
   * 批次取得用戶
   */
  async findByIds(userIds: string[]): Promise<User[]> {
    return await this.table.where('userId').anyOf(userIds).toArray()
  }

  /**
   * 更新用戶角色
   */
  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.update(userId, { role })
  }

  /**
   * 檢查是否為管理員
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.findById(userId)
    return user?.role === 'admin'
  }

  /**
   * 取得用戶統計資訊
   */
  async getStats(): Promise<{
    total: number
    admins: number
    users: number
  }> {
    const [total, admins] = await Promise.all([
      this.count(),
      this.countBy({ role: 'admin' as UserRole })
    ])

    return {
      total,
      admins,
      users: total - admins
    }
  }
}

// 建立單例實例
let userRepositoryInstance: UserRepository | null = null

/**
 * 取得 UserRepository 實例
 */
export function getUserRepository(): UserRepository {
  if (!userRepositoryInstance) {
    userRepositoryInstance = new UserRepository()
  }
  return userRepositoryInstance
}