/**
 * 服務適配器
 * 提供向下相容性，讓現有程式碼無須修改即可使用 API 功能
 */

import { container } from '../infrastructure/container/service-container'
import { ServiceFactory } from '../infrastructure/container/service-providers'
import { configManager } from '../infrastructure/config/app.config'

/**
 * 任務服務適配器
 * 自動選擇 API 或本地實作
 */
class TaskServiceAdapter {
  private get service() {
    return ServiceFactory.getTaskService(container)
  }

  async createTask(...args: any[]) {
    return this.service.createTask(...args)
  }

  async updateTask(...args: any[]) {
    return this.service.updateTask(...args)
  }

  async deleteTask(...args: any[]) {
    return this.service.deleteTask(...args)
  }

  async getTaskById(...args: any[]) {
    return this.service.getTaskById(...args)
  }

  async getTasksByProject(...args: any[]) {
    return this.service.getTasksByProject(...args)
  }

  async getTasksByUser(...args: any[]) {
    return this.service.getTasksByUser(...args)
  }

  async updateTaskStatus(...args: any[]) {
    return this.service.updateTaskStatus(...args)
  }

  async updateTaskPriority(...args: any[]) {
    return this.service.updateTaskPriority(...args)
  }

  async batchUpdateTasks(...args: any[]) {
    return this.service.batchUpdateTasks(...args)
  }

  async duplicateTask(...args: any[]) {
    return this.service.duplicateTask(...args)
  }

  async moveTaskToProject(...args: any[]) {
    return this.service.moveTaskToProject(...args)
  }

  // 擴展方法（僅在 API 服務中可用）
  async searchTasks(...args: any[]) {
    if (typeof this.service.searchTasks === 'function') {
      return this.service.searchTasks(...args)
    }
    throw new Error('搜尋功能需要 API 整合')
  }

  async getTaskStatistics(...args: any[]) {
    if (typeof this.service.getTaskStatistics === 'function') {
      return this.service.getTaskStatistics(...args)
    }
    throw new Error('統計功能需要 API 整合')
  }

  async getUserWorkload(...args: any[]) {
    if (typeof this.service.getUserWorkload === 'function') {
      return this.service.getUserWorkload(...args)
    }
    throw new Error('工作負載分析需要 API 整合')
  }

  async getProjectProgress(...args: any[]) {
    if (typeof this.service.getProjectProgress === 'function') {
      return this.service.getProjectProgress(...args)
    }
    throw new Error('專案進度分析需要 API 整合')
  }

  // 同步相關方法
  async syncTasks() {
    if (typeof this.service.syncTasks === 'function') {
      return this.service.syncTasks()
    }
    console.warn('任務同步功能在本地模式中不可用')
  }

  getSyncStatus() {
    if (typeof this.service.getSyncStatus === 'function') {
      return this.service.getSyncStatus()
    }
    return null
  }

  async clearCache() {
    if (typeof this.service.clearCache === 'function') {
      return this.service.clearCache()
    }
    console.warn('快取清除功能在本地模式中不可用')
  }
}

/**
 * 專案服務適配器
 */
class ProjectServiceAdapter {
  private get service() {
    return ServiceFactory.getProjectService(container)
  }

  // 代理所有方法到實際服務
  async createProject(...args: any[]) {
    return this.service.createProject(...args)
  }

  async updateProject(...args: any[]) {
    return this.service.updateProject(...args)
  }

  async deleteProject(...args: any[]) {
    return this.service.deleteProject(...args)
  }

  async getProjectById(...args: any[]) {
    return this.service.getProjectById(...args)
  }

  async getProjectsByOwner(...args: any[]) {
    return this.service.getProjectsByOwner(...args)
  }

  async getProjectsByUser(...args: any[]) {
    return this.service.getProjectsByUser(...args)
  }

  async addProjectMember(...args: any[]) {
    return this.service.addProjectMember(...args)
  }

  async removeProjectMember(...args: any[]) {
    return this.service.removeProjectMember(...args)
  }

  async updateMemberRole(...args: any[]) {
    return this.service.updateMemberRole(...args)
  }

  // 檢查是否有擴展功能
  hasAdvancedFeatures(): boolean {
    return configManager.isApiEnabled()
  }
}

/**
 * 用戶服務適配器
 */
class UserServiceAdapter {
  private get service() {
    return ServiceFactory.getUserService(container)
  }

  async createUser(...args: any[]) {
    return this.service.createUser(...args)
  }

  async updateUser(...args: any[]) {
    return this.service.updateUser(...args)
  }

  async deleteUser(...args: any[]) {
    return this.service.deleteUser(...args)
  }

  async getUserById(...args: any[]) {
    return this.service.getUserById(...args)
  }

  async getAllUsers(...args: any[]) {
    return this.service.getAllUsers(...args)
  }

  async getUsersByRole(...args: any[]) {
    return this.service.getUsersByRole(...args)
  }

  async authenticateUser(...args: any[]) {
    return this.service.authenticateUser(...args)
  }

  // API 專用功能（提供向下相容的預設行為）
  async findByEmail(email: string) {
    if (typeof this.service.findByEmail === 'function') {
      return this.service.findByEmail(email)
    }
    // 本地模式的回退實作
    const allUsers = await this.getAllUsers()
    return allUsers.find((user: any) => user.email === email) || null
  }

  async authenticate(email: string, password: string) {
    if (typeof this.service.authenticate === 'function') {
      return this.service.authenticate(email, password)
    }
    throw new Error('身份驗證需要 API 整合')
  }

  async updateProfile(userId: string, updates: any) {
    if (typeof this.service.updateProfile === 'function') {
      return this.service.updateProfile(userId, updates)
    }
    // 回退到基本更新
    return this.service.updateUser(userId, updates)
  }
}

/**
 * 配置服務適配器
 */
class ConfigServiceAdapter {
  get config() {
    return configManager.getConfig()
  }

  isApiEnabled(): boolean {
    return configManager.isApiEnabled()
  }

  isOfflineModeEnabled(): boolean {
    return configManager.isOfflineModeEnabled()
  }

  isSyncEnabled(): boolean {
    return configManager.isSyncEnabled()
  }

  getDataSourceStrategy(): 'local' | 'api' | 'hybrid' {
    return configManager.getDataSourceStrategy()
  }

  switchToApiMode(): void {
    configManager.switchToApiMode()
  }

  switchToLocalMode(): void {
    configManager.switchToLocalMode()
  }

  switchToHybridMode(): void {
    configManager.switchToHybridMode()
  }

  onConfigChange(callback: (config: any) => void) {
    return configManager.onConfigChange(callback)
  }

  async redetectConfig() {
    return configManager.redetectConfig()
  }
}

// 建立適配器實例
export const taskService = new TaskServiceAdapter()
export const projectService = new ProjectServiceAdapter()
export const userService = new UserServiceAdapter()
export const configService = new ConfigServiceAdapter()

/**
 * 統一服務接口
 * 提供所有服務的統一存取點
 */
export const services = {
  task: taskService,
  project: projectService,
  user: userService,
  config: configService
}

/**
 * 服務狀態檢查工具
 */
export const serviceStatus = {
  /**
   * 檢查 API 連接狀態
   */
  async checkApiConnection(): Promise<boolean> {
    try {
      const httpService = ServiceFactory.getHttpService(container)
      return await httpService.healthCheck()
    } catch (error) {
      return false
    }
  },

  /**
   * 取得所有服務狀態
   */
  getServiceStatus(): {
    api: boolean
    offline: boolean
    sync: boolean
    strategy: string
  } {
    return {
      api: configManager.isApiEnabled(),
      offline: configManager.isOfflineModeEnabled(),
      sync: configManager.isSyncEnabled(),
      strategy: configManager.getDataSourceStrategy()
    }
  },

  /**
   * 取得同步狀態
   */
  getSyncStatus() {
    const syncManager = require('../infrastructure/sync/sync-manager.service').getSyncManager()
    return syncManager ? syncManager.getSyncStatus() : null
  }
}

/**
 * 向下相容的服務註冊
 * 在全域範圍提供服務存取
 */
if (typeof window !== 'undefined') {
  // 在瀏覽器環境中註冊全域服務
  (window as any).V3TasksServices = services;
  (window as any).V3TasksServiceStatus = serviceStatus
}

/**
 * 服務初始化檢查
 */
export async function ensureServicesInitialized(): Promise<void> {
  // 確保服務容器已初始化
  if (!container.isRegistered('HttpService' as any)) {
    const { initializeServiceProviders } = await import('../infrastructure/container/service-providers')
    await initializeServiceProviders(container)
  }
}

/**
 * 服務重新初始化
 * 在配置變更後重新初始化服務
 */
export async function reinitializeServices(): Promise<void> {
  console.log('[ServiceAdapter] 重新初始化服務...')
  
  // 清除現有註冊
  container.clear()
  
  // 重新初始化
  await ensureServicesInitialized()
  
  console.log('[ServiceAdapter] 服務重新初始化完成')
}

// 監聽配置變更並重新初始化服務
configManager.onConfigChange(async (config) => {
  console.log('[ServiceAdapter] 配置已變更，重新初始化服務', {
    strategy: config.dataSource.strategy,
    apiEnabled: config.features.enableApiIntegration
  })
  
  try {
    await reinitializeServices()
  } catch (error) {
    console.error('[ServiceAdapter] 服務重新初始化失敗:', error)
  }
})