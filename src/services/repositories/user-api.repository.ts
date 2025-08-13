/**
 * 用戶 API Repository 實作
 * 繼承 BaseApiRepository，提供用戶相關的 API 操作
 */

import type { User } from '@/types'
import type { IHttpService } from '../infrastructure/http/http.service'
import { BaseApiRepository, DataSourceStrategy } from './base-api.repository'
import { db } from '../infrastructure/database/db/database'

export class UserApiRepository extends BaseApiRepository<User> {
  protected entityName = 'User'

  constructor(httpService: IHttpService) {
    super(db.users, httpService, {
      strategy: DataSourceStrategy.HYBRID,
      apiEndpoint: '/users',
      cacheTimeout: 10 * 60 * 1000, // 10 分鐘（用戶資料變更較少）
      syncInterval: 5 * 60 * 1000,   // 5 分鐘
      maxRetries: 3,
      enableOfflineSupport: true
    })
  }

  /**
   * 根據電子郵件查找用戶
   */
  async findByEmail(email: string): Promise<User | null> {
    // 優先使用 API 查詢（確保最新資料）
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<User>(
          `${this.config.apiEndpoint}/by-email?email=${encodeURIComponent(email)}`
        )
        
        // 更新本地快取
        if (response.data) {
          await this.updateLocalCache(response.data)
        }
        
        return response.data
      } catch (error) {
        this.handleApiError(error, 'findByEmail')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地查詢
    return this.findOneBy({ email })
  }

  /**
   * 根據用戶名查找用戶
   */
  async findByUsername(username: string): Promise<User | null> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<User>(
          `${this.config.apiEndpoint}/by-username?username=${encodeURIComponent(username)}`
        )
        
        if (response.data) {
          await this.updateLocalCache(response.data)
        }
        
        return response.data
      } catch (error) {
        this.handleApiError(error, 'findByUsername')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return this.findOneBy({ username })
  }

  /**
   * 根據角色查找用戶
   */
  async findByRole(role: 'admin' | 'user'): Promise<User[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return this.findBy({ role })
      
      case DataSourceStrategy.API_ONLY:
        return this.findByRoleFromApi(role)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByRoleHybrid(role)
    }
  }

  /**
   * 用戶認證
   */
  async authenticate(email: string, password: string): Promise<{
    user: User
    token: string
    refreshToken: string
  } | null> {
    try {
      const response = await this.httpService.post<{
        user: User
        token: string
        refreshToken: string
      }>('/auth/login', { email, password })

      // 更新本地用戶快取
      if (response.data.user) {
        await this.updateLocalCache(response.data.user)
      }

      // 設定認證令牌
      this.httpService.setAuthToken(response.data.token)

      return response.data
    } catch (error) {
      this.handleApiError(error, 'authenticate')
      return null
    }
  }

  /**
   * 用戶註冊
   */
  async register(userData: {
    email: string
    password: string
    username: string
    name: string
  }): Promise<{
    user: User
    token: string
    refreshToken: string
  }> {
    const response = await this.httpService.post<{
      user: User
      token: string
      refreshToken: string
    }>('/auth/register', userData)

    // 更新本地用戶快取
    if (response.data.user) {
      await this.updateLocalCache(response.data.user)
    }

    // 設定認證令牌
    this.httpService.setAuthToken(response.data.token)

    return response.data
  }

  /**
   * 更新用戶資料
   */
  async updateProfile(userId: string, updates: {
    name?: string
    email?: string
    username?: string
    avatar?: string
  }): Promise<User> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.put<User>(
          `${this.config.apiEndpoint}/${userId}/profile`,
          updates
        )

        // 更新本地快取
        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'updateProfile')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地更新
    return this.update(userId, updates as Partial<User>)
  }

  /**
   * 變更密碼
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.httpService.put(`${this.config.apiEndpoint}/${userId}/password`, {
      currentPassword,
      newPassword
    })
  }

  /**
   * 重設密碼（發送重設連結）
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.httpService.post('/auth/password-reset-request', { email })
  }

  /**
   * 重設密碼（使用重設令牌）
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.httpService.post('/auth/password-reset', { token, newPassword })
  }

  /**
   * 更新用戶偏好設定
   */
  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<User> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.put<User>(
          `${this.config.apiEndpoint}/${userId}/preferences`,
          { preferences }
        )

        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'updatePreferences')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return this.update(userId, { preferences } as Partial<User>)
  }

  /**
   * 停用用戶帳號
   */
  async deactivateUser(userId: string): Promise<User> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.patch<User>(
          `${this.config.apiEndpoint}/${userId}/deactivate`
        )

        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'deactivateUser')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return this.update(userId, { 
      isActive: false,
      deactivatedAt: new Date().toISOString()
    } as Partial<User>)
  }

  /**
   * 重新啟用用戶帳號
   */
  async reactivateUser(userId: string): Promise<User> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.patch<User>(
          `${this.config.apiEndpoint}/${userId}/reactivate`
        )

        await this.updateLocalCache(response.data)
        return response.data
      } catch (error) {
        this.handleApiError(error, 'reactivateUser')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return this.update(userId, { 
      isActive: true,
      deactivatedAt: undefined,
      reactivatedAt: new Date().toISOString()
    } as Partial<User>)
  }

  // ============= API 專用查詢方法 =============

  /**
   * 從 API 根據角色查找用戶
   */
  protected async findByRoleFromApi(role: 'admin' | 'user'): Promise<User[]> {
    try {
      const response = await this.httpService.get<User[]>(
        `${this.config.apiEndpoint}?role=${role}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findByRole')
      return []
    }
  }

  // ============= 混合模式查詢方法 =============

  /**
   * 混合模式根據角色查找用戶
   */
  protected async findByRoleHybrid(role: 'admin' | 'user'): Promise<User[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      try {
        const apiUsers = await this.findByRoleFromApi(role)
        if (apiUsers.length > 0) {
          await this.batchUpdateLocalCache(apiUsers)
          return apiUsers
        }
      } catch (error) {
        this.handleApiError(error, 'findByRole')
      }
    }

    return this.findBy({ role })
  }

  /**
   * 搜尋用戶
   */
  async searchUsers(query: string, filters?: {
    role?: 'admin' | 'user'
    isActive?: boolean
  }): Promise<User[]> {
    let users = await this.findAll()

    // 應用篩選條件
    if (filters) {
      if (filters.role) {
        users = users.filter(user => user.role === filters.role)
      }
      if (filters.isActive !== undefined) {
        users = users.filter(user => user.isActive === filters.isActive)
      }
    }

    // 文字搜尋
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      users = users.filter(user => 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        (user.username && user.username.toLowerCase().includes(lowerQuery))
      )
    }

    return users
  }

  /**
   * 取得用戶活動統計
   */
  async getUserActivity(userId: string): Promise<{
    totalTasks: number
    completedTasks: number
    activeProjects: number
    lastActivityAt?: string
  }> {
    if (this.shouldUseApi()) {
      try {
        const response = await this.httpService.get<{
          totalTasks: number
          completedTasks: number
          activeProjects: number
          lastActivityAt?: string
        }>(`${this.config.apiEndpoint}/${userId}/activity`)
        
        return response.data
      } catch (error) {
        this.handleApiError(error, 'getUserActivity')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    // 本地統計（基本版本）
    return {
      totalTasks: 0,        // 需要從 TaskRepository 查詢
      completedTasks: 0,    // 需要從 TaskRepository 查詢  
      activeProjects: 0,    // 需要從 ProjectRepository 查詢
      lastActivityAt: undefined
    }
  }

  /**
   * 驗證用戶令牌
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const response = await this.httpService.get<{ user: User }>(
        '/auth/verify-token',
        { 
          headers: { Authorization: `Bearer ${token}` },
          skipAuth: true 
        } as any
      )

      if (response.data.user) {
        await this.updateLocalCache(response.data.user)
        this.httpService.setAuthToken(token)
        return response.data.user
      }

      return null
    } catch (error) {
      this.handleApiError(error, 'verifyToken')
      return null
    }
  }

  /**
   * 刷新認證令牌
   */
  async refreshToken(refreshToken: string): Promise<{
    token: string
    refreshToken: string
    user: User
  } | null> {
    try {
      const response = await this.httpService.post<{
        token: string
        refreshToken: string
        user: User
      }>('/auth/refresh-token', { refreshToken })

      if (response.data) {
        await this.updateLocalCache(response.data.user)
        this.httpService.setAuthToken(response.data.token)
      }

      return response.data
    } catch (error) {
      this.handleApiError(error, 'refreshToken')
      return null
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await this.httpService.post('/auth/logout')
    } catch (error) {
      // 登出錯誤不是致命的
      this.handleApiError(error, 'logout')
    } finally {
      // 清除本地認證狀態
      this.httpService.clearAuthToken()
    }
  }
}