/**
 * 同步管理服務
 * 統一管理本地與遠端資料同步
 */

import type { IHttpService } from '../http/http.service'
import type { TaskApiRepository } from '../../repositories/task-api.repository'
import type { ProjectApiRepository } from '../../repositories/project-api.repository'
import type { UserApiRepository } from '../../repositories/user-api.repository'
import { configManager } from '../config/app.config'
import { ApiErrorHandler, isRetryableError } from '../http/api.errors'

export interface SyncResult {
  success: boolean
  syncedEntities: string[]
  errors: Array<{
    entity: string
    error: string
  }>
  startTime: string
  endTime: string
  duration: number
}

export interface SyncOptions {
  forceSync?: boolean
  entities?: string[]
  maxRetries?: number
  batchSize?: number
}

export interface SyncStatus {
  isRunning: boolean
  lastSyncAt?: string
  nextSyncAt?: string
  totalSynced: number
  totalErrors: number
  currentEntity?: string
}

/**
 * 同步管理服務
 */
export class SyncManagerService {
  private repositories: Map<string, any> = new Map()
  private syncStatus: SyncStatus = {
    isRunning: false,
    totalSynced: 0,
    totalErrors: 0
  }
  private syncTimer?: NodeJS.Timeout
  private listeners: Array<(status: SyncStatus) => void> = []

  constructor(private httpService: IHttpService) {
    this.setupConfigListener()
    this.startPeriodicSync()
  }

  /**
   * 註冊 Repository
   */
  registerRepository(name: string, repository: any): void {
    this.repositories.set(name, repository)
    console.log(`[SyncManager] Repository "${name}" 已註冊`)
  }

  /**
   * 執行完整同步
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.syncStatus.isRunning) {
      throw new Error('同步正在進行中，請稍後再試')
    }

    const startTime = new Date().toISOString()
    this.updateSyncStatus({ isRunning: true, currentEntity: undefined })

    const result: SyncResult = {
      success: true,
      syncedEntities: [],
      errors: [],
      startTime,
      endTime: '',
      duration: 0
    }

    try {
      console.log('[SyncManager] 開始同步...', options)

      // 檢查網路連接
      if (!navigator.onLine) {
        throw new Error('網路未連接，無法執行同步')
      }

      // 檢查 API 可用性
      const isApiHealthy = await this.httpService.healthCheck()
      if (!isApiHealthy) {
        throw new Error('API 服務不可用')
      }

      // 取得要同步的實體清單
      const entitiesToSync = options.entities || Array.from(this.repositories.keys())
      const maxRetries = options.maxRetries || 3

      // 逐一同步每個實體
      for (const entityName of entitiesToSync) {
        this.updateSyncStatus({ currentEntity: entityName })
        
        try {
          await this.syncEntity(entityName, maxRetries)
          result.syncedEntities.push(entityName)
          this.syncStatus.totalSynced++
          
          console.log(`[SyncManager] ${entityName} 同步完成`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          result.errors.push({
            entity: entityName,
            error: errorMessage
          })
          this.syncStatus.totalErrors++
          
          console.error(`[SyncManager] ${entityName} 同步失敗:`, error)
          
          // 非重試錯誤時停止同步
          if (!isRetryableError(error)) {
            result.success = false
            break
          }
        }
      }

      // 更新同步狀態
      const endTime = new Date().toISOString()
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
      
      result.endTime = endTime
      result.duration = duration
      result.success = result.errors.length === 0

      this.updateSyncStatus({
        isRunning: false,
        lastSyncAt: endTime,
        nextSyncAt: this.calculateNextSyncTime(),
        currentEntity: undefined
      })

      console.log('[SyncManager] 同步完成', {
        success: result.success,
        syncedEntities: result.syncedEntities.length,
        errors: result.errors.length,
        duration: `${duration}ms`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.success = false
      result.errors.push({
        entity: 'SyncManager',
        error: errorMessage
      })

      this.updateSyncStatus({
        isRunning: false,
        currentEntity: undefined
      })

      console.error('[SyncManager] 同步過程發生錯誤:', error)
    }

    return result
  }

  /**
   * 同步單一實體
   */
  private async syncEntity(entityName: string, maxRetries: number): Promise<void> {
    const repository = this.repositories.get(entityName)
    if (!repository) {
      throw new Error(`Repository "${entityName}" 未註冊`)
    }

    // 檢查 Repository 是否支援同步
    if (typeof repository.forceSync !== 'function') {
      throw new Error(`Repository "${entityName}" 不支援同步功能`)
    }

    let attempt = 0
    while (attempt < maxRetries) {
      try {
        await repository.forceSync()
        break
      } catch (error) {
        attempt++
        
        if (attempt >= maxRetries) {
          throw error
        }

        if (isRetryableError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.warn(`[SyncManager] ${entityName} 同步重試 ${attempt}/${maxRetries}，${delay}ms 後重試`)
          await this.delay(delay)
        } else {
          throw error
        }
      }
    }
  }

  /**
   * 取得同步狀態
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * 監聽同步狀態變更
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 取得所有 Repository 的同步狀態
   */
  getAllRepositorySyncStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    
    for (const [name, repository] of this.repositories.entries()) {
      if (typeof repository.getSyncStatus === 'function') {
        status[name] = repository.getSyncStatus()
      }
    }
    
    return status
  }

  /**
   * 清除所有快取
   */
  async clearAllCaches(): Promise<void> {
    console.log('[SyncManager] 清除所有快取...')
    
    const clearPromises: Promise<void>[] = []
    
    for (const [name, repository] of this.repositories.entries()) {
      if (typeof repository.clearCache === 'function') {
        clearPromises.push(
          repository.clearCache().catch((error: Error) => {
            console.error(`[SyncManager] 清除 ${name} 快取失敗:`, error)
          })
        )
      }
    }
    
    await Promise.all(clearPromises)
    
    // 重置同步狀態
    this.syncStatus.totalSynced = 0
    this.syncStatus.totalErrors = 0
    this.syncStatus.lastSyncAt = undefined
    this.updateSyncStatus({})
    
    console.log('[SyncManager] 所有快取已清除')
  }

  /**
   * 啟動定期同步
   */
  startPeriodicSync(): void {
    this.stopPeriodicSync()
    
    const config = configManager.getConfig()
    if (!config.features.enableSync || config.dataSource.syncInterval <= 0) {
      return
    }

    this.syncTimer = setInterval(async () => {
      try {
        if (!this.syncStatus.isRunning && configManager.isApiEnabled()) {
          await this.sync()
        }
      } catch (error) {
        console.error('[SyncManager] 定期同步失敗:', error)
      }
    }, config.dataSource.syncInterval)

    this.updateSyncStatus({
      nextSyncAt: this.calculateNextSyncTime()
    })

    console.log(`[SyncManager] 定期同步已啟動，間隔: ${config.dataSource.syncInterval}ms`)
  }

  /**
   * 停止定期同步
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = undefined
      
      this.updateSyncStatus({
        nextSyncAt: undefined
      })
      
      console.log('[SyncManager] 定期同步已停止')
    }
  }

  /**
   * 立即觸發同步
   */
  async triggerSync(options?: SyncOptions): Promise<SyncResult> {
    return this.sync({ forceSync: true, ...options })
  }

  /**
   * 檢查是否需要同步
   */
  shouldSync(): boolean {
    if (!configManager.isApiEnabled() || !configManager.isSyncEnabled()) {
      return false
    }

    if (this.syncStatus.isRunning) {
      return false
    }

    const config = configManager.getConfig()
    const lastSyncAt = this.syncStatus.lastSyncAt
    
    if (!lastSyncAt) {
      return true
    }

    const timeSinceLastSync = Date.now() - new Date(lastSyncAt).getTime()
    return timeSinceLastSync >= config.dataSource.syncInterval
  }

  /**
   * 停止同步管理器
   */
  stop(): void {
    this.stopPeriodicSync()
    this.listeners.length = 0
    console.log('[SyncManager] 同步管理器已停止')
  }

  // ============= 私有方法 =============

  /**
   * 更新同步狀態
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates }
    
    // 通知所有監聽器
    this.listeners.forEach(listener => {
      try {
        listener(this.getSyncStatus())
      } catch (error) {
        console.error('[SyncManager] 同步狀態監聽器錯誤:', error)
      }
    })
  }

  /**
   * 計算下次同步時間
   */
  private calculateNextSyncTime(): string | undefined {
    const config = configManager.getConfig()
    if (!config.features.enableSync || config.dataSource.syncInterval <= 0) {
      return undefined
    }

    return new Date(Date.now() + config.dataSource.syncInterval).toISOString()
  }

  /**
   * 設定配置監聽器
   */
  private setupConfigListener(): void {
    configManager.onConfigChange((config) => {
      if (config.features.enableSync && config.dataSource.syncInterval > 0) {
        this.startPeriodicSync()
      } else {
        this.stopPeriodicSync()
      }
    })
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 建立同步管理器實例
 */
export function createSyncManager(httpService: IHttpService): SyncManagerService {
  return new SyncManagerService(httpService)
}

// 全域同步管理器實例（延遲初始化）
let syncManagerInstance: SyncManagerService | null = null

/**
 * 取得全域同步管理器實例
 */
export function getSyncManager(): SyncManagerService | null {
  return syncManagerInstance
}

/**
 * 設定全域同步管理器實例
 */
export function setSyncManager(syncManager: SyncManagerService): void {
  if (syncManagerInstance) {
    syncManagerInstance.stop()
  }
  syncManagerInstance = syncManager
}