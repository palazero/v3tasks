/**
 * 基礎 API Repository 類別
 * 實作混合式資料存取，支援本地 IndexedDB 和遠端 API 雙重資料源
 */

import type { IRepository } from '../infrastructure/interfaces/IRepository'
import type { IHttpService } from '../infrastructure/http/http.service'
import { BaseRepository } from './base.repository'
import { ApiError, ApiErrorFactory, ApiErrorHandler } from '../infrastructure/http/api.errors'
import type { Table } from 'dexie'

/**
 * 資料源策略
 */
export enum DataSourceStrategy {
  LOCAL_ONLY = 'local-only',          // 僅使用本地資料
  API_ONLY = 'api-only',              // 僅使用 API
  API_FIRST = 'api-first',            // API 優先，失敗時回退本地
  LOCAL_FIRST = 'local-first',        // 本地優先，需要時同步 API
  HYBRID = 'hybrid'                   // 混合模式，智慧選擇
}

/**
 * 同步狀態
 */
export interface SyncStatus {
  lastSyncAt?: string
  pendingChanges: number
  syncErrors: string[]
  isOnline: boolean
}

/**
 * API Repository 配置
 */
export interface ApiRepositoryConfig {
  strategy: DataSourceStrategy
  apiEndpoint: string
  cacheTimeout: number           // 快取過期時間（毫秒）
  syncInterval: number           // 同步間隔（毫秒）
  maxRetries: number             // 最大重試次數
  enableOfflineSupport: boolean  // 是否啟用離線支援
}

/**
 * 混合式 Repository 抽象基類
 */
export abstract class BaseApiRepository<T extends { 
  id?: string
  createdAt?: string
  updatedAt?: string
  _lastSyncAt?: string
  _isDirty?: boolean
}> extends BaseRepository<T> {
  
  protected httpService: IHttpService
  protected config: ApiRepositoryConfig
  protected syncStatus: SyncStatus = {
    pendingChanges: 0,
    syncErrors: [],
    isOnline: navigator.onLine
  }

  constructor(
    table: Table<T>,
    httpService: IHttpService,
    config: Partial<ApiRepositoryConfig> = {}
  ) {
    super(table)
    this.httpService = httpService
    
    // 預設配置
    this.config = {
      strategy: DataSourceStrategy.HYBRID,
      apiEndpoint: '',
      cacheTimeout: 5 * 60 * 1000,  // 5 分鐘
      syncInterval: 30 * 1000,       // 30 秒
      maxRetries: 3,
      enableOfflineSupport: true,
      ...config
    }

    this.setupNetworkListeners()
    this.startSyncTimer()
  }

  /**
   * 根據 ID 查找記錄（混合模式）
   */
  async findById(id: string): Promise<T | null> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return super.findById(id)
      
      case DataSourceStrategy.API_ONLY:
        return this.findByIdFromApi(id)
      
      case DataSourceStrategy.API_FIRST:
        return this.findByIdApiFirst(id)
      
      case DataSourceStrategy.LOCAL_FIRST:
        return this.findByIdLocalFirst(id)
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findByIdHybrid(id)
    }
  }

  /**
   * 查找所有記錄（混合模式）
   */
  async findAll(): Promise<T[]> {
    switch (this.config.strategy) {
      case DataSourceStrategy.LOCAL_ONLY:
        return super.findAll()
      
      case DataSourceStrategy.API_ONLY:
        return this.findAllFromApi()
      
      case DataSourceStrategy.API_FIRST:
        return this.findAllApiFirst()
      
      case DataSourceStrategy.LOCAL_FIRST:
        return this.findAllLocalFirst()
      
      case DataSourceStrategy.HYBRID:
      default:
        return this.findAllHybrid()
    }
  }

  /**
   * 建立記錄（混合模式）
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const localRecord = await super.create(data)
    
    if (this.shouldUseApi()) {
      try {
        const apiRecord = await this.createInApi(localRecord)
        // 更新本地記錄以保持同步
        return this.update(localRecord.id!, { 
          ...apiRecord as Partial<T>,
          _lastSyncAt: new Date().toISOString(),
          _isDirty: false
        })
      } catch (error) {
        // API 失敗時標記為待同步
        await this.update(localRecord.id!, { _isDirty: true } as Partial<T>)
        this.handleApiError(error, 'create')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return localRecord
  }

  /**
   * 更新記錄（混合模式）
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const localRecord = await super.update(id, updates)
    
    if (this.shouldUseApi()) {
      try {
        const apiRecord = await this.updateInApi(id, updates)
        // 更新本地記錄以保持同步
        return super.update(id, {
          ...apiRecord as Partial<T>,
          _lastSyncAt: new Date().toISOString(),
          _isDirty: false
        })
      } catch (error) {
        // API 失敗時標記為待同步
        await super.update(id, { _isDirty: true } as Partial<T>)
        this.handleApiError(error, 'update')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
      }
    }

    return localRecord
  }

  /**
   * 刪除記錄（混合模式）
   */
  async delete(id: string): Promise<void> {
    if (this.shouldUseApi()) {
      try {
        await this.deleteInApi(id)
      } catch (error) {
        this.handleApiError(error, 'delete')
        
        if (!this.config.enableOfflineSupport) {
          throw error
        }
        
        // 離線模式：標記為待刪除而不是實際刪除
        await super.update(id, { 
          _isDirty: true,
          _isDeleted: true 
        } as Partial<T>)
        return
      }
    }

    await super.delete(id)
  }

  // ============= API 操作方法 =============

  /**
   * 從 API 查找單一記錄
   */
  protected async findByIdFromApi(id: string): Promise<T | null> {
    try {
      const response = await this.httpService.get<T>(`${this.config.apiEndpoint}/${id}`)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findById')
      return null
    }
  }

  /**
   * 從 API 查找所有記錄
   */
  protected async findAllFromApi(): Promise<T[]> {
    try {
      const response = await this.httpService.get<T[]>(this.config.apiEndpoint)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'findAll')
      return []
    }
  }

  /**
   * 在 API 中建立記錄
   */
  protected async createInApi(record: T): Promise<T> {
    const response = await this.httpService.post<T>(this.config.apiEndpoint, record)
    return response.data
  }

  /**
   * 在 API 中更新記錄
   */
  protected async updateInApi(id: string, updates: Partial<T>): Promise<T> {
    const response = await this.httpService.put<T>(`${this.config.apiEndpoint}/${id}`, updates)
    return response.data
  }

  /**
   * 在 API 中刪除記錄
   */
  protected async deleteInApi(id: string): Promise<void> {
    await this.httpService.delete(`${this.config.apiEndpoint}/${id}`)
  }

  // ============= 混合模式策略方法 =============

  /**
   * API 優先查找單一記錄
   */
  protected async findByIdApiFirst(id: string): Promise<T | null> {
    if (this.isOnline()) {
      const apiRecord = await this.findByIdFromApi(id)
      if (apiRecord) {
        // 更新本地快取
        await this.updateLocalCache(apiRecord)
        return apiRecord
      }
    }
    
    // API 失敗或離線時回退到本地
    return super.findById(id)
  }

  /**
   * 本地優先查找單一記錄
   */
  protected async findByIdLocalFirst(id: string): Promise<T | null> {
    const localRecord = await super.findById(id)
    
    // 檢查是否需要從 API 同步
    if (this.shouldRefreshFromApi(localRecord)) {
      try {
        const apiRecord = await this.findByIdFromApi(id)
        if (apiRecord) {
          await this.updateLocalCache(apiRecord)
          return apiRecord
        }
      } catch (error) {
        this.handleApiError(error, 'findById')
      }
    }
    
    return localRecord
  }

  /**
   * 混合模式查找單一記錄
   */
  protected async findByIdHybrid(id: string): Promise<T | null> {
    // 根據網路狀態和資料新舊程度智慧選擇策略
    if (this.isOnline()) {
      const localRecord = await super.findById(id)
      
      if (this.shouldRefreshFromApi(localRecord)) {
        return this.findByIdApiFirst(id)
      }
      
      return localRecord
    }
    
    return super.findById(id)
  }

  /**
   * API 優先查找所有記錄
   */
  protected async findAllApiFirst(): Promise<T[]> {
    if (this.isOnline()) {
      const apiRecords = await this.findAllFromApi()
      if (apiRecords.length > 0) {
        // 批量更新本地快取
        await this.batchUpdateLocalCache(apiRecords)
        return apiRecords
      }
    }
    
    return super.findAll()
  }

  /**
   * 本地優先查找所有記錄
   */
  protected async findAllLocalFirst(): Promise<T[]> {
    const localRecords = await super.findAll()
    
    // 檢查是否需要同步
    if (this.shouldSyncFromApi()) {
      try {
        const apiRecords = await this.findAllFromApi()
        if (apiRecords.length > 0) {
          await this.batchUpdateLocalCache(apiRecords)
          return apiRecords
        }
      } catch (error) {
        this.handleApiError(error, 'findAll')
      }
    }
    
    return localRecords
  }

  /**
   * 混合模式查找所有記錄
   */
  protected async findAllHybrid(): Promise<T[]> {
    if (this.isOnline() && this.shouldSyncFromApi()) {
      return this.findAllApiFirst()
    }
    
    return super.findAll()
  }

  // ============= 快取和同步方法 =============

  /**
   * 更新本地快取
   */
  protected async updateLocalCache(record: T): Promise<void> {
    if (record.id) {
      const existingRecord = await super.findById(record.id)
      const cacheRecord = {
        ...record,
        _lastSyncAt: new Date().toISOString(),
        _isDirty: false
      } as T

      if (existingRecord) {
        await super.update(record.id, cacheRecord)
      } else {
        // 直接插入而不使用 create（避免重新生成 ID）
        await this.table.put(cacheRecord)
      }
    }
  }

  /**
   * 批量更新本地快取
   */
  protected async batchUpdateLocalCache(records: T[]): Promise<void> {
    const cacheRecords = records.map(record => ({
      ...record,
      _lastSyncAt: new Date().toISOString(),
      _isDirty: false
    } as T))

    await this.table.bulkPut(cacheRecords)
    this.syncStatus.lastSyncAt = new Date().toISOString()
  }

  /**
   * 同步待處理的變更到 API
   */
  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline()) {
      return
    }

    const dirtyRecords = await this.table
      .filter(record => (record as T)._isDirty === true)
      .toArray()

    for (const record of dirtyRecords) {
      try {
        if ((record as any)._isDeleted) {
          await this.deleteInApi(record.id!)
          await super.delete(record.id!)
        } else {
          const existsOnServer = await this.findByIdFromApi(record.id!)
          if (existsOnServer) {
            await this.updateInApi(record.id!, record)
          } else {
            await this.createInApi(record)
          }
          
          await super.update(record.id!, {
            _isDirty: false,
            _lastSyncAt: new Date().toISOString()
          } as Partial<T>)
        }
      } catch (error) {
        this.handleApiError(error, 'sync')
      }
    }

    this.updateSyncStatus()
  }

  // ============= 輔助方法 =============

  /**
   * 是否應該使用 API
   */
  protected shouldUseApi(): boolean {
    return (
      this.config.strategy !== DataSourceStrategy.LOCAL_ONLY &&
      this.isOnline()
    )
  }

  /**
   * 是否需要從 API 刷新資料
   */
  protected shouldRefreshFromApi(record: T | null): boolean {
    if (!record || !this.isOnline()) {
      return false
    }

    const lastSync = record._lastSyncAt
    if (!lastSync) {
      return true
    }

    const timeSinceSync = Date.now() - new Date(lastSync).getTime()
    return timeSinceSync > this.config.cacheTimeout
  }

  /**
   * 是否需要從 API 同步所有資料
   */
  protected shouldSyncFromApi(): boolean {
    if (!this.isOnline()) {
      return false
    }

    const lastSync = this.syncStatus.lastSyncAt
    if (!lastSync) {
      return true
    }

    const timeSinceSync = Date.now() - new Date(lastSync).getTime()
    return timeSinceSync > this.config.syncInterval
  }

  /**
   * 檢查網路連接狀態
   */
  protected isOnline(): boolean {
    return this.syncStatus.isOnline
  }

  /**
   * 處理 API 錯誤
   */
  protected handleApiError(error: unknown, operation: string): void {
    const apiError = error instanceof Error
      ? ApiErrorFactory.fromError(error)
      : ApiErrorFactory.fromError(new Error('Unknown error'))

    ApiErrorHandler.logError(apiError, {
      operation,
      repository: this.entityName,
      timestamp: new Date().toISOString()
    })

    this.syncStatus.syncErrors.push(`${operation}: ${apiError.message}`)
    
    // 保持最多 10 個錯誤記錄
    if (this.syncStatus.syncErrors.length > 10) {
      this.syncStatus.syncErrors.shift()
    }
  }

  /**
   * 設定網路狀態監聽器
   */
  protected setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true
        this.syncPendingChanges() // 網路恢復時自動同步
      })

      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false
      })
    }
  }

  /**
   * 啟動同步定時器
   */
  protected startSyncTimer(): void {
    if (this.config.syncInterval > 0) {
      setInterval(() => {
        this.syncPendingChanges()
      }, this.config.syncInterval)
    }
  }

  /**
   * 更新同步狀態
   */
  protected updateSyncStatus(): void {
    this.table
      .filter(record => (record as T)._isDirty === true)
      .count()
      .then(count => {
        this.syncStatus.pendingChanges = count
      })
  }

  /**
   * 取得同步狀態
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * 強制從 API 同步所有資料
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('無法同步：網路未連接')
    }

    const apiRecords = await this.findAllFromApi()
    await this.batchUpdateLocalCache(apiRecords)
    await this.syncPendingChanges()
  }

  /**
   * 清除本地快取
   */
  async clearCache(): Promise<void> {
    await this.table.clear()
    this.syncStatus.lastSyncAt = undefined
    this.syncStatus.pendingChanges = 0
  }

  /**
   * 設定資料源策略
   */
  setStrategy(strategy: DataSourceStrategy): void {
    this.config.strategy = strategy
  }
}