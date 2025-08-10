/**
 * 基礎 Repository 類別
 * 提供通用的 CRUD 操作
 */

import type { Table, UpdateSpec } from 'dexie';
import type { PaginatedResult, PaginationParams } from '@/types';

export abstract class BaseRepository<T> {
  protected table: Table<T>;

  constructor(table: Table<T>) {
    this.table = table;
  }

  /**
   * 取得所有資料
   */
  async findAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  /**
   * 根據 ID 取得單筆資料
   */
  async findById(id: string | number): Promise<T | undefined> {
    return await this.table.get(id);
  }

  /**
   * 根據條件查詢
   */
  async findBy(query: Partial<T>): Promise<T[]> {
    return await this.table.where(query).toArray();
  }

  /**
   * 根據條件查詢第一筆
   */
  async findOneBy(query: Partial<T>): Promise<T | undefined> {
    return await this.table.where(query).first();
  }

  /**
   * 新增資料
   */
  async create(data: T): Promise<string | number> {
    const sanitizedData = this.sanitizeData(data);
    return await this.table.add(sanitizedData as T);
  }

  /**
   * 批次新增資料
   */
  async createMany(data: T[]): Promise<string | number> {
    return await this.table.bulkAdd(data);
  }

  /**
   * 清理資料，移除不應該持久化的屬性
   */
  protected sanitizeData(data: Partial<T>): Partial<T> {
    const sanitized = { ...data };
    
    // 移除 children 屬性（用於 UI 樹狀結構，不應持久化）
    if ('children' in sanitized) {
      delete (sanitized as Record<string, unknown>).children;
    }
    
    // 遞迴清理物件，移除不可序列化的內容
    const cleanObject = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      
      if (obj instanceof Date) return obj; // Date 物件可以序列化
      
      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      }
      
      if (typeof obj === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          // 跳過函數屬性
          if (typeof value === 'function') continue;
          // 跳過 Symbol 屬性
          if (typeof value === 'symbol') continue;
          // 跳過 undefined 值
          if (value === undefined) continue;
          // 跳過循環引用的 children
          if (key === 'children') continue;
          
          cleaned[key] = cleanObject(value);
        }
        return cleaned;
      }
      
      return obj;
    };
    
    return cleanObject(sanitized);
  }

  /**
   * 更新資料
   */
  async update(id: string | number, data: Partial<T>): Promise<number> {
    const sanitizedData = this.sanitizeData(data);
    return await this.table.update(id, sanitizedData as UpdateSpec<T>);
  }

  /**
   * 批次更新資料
   */
  async updateMany(updates: Array<{ id: string | number; data: UpdateSpec<T> }>): Promise<void> {
    const sanitizedUpdates = updates.map(({ id, data }) => ({
      key: id,
      changes: this.sanitizeData(data as Partial<T>) as UpdateSpec<T>
    }));
    await this.table.bulkUpdate(sanitizedUpdates);
  }

  /**
   * 刪除資料
   */
  async delete(id: string | number): Promise<void> {
    await this.table.delete(id);
  }

  /**
   * 批次刪除資料
   */
  async deleteMany(ids: Array<string | number>): Promise<void> {
    await this.table.bulkDelete(ids);
  }

  /**
   * 根據條件刪除資料
   */
  async deleteBy(query: Partial<T>): Promise<number> {
    return await this.table.where(query).delete();
  }

  /**
   * 計算資料總數
   */
  async count(): Promise<number> {
    return await this.table.count();
  }

  /**
   * 根據條件計算資料總數
   */
  async countBy(query: Partial<T>): Promise<number> {
    return await this.table.where(query).count();
  }

  /**
   * 檢查資料是否存在
   */
  async exists(id: string | number): Promise<boolean> {
    const item = await this.table.get(id);
    return item !== undefined;
  }

  /**
   * 根據條件檢查資料是否存在
   */
  async existsBy(query: Partial<T>): Promise<boolean> {
    const count = await this.table.where(query).count();
    return count > 0;
  }

  /**
   * 分頁查詢
   */
  async findPaginated(params: PaginationParams): Promise<PaginatedResult<T>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.table.offset(offset).limit(pageSize).toArray(),
      this.table.count(),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 清空資料表
   */
  async clear(): Promise<void> {
    await this.table.clear();
  }
}
