/**
 * Vue Composable for Dependency Injection
 * 提供在 Vue 組件中使用依賴注入服務的便利方法
 */

import { inject, provide } from 'vue'
import type { IServiceContainer } from '@/services/infrastructure/container/service-container'
import { container, SERVICE_TOKENS } from '@/services/infrastructure/container/service-container'
import type { ITaskService } from '@/services/domain/interfaces/ITaskService'
import type { IProjectService } from '@/services/domain/interfaces/IProjectService'
import type { IUserService } from '@/services/domain/interfaces/IUserService'
import type { IColumnConfigService } from '@/services/application/interfaces/IColumnConfigService'
import type { IEventBus } from '@/services/infrastructure/interfaces/IEventBus'

/**
 * 服務容器注入鍵
 */
export const SERVICE_CONTAINER_KEY = Symbol('ServiceContainer')

/**
 * 提供服務容器到 Vue 應用
 */
export function provideServices(serviceContainer: IServiceContainer = container): void {
  provide(SERVICE_CONTAINER_KEY, serviceContainer)
}

/**
 * 使用服務容器
 */
export function useServiceContainer(): IServiceContainer {
  const serviceContainer = inject<IServiceContainer>(SERVICE_CONTAINER_KEY)
  
  if (!serviceContainer) {
    // 如果沒有注入的容器，使用全域預設容器
    console.warn('服務容器未注入，使用全域預設容器')
    return container
  }
  
  return serviceContainer
}

/**
 * 使用任務服務
 */
export function useTaskService(): ITaskService {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<ITaskService>(SERVICE_TOKENS.TASK_SERVICE)
}

/**
 * 使用專案服務
 */
export function useProjectService(): IProjectService {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<IProjectService>(SERVICE_TOKENS.PROJECT_SERVICE)
}

/**
 * 使用用戶服務
 */
export function useUserService(): IUserService {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<IUserService>(SERVICE_TOKENS.USER_SERVICE)
}

/**
 * 使用欄位配置服務
 */
export function useColumnConfigService(): IColumnConfigService {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<IColumnConfigService>(SERVICE_TOKENS.COLUMN_CONFIG_SERVICE)
}

/**
 * 使用事件匯流排服務
 */
export function useEventBus(): IEventBus {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<IEventBus>(SERVICE_TOKENS.EVENT_BUS)
}

/**
 * 使用統計服務
 */
export function useStatisticsService() {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve(SERVICE_TOKENS.STATISTICS_SERVICE)
}

/**
 * 通用服務解析器
 */
export function useService<T>(token: string | symbol): T {
  const serviceContainer = useServiceContainer()
  return serviceContainer.resolve<T>(token)
}

/**
 * 安全的服務解析器（不存在時返回 null）
 */
export function tryUseService<T>(token: string | symbol): T | null {
  const serviceContainer = useServiceContainer()
  return serviceContainer.tryResolve<T>(token)
}

/**
 * 創建範圍服務容器的 Composable
 */
export function useScopedServices() {
  const parentContainer = useServiceContainer()
  const scopedContainer = parentContainer.createScope()
  
  // 提供範圍容器
  provide(SERVICE_CONTAINER_KEY, scopedContainer)
  
  return {
    container: scopedContainer,
    dispose: () => scopedContainer.dispose?.()
  }
}

/**
 * 服務可用性檢查
 */
export function useServiceAvailability() {
  const serviceContainer = useServiceContainer()
  
  return {
    /**
     * 檢查服務是否已註冊
     */
    isServiceRegistered: (token: string | symbol): boolean => {
      return serviceContainer.isRegistered(token)
    },
    
    /**
     * 檢查核心服務是否都已註冊
     */
    areAllCoreServicesRegistered: (): boolean => {
      const coreServices = [
        SERVICE_TOKENS.TASK_SERVICE,
        SERVICE_TOKENS.PROJECT_SERVICE,
        SERVICE_TOKENS.USER_SERVICE,
        SERVICE_TOKENS.EVENT_BUS
      ]
      
      return coreServices.every(token => serviceContainer.isRegistered(token))
    },
    
    /**
     * 取得已註冊的服務列表
     */
    getRegisteredServices: (): string[] => {
      const tokens = Object.entries(SERVICE_TOKENS)
      return tokens
        .filter(([, token]) => serviceContainer.isRegistered(token))
        .map(([name]) => name)
    }
  }
}