/**
 * 報表資料存取層 (Repository)
 * @description 提供報表資料的 CRUD 操作，遵循企業架構 Repository 模式
 */

import { BaseRepository } from './base.repository'
import { getDatabase } from '@/services/infrastructure/database/db/database'
import type { 
  ReportEntity, 
  ReportQuery,
  CreateReportRequest,
  UpdateReportRequest,
  ReportConfig
} from '@/types/report'
import { nanoid } from 'nanoid'

/**
 * 報表資料存取介面
 */
export interface IReportRepository {
  /**
   * 根據 ID 取得報表
   */
  findById(id: string): Promise<ReportEntity | undefined>

  /**
   * 根據專案 ID 取得報表列表
   */
  findByProjectId(projectId: string): Promise<ReportEntity[]>

  /**
   * 根據用戶 ID 取得報表列表
   */
  findByUserId(userId: string, projectId?: string): Promise<ReportEntity[]>

  /**
   * 根據查詢條件取得報表列表
   */
  find(query: ReportQuery): Promise<ReportEntity[]>

  /**
   * 取得所有報表（分頁）
   */
  findAll(limit?: number, offset?: number): Promise<ReportEntity[]>

  /**
   * 建立報表
   */
  create(data: CreateReportRequest): Promise<ReportEntity>

  /**
   * 更新報表
   */
  update(id: string, data: UpdateReportRequest): Promise<ReportEntity>

  /**
   * 刪除報表
   */
  delete(id: string): Promise<void>

  /**
   * 批量刪除報表
   */
  deleteMany(ids: string[]): Promise<void>

  /**
   * 計算報表總數
   */
  count(query?: Partial<ReportQuery>): Promise<number>

  /**
   * 檢查報表是否存在
   */
  exists(id: string): Promise<boolean>
}

/**
 * 報表資料存取實作類別
 */
export class ReportRepository extends BaseRepository<ReportEntity> implements IReportRepository {
  constructor() {
    super(getDatabase().reports)
  }

  /**
   * 根據 ID 取得報表
   */
  async findById(id: string): Promise<ReportEntity | undefined> {
    try {
      return await this.table.get(id)
    } catch (error) {
      console.error('ReportRepository.findById error:', error)
      throw error
    }
  }

  /**
   * 根據專案 ID 取得報表列表
   */
  async findByProjectId(projectId: string): Promise<ReportEntity[]> {
    try {
      return await this.table
        .where('projectId')
        .equals(projectId)
        .and((report) => report.isActive !== false)
        .sortBy('order')
    } catch (error) {
      console.error('ReportRepository.findByProjectId error:', error)
      throw error
    }
  }

  /**
   * 根據用戶 ID 取得報表列表
   */
  async findByUserId(userId: string, projectId?: string): Promise<ReportEntity[]> {
    try {
      let query = this.table.where('createdBy').equals(userId)
      
      if (projectId) {
        query = query.and((report) => 
          report.projectId === projectId && report.isActive !== false
        )
      } else {
        query = query.and((report) => report.isActive !== false)
      }
      
      return await query.sortBy('updatedAt')
    } catch (error) {
      console.error('ReportRepository.findByUserId error:', error)
      throw error
    }
  }

  /**
   * 根據查詢條件取得報表列表
   */
  async find(query: ReportQuery): Promise<ReportEntity[]> {
    try {
      let dbQuery = this.table.toCollection()

      // 專案篩選
      if (query.projectId) {
        dbQuery = dbQuery.and((report) => report.projectId === query.projectId)
      }

      // 用戶篩選
      if (query.userId) {
        dbQuery = dbQuery.and((report) => report.createdBy === query.userId)
      }

      // 範本篩選
      if (query.isTemplate !== undefined) {
        dbQuery = dbQuery.and((report) => report.isTemplate === query.isTemplate)
      }

      // 公開性篩選
      if (query.isPublic !== undefined) {
        dbQuery = dbQuery.and((report) => report.isPublic === query.isPublic)
      }

      // 搜尋篩選
      if (query.search) {
        const searchTerm = query.search.toLowerCase()
        dbQuery = dbQuery.and((report) => 
          report.name?.toLowerCase().includes(searchTerm) ||
          report.description?.toLowerCase().includes(searchTerm)
        )
      }

      // 標籤篩選 (如果報表有標籤系統)
      if (query.tags && query.tags.length > 0) {
        dbQuery = dbQuery.and((report) => {
          // 假設報表有 tags 欄位，這裡簡化處理
          return true // 實際實作中應該檢查 tags 交集
        })
      }

      // 排序
      const sortBy = query.sortBy || 'updatedAt'
      const sortOrder = query.sortOrder || 'desc'
      
      let results = await dbQuery.toArray()
      
      // 手動排序（Dexie 的複雜排序支援有限）
      results.sort((a, b) => {
        let valueA: unknown
        let valueB: unknown
        
        if (sortBy === 'name') {
          valueA = a.name || ''
          valueB = b.name || ''
        } else if (sortBy === 'createdAt') {
          valueA = a.createdAt
          valueB = b.createdAt
        } else if (sortBy === 'updatedAt') {
          valueA = a.updatedAt
          valueB = b.updatedAt
        } else {
          valueA = 0
          valueB = 0
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })

      // 分頁
      if (query.offset || query.limit) {
        const offset = query.offset || 0
        const limit = query.limit || results.length
        results = results.slice(offset, offset + limit)
      }

      return results
    } catch (error) {
      console.error('ReportRepository.find error:', error)
      throw error
    }
  }

  /**
   * 取得所有報表（分頁）
   */
  async findAll(limit?: number, offset?: number): Promise<ReportEntity[]> {
    try {
      let query = this.table.orderBy('updatedAt').reverse()
      
      if (offset) {
        query = query.offset(offset)
      }
      
      if (limit) {
        query = query.limit(limit)
      }
      
      return await query.toArray()
    } catch (error) {
      console.error('ReportRepository.findAll error:', error)
      throw error
    }
  }

  /**
   * 建立報表
   */
  async create(data: CreateReportRequest): Promise<ReportEntity> {
    try {
      const now = new Date()
      const reportEntity: ReportEntity = {
        ...data,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
        // 複合索引欄位
        projectCreatedBy: `${data.projectId || 'all'}_${data.createdBy}`,
        projectIsTemplate: `${data.projectId || 'all'}_${data.isTemplate}`
      }

      // 使用 base repository 的清理方法確保資料可序列化
      const sanitizedData = this.sanitizeData(reportEntity)
      
      await this.table.add(sanitizedData)
      return sanitizedData
    } catch (error) {
      console.error('ReportRepository.create error:', error)
      throw error
    }
  }

  /**
   * 更新報表
   */
  async update(id: string, data: UpdateReportRequest): Promise<ReportEntity> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new Error(`報表不存在: ${id}`)
      }

      const updatedData: Partial<ReportEntity> = {
        ...data,
        updatedAt: new Date(),
        // 更新複合索引欄位（如果相關欄位有變更）
        ...(data.projectId || data.createdBy ? {
          projectCreatedBy: `${data.projectId || existing.projectId || 'all'}_${data.createdBy || existing.createdBy}`
        } : {}),
        ...(data.projectId !== undefined || data.isTemplate !== undefined ? {
          projectIsTemplate: `${data.projectId ?? (existing.projectId || 'all')}_${data.isTemplate ?? existing.isTemplate}`
        } : {})
      }

      // 清理資料確保可序列化
      const sanitizedData = this.sanitizeData(updatedData)
      
      await this.table.update(id, sanitizedData)
      
      // 回傳更新後的完整物件
      const updated = await this.findById(id)
      if (!updated) {
        throw new Error('更新後無法取得報表資料')
      }
      
      return updated
    } catch (error) {
      console.error('ReportRepository.update error:', error)
      throw error
    }
  }

  /**
   * 刪除報表
   */
  async delete(id: string): Promise<void> {
    try {
      await this.table.delete(id)
    } catch (error) {
      console.error('ReportRepository.delete error:', error)
      throw error
    }
  }

  /**
   * 批量刪除報表
   */
  async deleteMany(ids: string[]): Promise<void> {
    try {
      await this.table.bulkDelete(ids)
    } catch (error) {
      console.error('ReportRepository.deleteMany error:', error)
      throw error
    }
  }

  /**
   * 計算報表總數
   */
  async count(query?: Partial<ReportQuery>): Promise<number> {
    try {
      if (!query) {
        return await this.table.count()
      }

      let dbQuery = this.table.toCollection()

      if (query.projectId) {
        dbQuery = dbQuery.and((report) => report.projectId === query.projectId)
      }

      if (query.userId) {
        dbQuery = dbQuery.and((report) => report.createdBy === query.userId)
      }

      if (query.isTemplate !== undefined) {
        dbQuery = dbQuery.and((report) => report.isTemplate === query.isTemplate)
      }

      return await dbQuery.count()
    } catch (error) {
      console.error('ReportRepository.count error:', error)
      throw error
    }
  }

  /**
   * 檢查報表是否存在
   */
  async exists(id: string): Promise<boolean> {
    try {
      const report = await this.table.get(id)
      return !!report
    } catch (error) {
      console.error('ReportRepository.exists error:', error)
      return false
    }
  }

  /**
   * 根據範本取得報表列表
   */
  async findTemplates(): Promise<ReportEntity[]> {
    try {
      return await this.table
        .where('isTemplate')
        .equals(true)
        .and((report) => report.isActive !== false)
        .sortBy('order')
    } catch (error) {
      console.error('ReportRepository.findTemplates error:', error)
      throw error
    }
  }

  /**
   * 根據公開性取得報表列表
   */
  async findPublicReports(): Promise<ReportEntity[]> {
    try {
      return await this.table
        .where('isPublic')
        .equals(true)
        .and((report) => report.isActive !== false)
        .sortBy('updatedAt')
    } catch (error) {
      console.error('ReportRepository.findPublicReports error:', error)
      throw error
    }
  }

  /**
   * 取得報表統計資訊
   */
  async getStats(): Promise<{
    total: number
    byProject: Record<string, number>
    byUser: Record<string, number>
    templates: number
    publicReports: number
    activeReports: number
  }> {
    try {
      const allReports = await this.table.toArray()
      
      const stats = {
        total: allReports.length,
        byProject: {} as Record<string, number>,
        byUser: {} as Record<string, number>,
        templates: 0,
        publicReports: 0,
        activeReports: 0
      }

      allReports.forEach(report => {
        // 按專案統計
        const projectId = report.projectId || 'all'
        stats.byProject[projectId] = (stats.byProject[projectId] || 0) + 1

        // 按用戶統計
        const userId = report.createdBy
        stats.byUser[userId] = (stats.byUser[userId] || 0) + 1

        // 其他統計
        if (report.isTemplate) stats.templates++
        if (report.isPublic) stats.publicReports++
        if (report.isActive !== false) stats.activeReports++
      })

      return stats
    } catch (error) {
      console.error('ReportRepository.getStats error:', error)
      throw error
    }
  }
}