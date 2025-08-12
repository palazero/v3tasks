/**
 * 服務依賴注入系統啟動檔案
 * 初始化並配置服務容器
 */

import { boot } from 'quasar/wrappers'
import { container, SERVICE_TOKENS } from '@/services/infrastructure/container/service-container'
import { configureServices } from '@/services/infrastructure/container/service-providers'
import { provideServices } from '@/composables/useServices'

export default boot(({ app }) => {
  // 配置服務容器，註冊所有服務
  configureServices(container)
  
  // 提供服務容器到 Vue 應用
  app.provide('ServiceContainer', container)
  
  // 也可以使用 composable 方式提供
  provideServices(container)
  
  // 開發環境下顯示服務註冊信息
  if (process.env.NODE_ENV === 'development') {
    console.group('🔧 依賴注入系統已初始化')
    console.log('服務容器:', container)
    
    // 檢查核心服務是否已註冊
    const coreServices = [
      'TASK_SERVICE',
      'PROJECT_SERVICE', 
      'USER_SERVICE',
      'EVENT_BUS',
      'COLUMN_CONFIG_SERVICE'
    ]
    
    console.log('核心服務註冊狀況:')
    coreServices.forEach(serviceName => {
      const token = (SERVICE_TOKENS as any)[serviceName]
      const isRegistered = container.isRegistered(token)
      console.log(`  ${serviceName}: ${isRegistered ? '✅' : '❌'}`)
    })
    
    console.groupEnd()
  }
})