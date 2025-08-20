/**
 * 服務提供者
 * 負責註冊各層的服務到依賴注入容器
 */

import type { IServiceContainer } from './service-container'
import { SERVICE_TOKENS } from './service-container'
import { configManager } from '../config/app.config'

// HTTP & Config Services
import { createHttpService } from '../http/http.service'

// Domain Services
import { TaskService } from '../../domain/task.service'
import { TaskApiService } from '../../domain/task-api.service'
import { ProjectService } from '../../domain/project.service'
import { UserService } from '../../domain/user.service'
import { statisticsService } from '../../domain/statistics.service'

// Application Services
import { ColumnConfigService } from '../../application/column-config.service'

// Infrastructure Services
import { eventBus } from '../events/event-bus.service'

// API Repositories
import { TaskApiRepository } from '../../repositories/task-api.repository'
import { ProjectApiRepository } from '../../repositories/project-api.repository'
import { UserApiRepository } from '../../repositories/user-api.repository'

/**
 * 服務提供者介面
 */
export interface IServiceProvider {
  register(container: IServiceContainer): void
}

/**
 * 領域服務提供者
 */
export class DomainServiceProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // 任務服務（本地版本）
    container.registerSingleton(
      SERVICE_TOKENS.TASK_SERVICE,
      () => new TaskService(),
      []
    )

    // 任務 API 服務（增強版本）
    container.registerSingleton(
      SERVICE_TOKENS.TASK_API_SERVICE,
      (container) => {
        const httpService = container.resolve(SERVICE_TOKENS.HTTP_SERVICE)
        return new TaskApiService(httpService)
      },
      [SERVICE_TOKENS.HTTP_SERVICE]
    )

    // 專案服務
    container.registerSingleton(
      SERVICE_TOKENS.PROJECT_SERVICE,
      () => new ProjectService(),
      []
    )

    // 用戶服務
    container.registerSingleton(
      SERVICE_TOKENS.USER_SERVICE,
      () => new UserService(),
      []
    )

    // 統計服務
    container.registerSingleton(
      SERVICE_TOKENS.STATISTICS_SERVICE,
      () => statisticsService,
      []
    )
  }
}

/**
 * 應用服務提供者
 */
export class ApplicationServiceProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // 欄位配置服務
    container.registerSingleton(
      SERVICE_TOKENS.COLUMN_CONFIG_SERVICE,
      () => new ColumnConfigService(),
      []
    )
  }
}

/**
 * 基礎設施服務提供者
 */
export class InfrastructureServiceProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // 配置管理器
    container.registerSingleton(
      SERVICE_TOKENS.CONFIG_MANAGER,
      () => configManager,
      []
    )

    // HTTP 服務
    container.registerSingleton(
      SERVICE_TOKENS.HTTP_SERVICE,
      () => {
        const config = configManager.getConfig()
        return createHttpService({
          baseURL: config.api.baseUrl,
          timeout: config.api.timeout,
          retryAttempts: config.api.retryAttempts,
          retryDelay: config.api.retryDelay
        })
      },
      [SERVICE_TOKENS.CONFIG_MANAGER]
    )

    // 事件匯流排服務
    container.registerSingleton(
      SERVICE_TOKENS.EVENT_BUS,
      () => eventBus,
      []
    )
  }
}

/**
 * 儲存庫服務提供者
 */
export class RepositoryServiceProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // API Repositories
    container.registerSingleton(
      SERVICE_TOKENS.TASK_API_REPOSITORY,
      (container) => {
        const httpService = container.resolve(SERVICE_TOKENS.HTTP_SERVICE)
        return new TaskApiRepository(httpService)
      },
      [SERVICE_TOKENS.HTTP_SERVICE]
    )

    container.registerSingleton(
      SERVICE_TOKENS.PROJECT_API_REPOSITORY,
      (container) => {
        const httpService = container.resolve(SERVICE_TOKENS.HTTP_SERVICE)
        return new ProjectApiRepository(httpService)
      },
      [SERVICE_TOKENS.HTTP_SERVICE]
    )

    container.registerSingleton(
      SERVICE_TOKENS.USER_API_REPOSITORY,
      (container) => {
        const httpService = container.resolve(SERVICE_TOKENS.HTTP_SERVICE)
        return new UserApiRepository(httpService)
      },
      [SERVICE_TOKENS.HTTP_SERVICE]
    )
  }
}

/**
 * 合成服務提供者
 * 註冊所有層的服務
 */
export class CompositeServiceProvider implements IServiceProvider {
  private readonly providers: IServiceProvider[]

  constructor() {
    this.providers = [
      new DomainServiceProvider(),
      new ApplicationServiceProvider(),
      new InfrastructureServiceProvider(),
      new RepositoryServiceProvider()
    ]
  }

  register(container: IServiceContainer): void {
    for (const provider of this.providers) {
      provider.register(container)
    }
  }
}

/**
 * 服務容器配置函數
 */
export function configureServices(container: IServiceContainer): void {
  const compositeProvider = new CompositeServiceProvider()
  compositeProvider.register(container)
}

/**
 * 服務工廠：根據配置動態選擇服務實作
 */
export class ServiceFactory {
  /**
   * 取得任務服務（自動選擇 API 或本地實作）
   */
  static getTaskService(container: IServiceContainer) {
    const config = configManager.getConfig()
    
    if (config.features.enableApiIntegration) {
      return container.resolve(SERVICE_TOKENS.TASK_API_SERVICE)
    } else {
      return container.resolve(SERVICE_TOKENS.TASK_SERVICE)
    }
  }

  /**
   * 取得專案服務
   */
  static getProjectService(container: IServiceContainer) {
    // 目前只有本地版本
    return container.resolve(SERVICE_TOKENS.PROJECT_SERVICE)
  }

  /**
   * 取得用戶服務
   */
  static getUserService(container: IServiceContainer) {
    // 目前只有本地版本
    return container.resolve(SERVICE_TOKENS.USER_SERVICE)
  }

  /**
   * 取得 HTTP 服務
   */
  static getHttpService(container: IServiceContainer) {
    return container.resolve(SERVICE_TOKENS.HTTP_SERVICE)
  }

  /**
   * 取得配置管理器
   */
  static getConfigManager(container: IServiceContainer) {
    return container.resolve(SERVICE_TOKENS.CONFIG_MANAGER)
  }
}

/**
 * 切換到 API 模式
 */
export function switchToApiMode(): void {
  configManager.switchToApiMode()
  console.log('[ServiceProvider] 已切換到 API 模式')
}

/**
 * 切換到本地模式
 */
export function switchToLocalMode(): void {
  configManager.switchToLocalMode()
  console.log('[ServiceProvider] 已切換到本地模式')
}

/**
 * 切換到混合模式
 */
export function switchToHybridMode(): void {
  configManager.switchToHybridMode()
  console.log('[ServiceProvider] 已切換到混合模式')
}

/**
 * 檢查 API 是否可用
 */
export async function checkApiAvailability(container: IServiceContainer): Promise<boolean> {
  try {
    const httpService = ServiceFactory.getHttpService(container)
    return await httpService.healthCheck()
  } catch (error) {
    console.warn('[ServiceProvider] API 健康檢查失敗:', error)
    return false
  }
}

/**
 * 初始化所有服務提供者
 */
export async function initializeServiceProviders(container: IServiceContainer): Promise<void> {
  console.log('[ServiceProvider] 開始初始化服務提供者...')

  // 註冊所有服務
  const compositeProvider = new CompositeServiceProvider()
  compositeProvider.register(container)

  // 初始化配置
  await configManager.initialize()

  // 檢查 API 可用性
  const apiAvailable = await checkApiAvailability(container)
  if (!apiAvailable && configManager.isApiEnabled()) {
    console.warn('[ServiceProvider] API 不可用，自動切換到本地模式')
    configManager.switchToLocalMode()
  }

  console.log('[ServiceProvider] 服務提供者初始化完成', {
    strategy: configManager.getDataSourceStrategy(),
    apiEnabled: configManager.isApiEnabled(),
    offlineEnabled: configManager.isOfflineModeEnabled()
  })
}

/**
 * 預設服務提供者實例
 */
export const serviceProviders = {
  domain: new DomainServiceProvider(),
  application: new ApplicationServiceProvider(),
  infrastructure: new InfrastructureServiceProvider(),
  repository: new RepositoryServiceProvider(),
  composite: new CompositeServiceProvider()
}