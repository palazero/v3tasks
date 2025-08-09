/**
 * 基礎 Repository 類別
 * 提供通用的 CRUD 操作
 */

import type { Table } from 'dexie'
import type { PaginatedResult, PaginationParams } from '@/types'

export abstract class BaseRepository<T> {
  protected table: Table<T>

  constructor(table: Table<T>) {
    this.table = table
  }

  /**
   * 取得所有資料
   */
  async findAll(): Promise<T[]> {
    return await this.table.toArray()
  }

  /**
   * 根據 ID 取得單筆資料
   */
  async findById(id: string | number): Promise<T | undefined> {
    return await this.table.get(id)
  }

  /**
   * 根據條件查詢
   */
  async findBy(query: Partial<T>): Promise<T[]> {
    return await this.table.where(query).toArray()
  }

  /**
   * 根據條件查詢第一筆
   */
  async findOneBy(query: Partial<T>): Promise<T | undefined> {
    return await this.table.where(query).first()
  }

  /**
   * 新增資料
   */
  async create(data: T): Promise<string | number> {
    return await this.table.add(data)
  }

  /**
   * 批次新增資料
   */
  async createMany(data: T[]): Promise<string | number> {
    return await this.table.bulkAdd(data)
  }

  /**
   * 更新資料
   */
  async update(id: string | number, data: Partial<T>): Promise<number> {
    return await this.table.update(id, data)
  }

  /**
   * 批次更新資料
   */
  async updateMany(updates: Array<{ id: string | number; data: Partial<T> }>): Promise<void> {
    await this.table.bulkUpdate(
      updates.map(({ id, data }) => ({ key: id, changes: data }))
    )
  }

  /**
   * 刪除資料
   */
  async delete(id: string | number): Promise<void> {
    await this.table.delete(id)
  }

  /**
   * 批次刪除資料
   */
  async deleteMany(ids: Array<string | number>): Promise<void> {
    await this.table.bulkDelete(ids)
  }

  /**
   * 根據條件刪除資料
   */
  async deleteBy(query: Partial<T>): Promise<number> {
    return await this.table.where(query).delete()
  }

  /**
   * 計算資料總數
   */
  async count(): Promise<number> {
    return await this.table.count()
  }

  /**
   * 根據條件計算資料總數
   */
  async countBy(query: Partial<T>): Promise<number> {
    return await this.table.where(query).count()
  }

  /**
   * 檢查資料是否存在
   */
  async exists(id: string | number): Promise<boolean> {
    const item = await this.table.get(id)
    return item !== undefined
  }

  /**
   * 根據條件檢查資料是否存在
   */
  async existsBy(query: Partial<T>): Promise<boolean> {
    const count = await this.table.where(query).count()
    return count > 0
  }

  /**
   * 分頁查詢
   */
  async findPaginated(params: PaginationParams): Promise<PaginatedResult<T>> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      this.table.offset(offset).limit(pageSize).toArray(),
      this.table.count()
    ])

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }

  /**
   * 清空資料表
   */
  async clear(): Promise<void> {
    await this.table.clear()
  }
}