/**
 * 服務適配器
 * 提供統一介面來切換本地和 API 服務實作
 */

import type { IUserService } from '../domain/interfaces/IUserService'
import type { IProjectService } from '../domain/interfaces/IProjectService'
import type { ITaskService } from '../domain/interfaces/ITaskService'

// 本地服務實作
import { UserService } from '../domain/user.service'
import { ProjectService } from '../domain/project.service'
import { TaskService } from '../domain/task.service'

// API 服務實作
import { UserApiDomainService } from '../domain/user-api.service'
import { ProjectApiDomainService } from '../domain/project-api.service'
// import { TaskApiDomainService } from '../domain/task-api.service' // 待實作

/**
 * 服務模式配置
 */
type ServiceMode = 'local' | 'api'

/**
 * 服務配置介面
 */
interface ServiceConfig {
  mode: ServiceMode
  apiBaseUrl?: string
  enableMockData?: boolean
}

/**
 * 服務適配器類別
 */
class ServiceAdapter {
  private config: ServiceConfig
  private userService: IUserService | null = null
  private projectService: IProjectService | null = null
  private taskService: ITaskService | null = null

  constructor(config: ServiceConfig) {
    this.config = config
  }

  /**
   * 取得用戶服務實例
   */
  getUserService(): IUserService {
    if (!this.userService) {
      if (this.config.mode === 'api') {
        this.userService = new UserApiDomainService()
      } else {
        this.userService = new UserService()
      }
    }
    return this.userService
  }

  /**
   * 取得專案服務實例
   */
  getProjectService(): IProjectService {
    if (!this.projectService) {
      if (this.config.mode === 'api') {
        this.projectService = new ProjectApiDomainService()
      } else {
        this.projectService = new ProjectService()
      }
    }
    return this.projectService
  }

  /**
   * 取得任務服務實例
   */
  getTaskService(): ITaskService {
    if (!this.taskService) {
      if (this.config.mode === 'api') {
        // TODO: 實作 TaskApiDomainService
        // this.taskService = new TaskApiDomainService()
        console.warn('Task API service not implemented yet, falling back to local service')
        this.taskService = new TaskService()
      } else {
        this.taskService = new TaskService()
      }
    }
    return this.taskService
  }

  /**
   * 更新服務配置
   */
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 清除快取的服務實例，強制重新創建
    this.userService = null
    this.projectService = null
    this.taskService = null
  }

  /**
   * 取得當前配置
   */
  getConfig(): ServiceConfig {
    return { ...this.config }
  }

  /**
   * 檢查是否使用 API 模式
   */
  isApiMode(): boolean {
    return this.config.mode === 'api'
  }

  /**
   * 檢查是否使用本地模式
   */
  isLocalMode(): boolean {
    return this.config.mode === 'local'
  }
}

// 預設配置
const defaultConfig: ServiceConfig = {
  mode: (import.meta.env.VITE_SERVICE_MODE as ServiceMode) || 'api',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true'
}

// 除錯：顯示配置資訊
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  console.log('Service Adapter Configuration:', {
    mode: defaultConfig.mode,
    apiBaseUrl: defaultConfig.apiBaseUrl,
    enableMockData: defaultConfig.enableMockData,
    envVars: {
      VITE_SERVICE_MODE: import.meta.env.VITE_SERVICE_MODE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA,
      VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE
    }
  })
}

// 全域服務適配器實例
const serviceAdapter = new ServiceAdapter(defaultConfig)

/**
 * 取得用戶服務
 */
export function getUserService(): IUserService {
  return serviceAdapter.getUserService()
}

/**
 * 取得專案服務
 */
export function getProjectService(): IProjectService {
  return serviceAdapter.getProjectService()
}

/**
 * 取得任務服務
 */
export function getTaskService(): ITaskService {
  return serviceAdapter.getTaskService()
}

/**
 * 更新服務配置
 */
export function updateServiceConfig(config: Partial<ServiceConfig>): void {
  serviceAdapter.updateConfig(config)
}

/**
 * 取得服務配置
 */
export function getServiceConfig(): ServiceConfig {
  return serviceAdapter.getConfig()
}

/**
 * 切換到 API 模式
 */
export function switchToApiMode(): void {
  serviceAdapter.updateConfig({ mode: 'api' })
}

/**
 * 切換到本地模式
 */
export function switchToLocalMode(): void {
  serviceAdapter.updateConfig({ mode: 'local' })
}

export { serviceAdapter }
export type { ServiceConfig, ServiceMode }