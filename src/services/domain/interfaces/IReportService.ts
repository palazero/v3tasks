/**
 * 報表服務介面
 * @description 定義報表業務邏輯的服務介面，遵循企業架構規範
 */

import type { 
  ReportConfig, 
  ReportTemplate, 
  ReportQuery,
  CreateReportRequest,
  UpdateReportRequest 
} from '@/types/report'

/**
 * 報表服務介面
 */
export interface IReportService {
  /**
   * 根據專案 ID 取得報表列表
   * @param projectId - 專案 ID，'all' 表示全域報表
   * @returns 報表配置陣列
   */
  getReportsByProject(projectId: string): Promise<ReportConfig[]>

  /**
   * 根據用戶 ID 取得個人報表
   * @param userId - 用戶 ID
   * @param projectId - 可選的專案 ID 篩選
   * @returns 用戶報表配置陣列
   */
  getReportsByUser(userId: string, projectId?: string): Promise<ReportConfig[]>

  /**
   * 根據查詢條件取得報表
   * @param query - 查詢參數
   * @returns 符合條件的報表配置陣列
   */
  getReports(query: ReportQuery): Promise<ReportConfig[]>

  /**
   * 根據 ID 取得單一報表
   * @param reportId - 報表 ID
   * @returns 報表配置或 undefined
   */
  getReportById(reportId: string): Promise<ReportConfig | undefined>

  /**
   * 建立新報表
   * @param request - 建立報表請求
   * @returns 建立的報表配置
   */
  createReport(request: CreateReportRequest): Promise<ReportConfig>

  /**
   * 更新報表
   * @param reportId - 報表 ID
   * @param updates - 更新欄位
   * @returns 更新後的報表配置
   */
  updateReport(reportId: string, updates: UpdateReportRequest): Promise<ReportConfig>

  /**
   * 刪除報表
   * @param reportId - 報表 ID
   * @returns void
   */
  deleteReport(reportId: string): Promise<void>

  /**
   * 複製報表
   * @param reportId - 原報表 ID
   * @param newName - 新報表名稱
   * @param targetProjectId - 目標專案 ID（可選）
   * @returns 複製的報表配置
   */
  duplicateReport(reportId: string, newName: string, targetProjectId?: string): Promise<ReportConfig>

  /**
   * 取得報表範本列表
   * @param category - 可選的範本分類篩選
   * @returns 報表範本陣列
   */
  getReportTemplates(category?: string): Promise<ReportTemplate[]>

  /**
   * 從範本建立報表
   * @param templateId - 範本 ID
   * @param customization - 自訂配置
   * @returns 建立的報表配置
   */
  createReportFromTemplate(templateId: string, customization: CreateReportRequest): Promise<ReportConfig>

  /**
   * 批量刪除報表
   * @param reportIds - 報表 ID 陣列
   * @returns void
   */
  batchDeleteReports(reportIds: string[]): Promise<void>

  /**
   * 匯出報表配置
   * @param reportId - 報表 ID
   * @returns 報表配置 JSON 字串
   */
  exportReportConfig(reportId: string): Promise<string>

  /**
   * 匯入報表配置
   * @param configJson - 報表配置 JSON 字串
   * @param targetProjectId - 目標專案 ID
   * @returns 匯入的報表配置
   */
  importReportConfig(configJson: string, targetProjectId: string): Promise<ReportConfig>

  /**
   * 驗證報表配置
   * @param config - 報表配置
   * @returns 驗證結果
   */
  validateReportConfig(config: Partial<ReportConfig>): Promise<{
    isValid: boolean
    errors: Array<{ field: string; message: string }>
  }>

  /**
   * 取得報表使用統計
   * @param reportId - 報表 ID
   * @returns 統計資料
   */
  getReportUsageStats(reportId: string): Promise<{
    viewCount: number
    lastAccessedAt?: Date
    accessHistory: Array<{ accessedAt: Date; userId: string }>
  }>
}

/**
 * 報表服務錯誤類型
 */
export class ReportServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ReportServiceError'
  }
}

/**
 * 報表不存在錯誤
 */
export class ReportNotFoundError extends ReportServiceError {
  constructor(reportId: string) {
    super(`報表不存在: ${reportId}`, 'REPORT_NOT_FOUND', 404)
  }
}

/**
 * 報表驗證錯誤
 */
export class ReportValidationError extends ReportServiceError {
  constructor(message: string, public validationErrors: Array<{ field: string; message: string }>) {
    super(message, 'REPORT_VALIDATION_ERROR', 400)
  }
}

/**
 * 報表權限錯誤
 */
export class ReportPermissionError extends ReportServiceError {
  constructor(operation: string) {
    super(`沒有權限執行操作: ${operation}`, 'REPORT_PERMISSION_DENIED', 403)
  }
}