/**
 * 基礎 Repository 類別實作
 * 提供通用的 CRUD 操作並實作 IRepository 介面
 */

import type { Table } from 'dexie'
import type { IRepository } from '../infrastructure/interfaces/IRepository'
import { 
  RepositoryErrorHandler, 
  RecordNotFoundError, 
  DatabaseOperationError,
  SerializationError 
} from '../infrastructure/errors/repository.errors'

export abstract class BaseRepository<T extends { id?: string; createdAt?: string; updatedAt?: string }> 
  implements IRepository<T> {
  protected table: Table<T>
  protected abstract entityName: string

  constructor(table: Table<T>) {
    this.table = table
  }

  /**
   * 根據 ID 查找單一記錄
   */
  async findById(id: string): Promise<T | null> {
    // 驗證 ID 是否有效
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn(`[${this.entityName}Repository] Invalid ID provided to findById:`, id)
      return null
    }

    try {
      const result = await this.table.get(id)
      return result || null
    } catch (error) {
      const repoError = RepositoryErrorHandler.wrapError(error, {
        operation: 'findById',
        entityName: this.entityName,
        id
      })
      RepositoryErrorHandler.logError(repoError, { id })
      throw repoError
    }
  }

  /**
   * 查找所有記錄
   */
  async findAll(): Promise<T[]> {
    return await this.table.toArray()
  }

  /**
   * 根據條件查找記錄
   */
  async findBy(criteria: Partial<T>): Promise<T[]> {
    let query = this.table.toCollection()
    
    // 建立查詢條件
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        query = query.filter(item => (item as any)[key] === value)
      }
    }
    
    return await query.toArray()
  }

  /**
   * 根據條件查找單一記錄
   */
  async findOneBy(criteria: Partial<T>): Promise<T | null> {
    const results = await this.findBy(criteria)
    return results.length > 0 ? results[0] : null
  }

  /**
   * 建立新記錄
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const sanitizedData = this.sanitizeData(data)
      const timestamp = new Date().toISOString()
      
      const newRecord = {
        ...sanitizedData,
        id: this.generateId(),
        createdAt: timestamp,
        updatedAt: timestamp
      } as T

      const id = await this.table.add(newRecord)
      const createdRecord = await this.findById(id as string)
      
      if (!createdRecord) {
        throw new DatabaseOperationError('create', this.entityName)
      }

      return createdRecord
    } catch (error) {
      if (error instanceof DatabaseOperationError) {
        throw error
      }
      
      // 檢查是否為序列化錯誤
      if (error instanceof Error && error.message.includes('DataCloneError')) {
        const serializationError = new SerializationError(this.entityName, error)
        RepositoryErrorHandler.logError(serializationError)
        throw serializationError
      }
      
      const repoError = RepositoryErrorHandler.wrapError(error, {
        operation: 'create',
        entityName: this.entityName
      })
      RepositoryErrorHandler.logError(repoError)
      throw repoError
    }
  }

  /**
   * 更新記錄
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    // 驗證 ID 是否有效
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new RecordNotFoundError(this.entityName, id || 'undefined')
    }

    try {
      const existingRecord = await this.findById(id)
      if (!existingRecord) {
        throw new RecordNotFoundError(this.entityName, id)
      }

      const sanitizedUpdates = this.sanitizeData(updates)
      const updateData = {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
      }

      await this.table.update(id, updateData)
      
      const updatedRecord = await this.findById(id)
      if (!updatedRecord) {
        throw new DatabaseOperationError('update', this.entityName)
      }

      return updatedRecord
    } catch (error) {
      if (error instanceof RecordNotFoundError || error instanceof DatabaseOperationError) {
        throw error
      }
      
      const repoError = RepositoryErrorHandler.wrapError(error, {
        operation: 'update',
        entityName: this.entityName,
        id
      })
      RepositoryErrorHandler.logError(repoError, { id })
      throw repoError
    }
  }

  /**
   * 刪除記錄
   */
  async delete(id: string): Promise<void> {
    // 驗證 ID 是否有效
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new RecordNotFoundError(this.entityName, id || 'undefined')
    }

    try {
      const existingRecord = await this.findById(id)
      if (!existingRecord) {
        throw new RecordNotFoundError(this.entityName, id)
      }

      await this.table.delete(id)
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw error
      }
      
      const repoError = RepositoryErrorHandler.wrapError(error, {
        operation: 'delete',
        entityName: this.entityName,
        id
      })
      RepositoryErrorHandler.logError(repoError, { id })
      throw repoError
    }
  }

  /**
   * 批量建立記錄
   */
  async createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]> {
    const timestamp = new Date().toISOString()
    const newRecords = data.map(item => {
      const sanitizedData = this.sanitizeData(item)
      return {
        ...sanitizedData,
        id: this.generateId(),
        createdAt: timestamp,
        updatedAt: timestamp
      } as T
    })

    await this.table.bulkAdd(newRecords)
    
    // 返回建立的記錄
    const ids = newRecords.map(record => record.id!)
    const createdRecords: T[] = []
    
    for (const id of ids) {
      const record = await this.findById(id)
      if (record) {
        createdRecords.push(record)
      }
    }

    return createdRecords
  }

  /**
   * 批量更新記錄
   */
  async updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const updatedRecords: T[] = []
    const timestamp = new Date().toISOString()

    for (const { id, data } of updates) {
      try {
        const sanitizedData = this.sanitizeData(data)
        const updateData = {
          ...sanitizedData,
          updatedAt: timestamp
        }

        await this.table.update(id, updateData)
        const updatedRecord = await this.findById(id)
        
        if (updatedRecord) {
          updatedRecords.push(updatedRecord)
        }
      } catch (error) {
        console.warn(`批量更新記錄失敗 ${id}:`, error)
      }
    }

    return updatedRecords
  }

  /**
   * 批量刪除記錄
   */
  async deleteMany(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids)
  }

  /**
   * 計算符合條件的記錄數量
   */
  async count(criteria?: Partial<T>): Promise<number> {
    if (!criteria) {
      return await this.table.count()
    }

    const results = await this.findBy(criteria)
    return results.length
  }

  /**
   * 檢查記錄是否存在
   */
  async exists(id: string): Promise<boolean> {
    // 驗證 ID 是否有效
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return false
    }

    const record = await this.findById(id)
    return record !== null
  }

  /**
   * 分頁查詢
   */
  async paginate(
    page: number,
    pageSize: number,
    criteria?: Partial<T>
  ): Promise<{
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    let query = this.table.toCollection()
    
    // 應用篩選條件
    if (criteria) {
      for (const [key, value] of Object.entries(criteria)) {
        if (value !== undefined) {
          query = query.filter(item => (item as any)[key] === value)
        }
      }
    }

    const total = await query.count()
    const offset = (page - 1) * pageSize
    const data = await query.offset(offset).limit(pageSize).toArray()

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  /**
   * 清理資料，移除不可序列化的屬性
   */
  protected sanitizeData<TData>(data: TData): TData {
    if (data === null || data === undefined) return data

    // 處理原始類型
    if (typeof data !== 'object') return data

    // 處理 Date 對象 - 轉換為 ISO 字串
    if (data instanceof Date) {
      return data.toISOString() as unknown as TData
    }

    // 處理陣列
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item)) as unknown as TData
    }

    // 處理物件
    const sanitized = {} as any

    // 移除 Vue 的響應式屬性和其他不可序列化的屬性
    const propsToRemove = [
      '__v_isRef', '__v_isReactive', '__v_isReadonly', '__v_isShallow',
      '__v_skip', '__v_raw', '__ob__', '_isVue', '$parent', '$root', '$children',
      '__proto__', 'constructor'
    ]

    for (const [key, value] of Object.entries(data)) {
      // 跳過不可序列化的屬性
      if (propsToRemove.includes(key)) continue
      
      // 跳過函數
      if (typeof value === 'function') continue
      
      // 跳過 undefined 值
      if (value === undefined) continue

      // 遞歸處理巢狀物件
      sanitized[key] = this.sanitizeData(value)
    }

    return sanitized as TData
  }

  /**
   * 生成唯一 ID
   */
  protected generateId(): string {
    // 簡單的 ID 生成器，實際專案中建議使用 nanoid 或 uuid
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 取得表格名稱（供子類覆寫）
   */
  protected getTableName(): string {
    return this.table.name
  }
}