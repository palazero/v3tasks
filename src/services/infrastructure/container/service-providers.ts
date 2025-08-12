/**
 * 服務提供者
 * 負責註冊各層的服務到依賴注入容器
 */

import type { IServiceContainer } from './service-container'
import { SERVICE_TOKENS } from './service-container'

// Domain Services
import { TaskService } from '../../domain/task.service'
import { ProjectService } from '../../domain/project.service'
import { UserService } from '../../domain/user.service'
import { statisticsService } from '../../domain/statistics.service'

// Application Services
import { ColumnConfigService } from '../../application/column-config.service'

// Infrastructure Services
import { eventBus } from '../events/event-bus.service'

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
    // 任務服務
    container.registerSingleton(
      SERVICE_TOKENS.TASK_SERVICE,
      () => new TaskService(),
      []
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
    // 這裡可以註冊具體的 Repository 實例
    // 目前由於 Repository 是透過 Dexie 直接使用，暫時不需要註冊
    // 未來如果需要抽象 Repository 可以在這裡註冊
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
 * 預設服務提供者實例
 */
export const serviceProviders = {
  domain: new DomainServiceProvider(),
  application: new ApplicationServiceProvider(),
  infrastructure: new InfrastructureServiceProvider(),
  repository: new RepositoryServiceProvider(),
  composite: new CompositeServiceProvider()
}