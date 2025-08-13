/**
 * 依賴注入容器系統
 * 提供服務註冊、解析和生命週期管理
 */

/**
 * 服務實例生命週期類型
 */
export type ServiceLifetime = 'singleton' | 'transient' | 'scoped'

/**
 * 服務描述符
 */
export interface ServiceDescriptor<T = unknown> {
  token: string | symbol
  factory: (container: IServiceContainer) => T
  lifetime: ServiceLifetime
  dependencies?: (string | symbol)[]
  instance?: T
}

/**
 * 服務容器介面
 */
export interface IServiceContainer {
  /**
   * 註冊服務
   */
  register<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    options?: {
      lifetime?: ServiceLifetime
      dependencies?: (string | symbol)[]
    }
  ): void

  /**
   * 註冊單例服務
   */
  registerSingleton<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies?: (string | symbol)[]
  ): void

  /**
   * 註冊暫時服務（每次請求都建立新實例）
   */
  registerTransient<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies?: (string | symbol)[]
  ): void

  /**
   * 註冊範圍服務（在同一範圍內共享實例）
   */
  registerScoped<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies?: (string | symbol)[]
  ): void

  /**
   * 解析服務實例
   */
  resolve<T>(token: string | symbol): T

  /**
   * 嘗試解析服務實例（不存在時返回 null）
   */
  tryResolve<T>(token: string | symbol): T | null

  /**
   * 檢查服務是否已註冊
   */
  isRegistered(token: string | symbol): boolean

  /**
   * 移除服務註冊
   */
  unregister(token: string | symbol): boolean

  /**
   * 清空所有註冊
   */
  clear(): void

  /**
   * 建立子容器（範圍容器）
   */
  createScope(): IServiceContainer

  /**
   * 釋放範圍容器資源
   */
  dispose?(): void
}

/**
 * 容器錯誤基類
 */
export abstract class ContainerError extends Error {
  constructor(message: string, public readonly token: string | symbol) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * 服務未註冊錯誤
 */
export class ServiceNotRegisteredError extends ContainerError {
  constructor(token: string | symbol) {
    super(`服務未註冊: ${String(token)}`, token)
  }
}

/**
 * 循環依賴錯誤
 */
export class CircularDependencyError extends ContainerError {
  constructor(token: string | symbol, dependencyChain: (string | symbol)[]) {
    super(
      `檢測到循環依賴: ${dependencyChain.map(String).join(' -> ')} -> ${String(token)}`,
      token
    )
  }
}

/**
 * 服務容器實作
 */
export class ServiceContainer implements IServiceContainer {
  private readonly services = new Map<string | symbol, ServiceDescriptor>()
  private readonly scopedInstances = new Map<string | symbol, unknown>()
  private readonly resolutionStack: (string | symbol)[] = []
  private readonly parent?: ServiceContainer
  private readonly isScope: boolean

  constructor(parent?: ServiceContainer) {
    this.parent = parent
    this.isScope = !!parent
  }

  /**
   * 註冊服務
   */
  register<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    options: {
      lifetime?: ServiceLifetime
      dependencies?: (string | symbol)[]
    } = {}
  ): void {
    const { lifetime = 'singleton', dependencies = [] } = options

    this.services.set(token, {
      token,
      factory,
      lifetime,
      dependencies
    })
  }

  /**
   * 註冊單例服務
   */
  registerSingleton<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies: (string | symbol)[] = []
  ): void {
    this.register(token, factory, { lifetime: 'singleton', dependencies })
  }

  /**
   * 註冊暫時服務
   */
  registerTransient<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies: (string | symbol)[] = []
  ): void {
    this.register(token, factory, { lifetime: 'transient', dependencies })
  }

  /**
   * 註冊範圍服務
   */
  registerScoped<T>(
    token: string | symbol,
    factory: (container: IServiceContainer) => T,
    dependencies: (string | symbol)[] = []
  ): void {
    this.register(token, factory, { lifetime: 'scoped', dependencies })
  }

  /**
   * 解析服務實例
   */
  resolve<T>(token: string | symbol): T {
    // 檢查循環依賴
    if (this.resolutionStack.includes(token)) {
      throw new CircularDependencyError(token, [...this.resolutionStack])
    }

    // 查找服務描述符
    const descriptor = this.findDescriptor(token)
    if (!descriptor) {
      throw new ServiceNotRegisteredError(token)
    }

    // 根據生命週期決定如何建立實例
    switch (descriptor.lifetime) {
      case 'singleton':
        return this.resolveSingleton<T>(descriptor)
      case 'transient':
        return this.resolveTransient<T>(descriptor)
      case 'scoped':
        return this.resolveScoped<T>(descriptor)
      default:
        throw new Error(`未知的服務生命週期: ${descriptor.lifetime}`)
    }
  }

  /**
   * 嘗試解析服務實例
   */
  tryResolve<T>(token: string | symbol): T | null {
    try {
      return this.resolve<T>(token)
    } catch (error) {
      if (error instanceof ServiceNotRegisteredError) {
        return null
      }
      throw error
    }
  }

  /**
   * 檢查服務是否已註冊
   */
  isRegistered(token: string | symbol): boolean {
    return this.findDescriptor(token) !== null
  }

  /**
   * 移除服務註冊
   */
  unregister(token: string | symbol): boolean {
    const hasService = this.services.has(token)
    if (hasService) {
      this.services.delete(token)
      this.scopedInstances.delete(token)
    }
    return hasService
  }

  /**
   * 清空所有註冊
   */
  clear(): void {
    this.services.clear()
    this.scopedInstances.clear()
  }

  /**
   * 建立子容器（範圍容器）
   */
  createScope(): IServiceContainer {
    return new ServiceContainer(this)
  }

  /**
   * 釋放範圍容器資源
   */
  dispose(): void {
    if (this.isScope) {
      this.scopedInstances.clear()
    }
  }

  /**
   * 查找服務描述符（包括父容器）
   */
  private findDescriptor(token: string | symbol): ServiceDescriptor | null {
    const descriptor = this.services.get(token)
    if (descriptor) {
      return descriptor
    }

    // 在父容器中查找
    return this.parent?.findDescriptor(token) || null
  }

  /**
   * 解析單例服務
   */
  private resolveSingleton<T>(descriptor: ServiceDescriptor): T {
    // 單例在根容器中存儲
    const rootContainer = this.getRootContainer()
    const rootDescriptor = rootContainer.services.get(descriptor.token)
    
    if (rootDescriptor && rootDescriptor.instance) {
      return rootDescriptor.instance as T
    }

    const instance = this.createInstance<T>(descriptor)
    
    if (rootDescriptor) {
      rootDescriptor.instance = instance
    }

    return instance
  }

  /**
   * 解析暫時服務
   */
  private resolveTransient<T>(descriptor: ServiceDescriptor): T {
    return this.createInstance<T>(descriptor)
  }

  /**
   * 解析範圍服務
   */
  private resolveScoped<T>(descriptor: ServiceDescriptor): T {
    const existingInstance = this.scopedInstances.get(descriptor.token)
    if (existingInstance) {
      return existingInstance as T
    }

    const instance = this.createInstance<T>(descriptor)
    this.scopedInstances.set(descriptor.token, instance)
    return instance
  }

  /**
   * 建立服務實例
   */
  private createInstance<T>(descriptor: ServiceDescriptor): T {
    this.resolutionStack.push(descriptor.token)
    
    try {
      return descriptor.factory(this) as T
    } finally {
      this.resolutionStack.pop()
    }
  }

  /**
   * 取得根容器
   */
  private getRootContainer(): ServiceContainer {
    let current: ServiceContainer = this
    while (current.parent) {
      current = current.parent
    }
    return current
  }
}

/**
 * 全域服務容器實例
 */
export const container = new ServiceContainer()

/**
 * 服務令牌常數
 */
export const SERVICE_TOKENS = {
  // Domain Services
  TASK_SERVICE: Symbol('TaskService'),
  PROJECT_SERVICE: Symbol('ProjectService'),
  USER_SERVICE: Symbol('UserService'),
  STATISTICS_SERVICE: Symbol('StatisticsService'),

  // API Services
  TASK_API_SERVICE: Symbol('TaskApiService'),
  PROJECT_API_SERVICE: Symbol('ProjectApiService'),
  USER_API_SERVICE: Symbol('UserApiService'),

  // Application Services
  COLUMN_CONFIG_SERVICE: Symbol('ColumnConfigService'),
  VIEW_CONFIG_SERVICE: Symbol('ViewConfigService'),

  // Infrastructure Services
  EVENT_BUS: Symbol('EventBus'),
  DATABASE_SERVICE: Symbol('DatabaseService'),
  HTTP_SERVICE: Symbol('HttpService'),
  CONFIG_MANAGER: Symbol('ConfigManager'),

  // Repositories
  TASK_REPOSITORY: Symbol('TaskRepository'),
  PROJECT_REPOSITORY: Symbol('ProjectRepository'),
  USER_REPOSITORY: Symbol('UserRepository'),
  VIEW_CONFIG_REPOSITORY: Symbol('ViewConfigRepository'),
  CUSTOM_FIELD_REPOSITORY: Symbol('CustomFieldRepository'),

  // API Repositories
  TASK_API_REPOSITORY: Symbol('TaskApiRepository'),
  PROJECT_API_REPOSITORY: Symbol('ProjectApiRepository'),
  USER_API_REPOSITORY: Symbol('UserApiRepository')
} as const

export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS]