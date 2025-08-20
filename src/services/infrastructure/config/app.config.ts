/**
 * 應用程式配置管理
 * 統一管理環境變數與應用程式設定
 */

export interface AppConfig {
  // API 設定
  api: {
    baseUrl: string
    timeout: number
    retryAttempts: number
    retryDelay: number
  }
  
  // 資料源策略
  dataSource: {
    strategy: 'local' | 'api' | 'hybrid'
    enableOffline: boolean
    cacheTimeout: number
    syncInterval: number
  }
  
  // 應用程式設定
  app: {
    name: string
    version: string
    environment: 'development' | 'production' | 'testing'
  }
  
  // 功能開關
  features: {
    enableApiIntegration: boolean
    enableOfflineMode: boolean
    enableSync: boolean
    enableErrorTracking: boolean
  }
}

/**
 * 預設配置
 */
const defaultConfig: AppConfig = {
  api: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  dataSource: {
    strategy: 'hybrid',
    enableOffline: true,
    cacheTimeout: 5 * 60 * 1000,  // 5 分鐘
    syncInterval: 30 * 1000        // 30 秒
  },
  
  app: {
    name: 'V3Tasks',
    version: '1.0.0',
    environment: 'development'
  },
  
  features: {
    enableApiIntegration: true,
    enableOfflineMode: true,
    enableSync: true,
    enableErrorTracking: false
  }
}

/**
 * 從環境變數建構配置
 */
function buildConfigFromEnv(): AppConfig {
  const config: AppConfig = { ...defaultConfig }

  // API 設定
  if (process.env.API_BASE_URL) {
    config.api.baseUrl = process.env.API_BASE_URL
  }
  if (process.env.API_TIMEOUT) {
    config.api.timeout = parseInt(process.env.API_TIMEOUT, 10)
  }
  if (process.env.API_RETRY_ATTEMPTS) {
    config.api.retryAttempts = parseInt(process.env.API_RETRY_ATTEMPTS, 10)
  }

  // 資料源策略
  if (process.env.DATA_SOURCE_STRATEGY) {
    const strategy = process.env.DATA_SOURCE_STRATEGY as 'local' | 'api' | 'hybrid'
    if (['local', 'api', 'hybrid'].includes(strategy)) {
      config.dataSource.strategy = strategy
    }
  }

  // 功能開關
  if (process.env.ENABLE_API_INTEGRATION !== undefined) {
    config.features.enableApiIntegration = process.env.ENABLE_API_INTEGRATION === 'true'
  }
  if (process.env.ENABLE_OFFLINE_MODE !== undefined) {
    config.features.enableOfflineMode = process.env.ENABLE_OFFLINE_MODE === 'true'
  }
  if (process.env.ENABLE_SYNC !== undefined) {
    config.features.enableSync = process.env.ENABLE_SYNC === 'true'
  }

  // 環境檢測
  if (process.env.NODE_ENV) {
    const env = process.env.NODE_ENV as 'development' | 'production' | 'testing'
    config.app.environment = env
  }

  return config
}

/**
 * 執行時配置檢測
 */
async function detectRuntimeConfig(config: AppConfig): Promise<AppConfig> {
  const runtimeConfig = { ...config }

  // 檢測 API 可用性
  if (runtimeConfig.features.enableApiIntegration) {
    try {
      const response = await fetch(`${runtimeConfig.api.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      })
      
      if (!response.ok) {
        console.warn('[Config] API 健康檢查失敗，切換到本地模式')
        runtimeConfig.dataSource.strategy = 'local'
        runtimeConfig.features.enableApiIntegration = false
      }
    } catch (error) {
      console.warn('[Config] 無法連接到 API，切換到本地模式:', error)
      runtimeConfig.dataSource.strategy = 'local'
      runtimeConfig.features.enableApiIntegration = false
    }
  }

  // 檢測本地儲存可用性
  try {
    localStorage.setItem('__config_test__', 'test')
    localStorage.removeItem('__config_test__')
  } catch (error) {
    console.warn('[Config] LocalStorage 不可用')
    runtimeConfig.features.enableOfflineMode = false
  }

  // 檢測 IndexedDB 可用性
  if (!('indexedDB' in window)) {
    console.warn('[Config] IndexedDB 不可用')
    runtimeConfig.features.enableOfflineMode = false
  }

  return runtimeConfig
}

/**
 * 配置管理類別
 */
export class ConfigManager {
  private static instance: ConfigManager
  private config: AppConfig
  private listeners: Array<(config: AppConfig) => void> = []

  private constructor() {
    this.config = buildConfigFromEnv()
  }

  /**
   * 取得單例實例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * 取得當前配置
   */
  getConfig(): AppConfig {
    return { ...this.config }
  }

  /**
   * 初始化配置（包含執行時檢測）
   */
  async initialize(): Promise<AppConfig> {
    this.config = await detectRuntimeConfig(this.config)
    this.notifyListeners()
    
    console.log('[Config] 應用程式配置已初始化:', {
      dataSource: this.config.dataSource.strategy,
      apiEnabled: this.config.features.enableApiIntegration,
      offlineEnabled: this.config.features.enableOfflineMode,
      environment: this.config.app.environment
    })

    return this.getConfig()
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.mergeDeep(this.config, updates)
    this.notifyListeners()
    
    console.log('[Config] 配置已更新:', updates)
  }

  /**
   * 監聽配置變更
   */
  onConfigChange(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener)
    
    // 返回取消監聽的函數
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 檢查 API 是否可用
   */
  isApiEnabled(): boolean {
    return this.config.features.enableApiIntegration && 
           this.config.dataSource.strategy !== 'local'
  }

  /**
   * 檢查離線模式是否啟用
   */
  isOfflineModeEnabled(): boolean {
    return this.config.features.enableOfflineMode
  }

  /**
   * 檢查同步是否啟用
   */
  isSyncEnabled(): boolean {
    return this.config.features.enableSync && this.isApiEnabled()
  }

  /**
   * 取得資料源策略
   */
  getDataSourceStrategy(): 'local' | 'api' | 'hybrid' {
    return this.config.dataSource.strategy
  }

  /**
   * 強制切換到本地模式
   */
  switchToLocalMode(): void {
    this.updateConfig({
      dataSource: { ...this.config.dataSource, strategy: 'local' },
      features: { ...this.config.features, enableApiIntegration: false }
    })
  }

  /**
   * 強制切換到 API 模式
   */
  switchToApiMode(): void {
    this.updateConfig({
      dataSource: { ...this.config.dataSource, strategy: 'api' },
      features: { ...this.config.features, enableApiIntegration: true }
    })
  }

  /**
   * 切換到混合模式
   */
  switchToHybridMode(): void {
    this.updateConfig({
      dataSource: { ...this.config.dataSource, strategy: 'hybrid' },
      features: { ...this.config.features, enableApiIntegration: true }
    })
  }

  /**
   * 重新檢測配置
   */
  async redetectConfig(): Promise<AppConfig> {
    this.config = await detectRuntimeConfig(this.config)
    this.notifyListeners()
    return this.getConfig()
  }

  /**
   * 匯出配置為 JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * 從 JSON 匯入配置
   */
  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson) as Partial<AppConfig>
      this.updateConfig(importedConfig)
    } catch (error) {
      console.error('[Config] 匯入配置失敗:', error)
      throw new Error('無效的配置格式')
    }
  }

  // ============= 私有方法 =============

  /**
   * 通知所有監聽器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig())
      } catch (error) {
        console.error('[Config] 配置監聽器錯誤:', error)
      }
    })
  }

  /**
   * 深度合併物件
   */
  private mergeDeep(target: any, source: any): any {
    const output = { ...target }
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = this.mergeDeep(target[key], source[key])
          }
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    
    return output
  }

  /**
   * 檢查是否為物件
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item)
  }
}

/**
 * 全域配置管理器實例
 */
export const configManager = ConfigManager.getInstance()

/**
 * 取得當前配置的快捷函數
 */
export function getConfig(): AppConfig {
  return configManager.getConfig()
}

/**
 * 檢查 API 是否啟用的快捷函數
 */
export function isApiEnabled(): boolean {
  return configManager.isApiEnabled()
}

/**
 * 檢查離線模式是否啟用的快捷函數
 */
export function isOfflineModeEnabled(): boolean {
  return configManager.isOfflineModeEnabled()
}