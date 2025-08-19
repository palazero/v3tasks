/**
 * 報表領域服務 (Domain Service)
 * @description 實作報表業務邏輯，遵循企業架構 Service 模式
 */

import type { 
  IReportService,
  ReportServiceError,
  ReportNotFoundError,
  ReportValidationError,
  ReportPermissionError
} from './interfaces/IReportService'
import { ReportRepository, type IReportRepository } from '@/services/repositories/report.repository'
import type { 
  ReportConfig, 
  ReportTemplate, 
  ReportQuery,
  CreateReportRequest,
  UpdateReportRequest,
  REPORT_VALIDATION_RULES,
  DEFAULT_REPORT_CONFIG,
  ReportEntity
} from '@/types/report'
import { nanoid } from 'nanoid'

/**
 * 報表服務實作類別
 */
export class ReportService implements IReportService {
  private reportRepository: IReportRepository

  constructor(reportRepository?: IReportRepository) {
    this.reportRepository = reportRepository || new ReportRepository()
  }

  /**
   * 根據專案 ID 取得報表列表
   */
  async getReportsByProject(projectId: string): Promise<ReportConfig[]> {
    try {
      const reports = await this.reportRepository.findByProjectId(projectId)
      return reports.map(this.mapEntityToConfig)
    } catch (error) {
      console.error('ReportService.getReportsByProject error:', error)
      throw new ReportServiceError('取得專案報表失敗', 'GET_REPORTS_BY_PROJECT_FAILED')
    }
  }

  /**
   * 根據用戶 ID 取得個人報表
   */
  async getReportsByUser(userId: string, projectId?: string): Promise<ReportConfig[]> {
    try {
      const reports = await this.reportRepository.findByUserId(userId, projectId)
      return reports.map(this.mapEntityToConfig)
    } catch (error) {
      console.error('ReportService.getReportsByUser error:', error)
      throw new ReportServiceError('取得用戶報表失敗', 'GET_REPORTS_BY_USER_FAILED')
    }
  }

  /**
   * 根據查詢條件取得報表
   */
  async getReports(query: ReportQuery): Promise<ReportConfig[]> {
    try {
      const reports = await this.reportRepository.find(query)
      return reports.map(this.mapEntityToConfig)
    } catch (error) {
      console.error('ReportService.getReports error:', error)
      throw new ReportServiceError('查詢報表失敗', 'GET_REPORTS_FAILED')
    }
  }

  /**
   * 根據 ID 取得單一報表
   */
  async getReportById(reportId: string): Promise<ReportConfig | undefined> {
    try {
      const report = await this.reportRepository.findById(reportId)
      return report ? this.mapEntityToConfig(report) : undefined
    } catch (error) {
      console.error('ReportService.getReportById error:', error)
      throw new ReportServiceError('取得報表失敗', 'GET_REPORT_BY_ID_FAILED')
    }
  }

  /**
   * 建立新報表
   */
  async createReport(request: CreateReportRequest): Promise<ReportConfig> {
    try {
      // 驗證資料
      const validation = await this.validateReportConfig(request)
      if (!validation.isValid) {
        throw new ReportValidationError(
          '報表配置驗證失敗',
          validation.errors
        )
      }

      // 如果沒有指定 order，使用下一個可用的 order
      if (request.order === undefined || request.order === null) {
        const existingReports = await this.reportRepository.findByProjectId(request.projectId || 'all')
        request.order = Math.max(0, ...existingReports.map(r => r.order || 0)) + 1
      }

      const reportEntity = await this.reportRepository.create(request)
      return this.mapEntityToConfig(reportEntity)
    } catch (error) {
      if (error instanceof ReportValidationError) {
        throw error
      }
      console.error('ReportService.createReport error:', error)
      throw new ReportServiceError('建立報表失敗', 'CREATE_REPORT_FAILED')
    }
  }

  /**
   * 更新報表
   */
  async updateReport(reportId: string, updates: UpdateReportRequest): Promise<ReportConfig> {
    try {
      // 檢查報表是否存在
      const existingReport = await this.reportRepository.findById(reportId)
      if (!existingReport) {
        throw new ReportNotFoundError(reportId)
      }

      // 驗證更新資料
      const mergedConfig = { ...existingReport, ...updates }
      const validation = await this.validateReportConfig(mergedConfig)
      if (!validation.isValid) {
        throw new ReportValidationError(
          '報表配置驗證失敗',
          validation.errors
        )
      }

      const updatedEntity = await this.reportRepository.update(reportId, updates)
      return this.mapEntityToConfig(updatedEntity)
    } catch (error) {
      if (error instanceof ReportNotFoundError || error instanceof ReportValidationError) {
        throw error
      }
      console.error('ReportService.updateReport error:', error)
      throw new ReportServiceError('更新報表失敗', 'UPDATE_REPORT_FAILED')
    }
  }

  /**
   * 刪除報表
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const existingReport = await this.reportRepository.findById(reportId)
      if (!existingReport) {
        throw new ReportNotFoundError(reportId)
      }

      await this.reportRepository.delete(reportId)
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error
      }
      console.error('ReportService.deleteReport error:', error)
      throw new ReportServiceError('刪除報表失敗', 'DELETE_REPORT_FAILED')
    }
  }

  /**
   * 複製報表
   */
  async duplicateReport(reportId: string, newName: string, targetProjectId?: string): Promise<ReportConfig> {
    try {
      const originalReport = await this.reportRepository.findById(reportId)
      if (!originalReport) {
        throw new ReportNotFoundError(reportId)
      }

      // 建立複製的報表配置
      const duplicateRequest: CreateReportRequest = {
        ...originalReport,
        name: newName,
        projectId: targetProjectId || originalReport.projectId,
        // 重設 order 到最後
        order: 0, // 會在 createReport 中自動計算
        // 重設時間戳記 (會在 repository 中設定)
      }

      // 移除不應該複製的欄位
      delete (duplicateRequest as unknown as { id?: string }).id

      return await this.createReport(duplicateRequest)
    } catch (error) {
      if (error instanceof ReportNotFoundError || error instanceof ReportValidationError) {
        throw error
      }
      console.error('ReportService.duplicateReport error:', error)
      throw new ReportServiceError('複製報表失敗', 'DUPLICATE_REPORT_FAILED')
    }
  }

  /**
   * 取得報表範本列表
   */
  async getReportTemplates(category?: string): Promise<ReportTemplate[]> {
    try {
      // 先從資料庫取得範本報表
      const templateReports = await this.reportRepository.findTemplates()
      
      // 轉換為範本格式
      const templates: ReportTemplate[] = templateReports.map(report => ({
        id: report.id,
        name: report.name,
        description: report.description || '',
        category: 'custom', // 自訂範本
        config: {
          name: report.name,
          description: report.description,
          chartType: report.chartType,
          dimension: report.dimension,
          aggregation: report.aggregation,
          customFieldId: report.customFieldId,
          customFieldType: report.customFieldType,
          filters: report.filters,
          chartOptions: report.chartOptions,
          isTemplate: true,
          isPublic: report.isPublic,
          order: report.order,
          isActive: report.isActive
        },
        isBuiltIn: false,
        usageCount: 0, // 實際環境中應該統計使用次數
        tags: []
      }))

      // 如果有分類篩選
      if (category) {
        return templates.filter(template => template.category === category)
      }

      // 添加內建範本
      const builtInTemplates = this.getBuiltInTemplates()
      return [...builtInTemplates, ...templates]
    } catch (error) {
      console.error('ReportService.getReportTemplates error:', error)
      throw new ReportServiceError('取得報表範本失敗', 'GET_REPORT_TEMPLATES_FAILED')
    }
  }

  /**
   * 從範本建立報表
   */
  async createReportFromTemplate(templateId: string, customization: CreateReportRequest): Promise<ReportConfig> {
    try {
      // 如果是內建範本
      const builtInTemplate = this.getBuiltInTemplates().find(t => t.id === templateId)
      
      let templateConfig: Partial<ReportConfig>
      
      if (builtInTemplate) {
        templateConfig = builtInTemplate.config
      } else {
        // 從資料庫取得範本
        const templateReport = await this.reportRepository.findById(templateId)
        if (!templateReport || !templateReport.isTemplate) {
          throw new ReportNotFoundError(templateId)
        }
        templateConfig = templateReport
      }

      // 合併範本配置與自訂配置
      const reportRequest: CreateReportRequest = {
        ...templateConfig,
        ...customization,
        // 確保不是範本
        isTemplate: false
      }

      return await this.createReport(reportRequest)
    } catch (error) {
      if (error instanceof ReportNotFoundError || error instanceof ReportValidationError) {
        throw error
      }
      console.error('ReportService.createReportFromTemplate error:', error)
      throw new ReportServiceError('從範本建立報表失敗', 'CREATE_REPORT_FROM_TEMPLATE_FAILED')
    }
  }

  /**
   * 批量刪除報表
   */
  async batchDeleteReports(reportIds: string[]): Promise<void> {
    try {
      // 檢查所有報表是否存在
      for (const reportId of reportIds) {
        const exists = await this.reportRepository.exists(reportId)
        if (!exists) {
          throw new ReportNotFoundError(reportId)
        }
      }

      await this.reportRepository.deleteMany(reportIds)
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error
      }
      console.error('ReportService.batchDeleteReports error:', error)
      throw new ReportServiceError('批量刪除報表失敗', 'BATCH_DELETE_REPORTS_FAILED')
    }
  }

  /**
   * 匯出報表配置
   */
  async exportReportConfig(reportId: string): Promise<string> {
    try {
      const report = await this.reportRepository.findById(reportId)
      if (!report) {
        throw new ReportNotFoundError(reportId)
      }

      // 移除內部欄位，只保留配置
      const exportConfig = {
        name: report.name,
        description: report.description,
        chartType: report.chartType,
        dimension: report.dimension,
        aggregation: report.aggregation,
        customFieldId: report.customFieldId,
        customFieldType: report.customFieldType,
        filters: report.filters,
        chartOptions: report.chartOptions,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }

      return JSON.stringify(exportConfig, null, 2)
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error
      }
      console.error('ReportService.exportReportConfig error:', error)
      throw new ReportServiceError('匯出報表配置失敗', 'EXPORT_REPORT_CONFIG_FAILED')
    }
  }

  /**
   * 匯入報表配置
   */
  async importReportConfig(configJson: string, targetProjectId: string): Promise<ReportConfig> {
    try {
      const config = JSON.parse(configJson)
      
      // 驗證匯入的配置格式
      if (!config.name || !config.chartType || !config.dimension || !config.aggregation) {
        throw new ReportValidationError(
          '匯入的報表配置格式不正確',
          [{ field: 'config', message: '缺少必要欄位' }]
        )
      }

      // 建立匯入的報表請求
      const importRequest: CreateReportRequest = {
        ...DEFAULT_REPORT_CONFIG,
        ...config,
        projectId: targetProjectId,
        name: `${config.name} (匯入)`,
        createdBy: 'imported', // 實際環境中應該使用當前用戶 ID
        isTemplate: false,
        isPublic: false
      }

      return await this.createReport(importRequest)
    } catch (error) {
      if (error instanceof ReportValidationError) {
        throw error
      }
      console.error('ReportService.importReportConfig error:', error)
      throw new ReportServiceError('匯入報表配置失敗', 'IMPORT_REPORT_CONFIG_FAILED')
    }
  }

  /**
   * 驗證報表配置
   */
  async validateReportConfig(config: Partial<ReportConfig>): Promise<{
    isValid: boolean
    errors: Array<{ field: string; message: string }>
  }> {
    const errors: Array<{ field: string; message: string }> = []

    // 驗證名稱
    if (!config.name) {
      errors.push({ field: 'name', message: '報表名稱不能為空' })
    } else if (config.name.length > 100) {
      errors.push({ field: 'name', message: '報表名稱不能超過 100 個字元' })
    }

    // 驗證描述
    if (config.description && config.description.length > 500) {
      errors.push({ field: 'description', message: '報表描述不能超過 500 個字元' })
    }

    // 驗證圖表類型
    if (!config.chartType) {
      errors.push({ field: 'chartType', message: '必須選擇圖表類型' })
    }

    // 驗證維度
    if (!config.dimension) {
      errors.push({ field: 'dimension', message: '必須選擇分析維度' })
    }

    // 驗證聚合方式
    if (!config.aggregation) {
      errors.push({ field: 'aggregation', message: '必須選擇聚合方式' })
    }

    // 驗證建立者
    if (!config.createdBy) {
      errors.push({ field: 'createdBy', message: '必須指定建立者' })
    }

    // 驗證排序
    if (config.order !== undefined && (config.order < 0 || config.order > 9999)) {
      errors.push({ field: 'order', message: '排序值必須在 0 到 9999 之間' })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 取得報表使用統計
   */
  async getReportUsageStats(reportId: string): Promise<{
    viewCount: number
    lastAccessedAt?: Date
    accessHistory: Array<{ accessedAt: Date; userId: string }>
  }> {
    try {
      // 實際環境中應該有專門的統計表
      // 這裡先回傳模擬資料
      return {
        viewCount: 0,
        lastAccessedAt: undefined,
        accessHistory: []
      }
    } catch (error) {
      console.error('ReportService.getReportUsageStats error:', error)
      throw new ReportServiceError('取得報表使用統計失敗', 'GET_REPORT_USAGE_STATS_FAILED')
    }
  }

  /**
   * 將資料庫實體轉換為業務配置物件
   */
  private mapEntityToConfig(entity: ReportEntity): ReportConfig {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      chartType: entity.chartType,
      dimension: entity.dimension,
      aggregation: entity.aggregation,
      customFieldId: entity.customFieldId,
      customFieldType: entity.customFieldType,
      filters: entity.filters,
      chartOptions: entity.chartOptions,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isTemplate: entity.isTemplate,
      isPublic: entity.isPublic,
      projectId: entity.projectId,
      order: entity.order,
      isActive: entity.isActive
    }
  }

  /**
   * 取得內建範本
   */
  private getBuiltInTemplates(): ReportTemplate[] {
    return [
      {
        id: 'builtin-task-status',
        name: '任務狀態分佈',
        description: '以圓餅圖顯示不同狀態任務的分佈情況',
        category: 'task-analysis',
        config: {
          name: '任務狀態分佈',
          description: '以圓餅圖顯示不同狀態任務的分佈情況',
          chartType: 'pie',
          dimension: 'statusId',
          aggregation: 'count',
          isTemplate: false,
          isPublic: false,
          order: 0,
          isActive: true
        },
        isBuiltIn: true,
        usageCount: 0,
        tags: ['狀態', '分析', '圓餅圖']
      },
      {
        id: 'builtin-assignee-workload',
        name: '負責人工作負載',
        description: '以長條圖顯示各負責人的任務數量',
        category: 'team-performance',
        config: {
          name: '負責人工作負載',
          description: '以長條圖顯示各負責人的任務數量',
          chartType: 'bar',
          dimension: 'assigneeId',
          aggregation: 'count',
          isTemplate: false,
          isPublic: false,
          order: 0,
          isActive: true
        },
        isBuiltIn: true,
        usageCount: 0,
        tags: ['負責人', '工作負載', '長條圖']
      },
      {
        id: 'builtin-priority-distribution',
        name: '優先級分佈',
        description: '以甜甜圈圖顯示任務優先級的分佈',
        category: 'task-analysis',
        config: {
          name: '優先級分佈',
          description: '以甜甜圈圖顯示任務優先級的分佈',
          chartType: 'doughnut',
          dimension: 'priorityId',
          aggregation: 'percentage',
          isTemplate: false,
          isPublic: false,
          order: 0,
          isActive: true
        },
        isBuiltIn: true,
        usageCount: 0,
        tags: ['優先級', '分佈', '甜甜圈圖']
      }
    ]
  }
}