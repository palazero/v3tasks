/**
 * 服務模組統一入口
 * 提供向下相容的服務存取方式
 */

// 新的 API 整合服務（推薦使用）
export * from './adapters/service-adapter'

// 配置管理
export { configManager, getConfig, isApiEnabled, isOfflineModeEnabled } from './infrastructure/config/app.config'

// 錯誤處理
export * from './infrastructure/http/api.errors'

// 同步管理
export { getSyncManager } from './infrastructure/sync/sync-manager.service'

// 服務提供者工具
export { 
  ServiceFactory, 
  switchToApiMode, 
  switchToLocalMode, 
  switchToHybridMode,
  checkApiAvailability 
} from './infrastructure/container/service-providers'

// 原有的服務（向下相容）
export { getTaskRepository, getProjectRepository, getUserRepository, getViewRepository } from './repositories'

// 類型定義
export type { AppConfig } from './infrastructure/config/app.config'
export type { SyncResult, SyncStatus, SyncOptions } from './infrastructure/sync/sync-manager.service'
export type { HttpRequestConfig, HttpResponse } from './infrastructure/http/http.service'

/**
 * 快速存取現有服務的方法（向下相容）
 */
import { services } from './adapters/service-adapter'

// 導出適配器實例以保持向下相容性
export const taskService = services.task
export const projectService = services.project
export const userService = services.user
export const configService = services.config

/**
 * 服務初始化函數
 */
export { ensureServicesInitialized, reinitializeServices } from './adapters/service-adapter'

/**
 * 預設導出統一服務對象
 */
export default services