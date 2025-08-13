/**
 * API 整合啟動檔案
 * 在應用程式啟動時初始化 API 相關服務
 */

import { boot } from 'quasar/wrappers'
import { container } from 'src/services/infrastructure/container/service-container'
import { initializeServiceProviders, ServiceFactory } from 'src/services/infrastructure/container/service-providers'
import { createSyncManager, setSyncManager } from 'src/services/infrastructure/sync/sync-manager.service'
import { configManager } from 'src/services/infrastructure/config/app.config'

export default boot(async ({ app, router }) => {
  console.log('[Boot] 初始化 API 整合服務...')

  try {
    // 初始化服務提供者
    await initializeServiceProviders(container)

    // 如果啟用 API 整合，設定同步管理器
    if (configManager.isApiEnabled()) {
      const httpService = ServiceFactory.getHttpService(container)
      const syncManager = createSyncManager(httpService)

      // 註冊 API Repositories 到同步管理器
      const taskApiRepo = container.resolve('TaskApiRepository' as any)
      const projectApiRepo = container.resolve('ProjectApiRepository' as any)
      const userApiRepo = container.resolve('UserApiRepository' as any)

      syncManager.registerRepository('tasks', taskApiRepo)
      syncManager.registerRepository('projects', projectApiRepo)
      syncManager.registerRepository('users', userApiRepo)

      // 設定全域同步管理器
      setSyncManager(syncManager)

      console.log('[Boot] 同步管理器已初始化')

      // 監聽網路狀態變化
      window.addEventListener('online', () => {
        console.log('[Boot] 網路已連接，觸發同步')
        syncManager.triggerSync().catch(error => {
          console.warn('[Boot] 網路恢復同步失敗:', error)
        })
      })

      window.addEventListener('offline', () => {
        console.log('[Boot] 網路已斷線，切換到離線模式')
      })
    }

    // 在 Vue 實例上提供服務存取
    app.config.globalProperties.$services = {
      getTaskService: () => ServiceFactory.getTaskService(container),
      getProjectService: () => ServiceFactory.getProjectService(container),
      getUserService: () => ServiceFactory.getUserService(container),
      getHttpService: () => ServiceFactory.getHttpService(container),
      getConfigManager: () => configManager
    }

    // 在路由器上提供配置資訊
    router.beforeEach((to, from, next) => {
      // 可以在這裡添加基於配置的路由守衛邏輯
      // 例如：如果 API 不可用，重定向到離線頁面
      next()
    })

    console.log('[Boot] API 整合服務初始化完成', {
      strategy: configManager.getDataSourceStrategy(),
      apiEnabled: configManager.isApiEnabled(),
      syncEnabled: configManager.isSyncEnabled()
    })

  } catch (error) {
    console.error('[Boot] API 整合服務初始化失敗:', error)
    
    // 發生錯誤時自動切換到本地模式
    configManager.switchToLocalMode()
    
    console.warn('[Boot] 已自動切換到本地模式')
  }
})

// 擴展 Vue 實例類型
declare module 'vue' {
  interface ComponentCustomProperties {
    $services: {
      getTaskService: () => any
      getProjectService: () => any
      getUserService: () => any
      getHttpService: () => any
      getConfigManager: () => any
    }
  }
}