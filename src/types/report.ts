/**
 * 自訂報表系統類型定義
 * 包含企業級架構所需的請求/響應類型
 */

// ============= 圖表類型 =============

/**
 * 支援的圖表類型
 */
export type ChartType = 
  | 'bar'           // 長條圖
  | 'pie'           // 圓餅圖
  | 'doughnut'      // 甜甜圈圖
  | 'line'          // 線圖
  | 'area'          // 區域圖
  | 'horizontalBar' // 水平長條圖
  | 'stackedBar'    // 堆疊長條圖
  | 'scatter'       // 散點圖

/**
 * 統計維度類型
 */
export type ReportDimension =
  | 'assigneeId'    // 負責人
  | 'statusId'      // 任務狀態
  | 'priorityId'    // 優先級
  | 'projectId'     // 專案
  | 'createdMonth'  // 建立月份
  | 'dueMonth'      // 截止月份
  | 'customField'   // 自訂欄位

/**
 * 聚合計算方式
 */
export type ReportAggregation =
  | 'count'         // 計數
  | 'sum'           // 加總
  | 'average'       // 平均值
  | 'percentage'    // 百分比
  | 'min'           // 最小值
  | 'max'           // 最大值

/**
 * 篩選條件類型
 */
export type FilterOperator =
  | 'equals'        // 等於
  | 'notEquals'     // 不等於
  | 'contains'      // 包含
  | 'notContains'   // 不包含
  | 'greaterThan'   // 大於
  | 'lessThan'      // 小於
  | 'between'       // 介於之間
  | 'in'            // 在範圍內
  | 'notIn'         // 不在範圍內

// ============= 介面定義 =============

/**
 * 報表篩選條件
 */
export interface ReportFilter {
  field: string
  operator: FilterOperator
  value: unknown
  values?: unknown[] // for 'in', 'notIn', 'between'
}

/**
 * 報表配置
 */
export interface ReportConfig {
  id: string
  name: string
  description?: string
  chartType: ChartType
  dimension: ReportDimension
  aggregation: ReportAggregation
  
  // 自訂欄位相關
  customFieldId?: string
  customFieldType?: string
  
  // 篩選條件
  filters?: ReportFilter[]
  
  // 圖表樣式設定
  chartOptions?: ReportChartOptions
  
  // 中繼資料
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isTemplate: boolean
  isPublic: boolean
  projectId?: string // 如果為空則為全域報表
  
  // 排序和顯示
  order: number
  isActive: boolean
}

/**
 * 圖表樣式選項
 */
export interface ReportChartOptions {
  // 顏色設定
  colorScheme?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'custom'
  customColors?: string[]
  
  // 標題和標籤
  showTitle?: boolean
  showLegend?: boolean
  showLabels?: boolean
  showValues?: boolean
  
  // 軸設定
  xAxisLabel?: string
  yAxisLabel?: string
  showGrid?: boolean
  
  // 動畫
  animationEnabled?: boolean
  animationDuration?: number
  
  // 尺寸
  height?: string
  width?: string
  
  // 其他選項
  responsive?: boolean
  maintainAspectRatio?: boolean
}

/**
 * 報表資料點
 */
export interface ReportDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, unknown>
}

/**
 * 報表資料集
 */
export interface ReportDataSet {
  label: string
  data: ReportDataPoint[]
  backgroundColor?: string[]
  borderColor?: string[]
  borderWidth?: number
}

/**
 * 報表結果資料
 */
export interface ReportData {
  config: ReportConfig
  datasets: ReportDataSet[]
  labels: string[]
  totalCount: number
  generatedAt: Date
  
  // 額外統計資訊
  summary?: {
    total: number
    average?: number
    min?: number
    max?: number
  }
}

/**
 * 報表範本
 */
export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: ReportTemplateCategory
  config: Omit<ReportConfig, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'projectId'>
  previewImage?: string
  tags?: string[]
  isBuiltIn: boolean
  usageCount: number
}

/**
 * 報表範本分類
 */
export type ReportTemplateCategory =
  | 'task-analysis'     // 任務分析
  | 'team-performance'  // 團隊績效
  | 'project-overview'  // 專案總覽
  | 'time-tracking'     // 時間追蹤
  | 'custom'            // 自訂

/**
 * 報表建構器狀態
 */
export interface ReportBuilderState {
  currentStep: ReportBuilderStep
  config: Partial<ReportConfig>
  previewData?: ReportData
  isPreviewLoading: boolean
  errors: ReportValidationError[]
}

/**
 * 報表建構步驟
 */
export type ReportBuilderStep =
  | 'source'      // 資料來源選擇
  | 'dimension'   // 維度選擇
  | 'aggregation' // 聚合方式
  | 'chart'       // 圖表類型
  | 'style'       // 樣式設定
  | 'preview'     // 預覽確認

/**
 * 報表驗證錯誤
 */
export interface ReportValidationError {
  field: string
  message: string
  code: string
}

/**
 * 報表匯出選項
 */
export interface ReportExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'excel' | 'json'
  quality?: number
  width?: number
  height?: number
  includeData?: boolean
  includeConfig?: boolean
}

/**
 * 報表查詢參數
 */
export interface ReportQuery {
  projectId?: string
  userId?: string
  isTemplate?: boolean
  isPublic?: boolean
  category?: ReportTemplateCategory
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount'
  sortOrder?: 'asc' | 'desc'
}

// ============= 預設配置 =============

/**
 * 預設圖表選項
 */
export const DEFAULT_CHART_OPTIONS: ReportChartOptions = {
  colorScheme: 'default',
  showTitle: true,
  showLegend: true,
  showLabels: true,
  showValues: false,
  showGrid: true,
  animationEnabled: true,
  animationDuration: 750,
  height: '400px',
  responsive: true,
  maintainAspectRatio: false
}

/**
 * 顏色方案定義
 */
export const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#689f38', '#f9a825'],
  primary: ['#1976d2', '#1565c0', '#0d47a1', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd'],
  secondary: ['#6c757d', '#5a6268', '#495057', '#868e96', '#adb5bd', '#ced4da', '#dee2e6', '#f8f9fa'],
  success: ['#388e3c', '#2e7d32', '#1b5e20', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e8'],
  warning: ['#f57c00', '#ef6c00', '#e65100', '#ffb74d', '#ffcc02', '#ffdb42', '#ffe082', '#fff3c4'],
  error: ['#d32f2f', '#c62828', '#b71c1c', '#ef5350', '#e57373', '#ef9a9a', '#ffcdd2', '#ffebee']
}

/**
 * 維度選項配置
 */
export const DIMENSION_OPTIONS = [
  { value: 'assigneeId', label: '負責人', icon: 'person' },
  { value: 'statusId', label: '任務狀態', icon: 'task_alt' },
  { value: 'priorityId', label: '優先級', icon: 'priority_high' },
  { value: 'projectId', label: '專案', icon: 'folder' },
  { value: 'createdMonth', label: '建立月份', icon: 'date_range' },
  { value: 'dueMonth', label: '截止月份', icon: 'event' },
  { value: 'customField', label: '自訂欄位', icon: 'tune' }
] as const

/**
 * 聚合選項配置
 */
export const AGGREGATION_OPTIONS = [
  { value: 'count', label: '計數', description: '統計項目數量' },
  { value: 'sum', label: '加總', description: '數值欄位加總' },
  { value: 'average', label: '平均值', description: '數值欄位平均' },
  { value: 'percentage', label: '百分比', description: '佔總數百分比' },
  { value: 'min', label: '最小值', description: '最小數值' },
  { value: 'max', label: '最大值', description: '最大數值' }
] as const

/**
 * 圖表類型配置
 */
export const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: '長條圖', icon: 'bar_chart', description: '適合比較不同類別的數值' },
  { value: 'pie', label: '圓餅圖', icon: 'pie_chart', description: '顯示各部分佔總體的比例' },
  { value: 'doughnut', label: '甜甜圈圖', icon: 'donut_large', description: '類似圓餅圖但中心留空' },
  { value: 'line', label: '線圖', icon: 'show_chart', description: '展示趨勢變化' },
  { value: 'area', label: '區域圖', icon: 'area_chart', description: '強調數值趨勢的填充線圖' },
  { value: 'horizontalBar', label: '水平長條圖', icon: 'list', description: '橫向的長條圖' },
  { value: 'stackedBar', label: '堆疊長條圖', icon: 'stacked_bar_chart', description: '多個系列堆疊顯示' },
  { value: 'scatter', label: '散點圖', icon: 'scatter_plot', description: '顯示兩個數值間的關係' }
] as const

// ============= 服務層類型定義 =============

/**
 * 建立報表請求類型
 */
export interface CreateReportRequest {
  name: string
  description?: string
  chartType: ChartType
  dimension: ReportDimension
  aggregation: ReportAggregation
  
  // 自訂欄位相關
  customFieldId?: string
  customFieldType?: string
  
  // 篩選條件
  filters?: ReportFilter[]
  
  // 圖表樣式設定
  chartOptions?: ReportChartOptions
  
  // 中繼資料
  createdBy: string
  isTemplate: boolean
  isPublic: boolean
  projectId?: string // 如果為空則為全域報表
  
  // 排序和顯示
  order: number
  isActive: boolean
}

/**
 * 更新報表請求類型
 */
export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  updatedAt?: Date
}

/**
 * 資料庫報表實體類型
 * 用於資料庫層的實際儲存結構
 */
export interface ReportEntity extends ReportConfig {
  // 資料庫特定欄位
  _id?: string
  _rev?: string
  _created?: number
  _updated?: number
  
  // 索引欄位
  projectCreatedBy?: string // 複合索引用: `${projectId}_${createdBy}`
  projectIsTemplate?: string // 複合索引用: `${projectId}_${isTemplate}`
}

/**
 * 報表資料傳輸物件 (DTO)
 */
export interface ReportDTO {
  id: string
  name: string
  description?: string
  chartType: ChartType
  dimension: ReportDimension
  aggregation: ReportAggregation
  
  // 序列化的複雜欄位
  filtersJson?: string
  chartOptionsJson?: string
  
  // 中繼資料
  createdBy: string
  createdAt: string // ISO 字串格式
  updatedAt: string // ISO 字串格式
  isTemplate: boolean
  isPublic: boolean
  projectId?: string
  order: number
  isActive: boolean
}

/**
 * 報表列表回應類型
 */
export interface ReportListResponse {
  reports: ReportConfig[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

/**
 * 報表操作回應類型
 */
export interface ReportOperationResponse {
  success: boolean
  message: string
  data?: ReportConfig
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * 報表統計資料類型
 */
export interface ReportStats {
  totalReports: number
  reportsByProject: Record<string, number>
  reportsByType: Record<ChartType, number>
  reportsByDimension: Record<ReportDimension, number>
  activeReports: number
  publicReports: number
  templateReports: number
  recentActivity: Array<{
    reportId: string
    action: 'created' | 'updated' | 'deleted' | 'viewed'
    timestamp: Date
    userId: string
  }>
}

/**
 * 報表權限類型
 */
export interface ReportPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canDuplicate: boolean
  canShare: boolean
  canExport: boolean
}

/**
 * 報表篩選建構器類型
 */
export interface ReportFilterBuilder {
  field: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'boolean'
  operators: FilterOperator[]
  options?: Array<{ label: string; value: unknown }>
  placeholder?: string
  validation?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
}

/**
 * 報表預覽資料類型
 */
export interface ReportPreviewData {
  isLoading: boolean
  hasError: boolean
  errorMessage?: string
  chartData?: ReportData
  sampleSize: number
  generatedAt: Date
}

/**
 * 報表匯出配置類型
 */
export interface ReportExportConfig extends ReportExportOptions {
  reportId: string
  userId: string
  includeMetadata: boolean
  customFilename?: string
  watermark?: string
}

/**
 * 報表共享設定類型
 */
export interface ReportSharingSettings {
  reportId: string
  isPublic: boolean
  allowedUsers: string[]
  allowedRoles: string[]
  shareLink?: string
  expiresAt?: Date
  permissions: {
    canView: boolean
    canEdit: boolean
    canComment: boolean
  }
}

/**
 * 報表版本歷史類型
 */
export interface ReportVersion {
  versionId: string
  reportId: string
  version: number
  config: ReportConfig
  changedBy: string
  changedAt: Date
  changeDescription?: string
  changeType: 'created' | 'updated' | 'restored'
}

// ============= 常數定義 =============

/**
 * 報表操作常數
 */
export const REPORT_OPERATIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  DUPLICATE: 'duplicate',
  EXPORT: 'export',
  IMPORT: 'import',
  SHARE: 'share'
} as const

/**
 * 報表事件常數 (符合企業命名規範)
 */
export const REPORT_EVENTS = {
  // 建立相關
  REPORT_CREATE_REQUESTED: 'report-create-requested',
  REPORT_CREATED: 'report-created',
  
  // 更新相關
  REPORT_UPDATE_REQUESTED: 'report-update-requested', 
  REPORT_UPDATED: 'report-updated',
  
  // 刪除相關
  REPORT_DELETE_REQUESTED: 'report-delete-requested',
  REPORT_DELETED: 'report-deleted',
  
  // 查看相關
  REPORT_VIEWED: 'report-viewed',
  REPORT_SELECTED: 'report-selected',
  
  // 其他操作
  REPORT_DUPLICATED: 'report-duplicated',
  REPORT_EXPORTED: 'report-exported',
  REPORT_IMPORTED: 'report-imported',
  
  // 狀態變更
  REPORTS_LOADED: 'reports-loaded',
  REPORTS_LOADING: 'reports-loading',
  REPORTS_ERROR: 'reports-error'
} as const

/**
 * 預設報表配置
 */
export const DEFAULT_REPORT_CONFIG: Omit<ReportConfig, 'id' | 'name' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  description: '',
  chartType: 'bar',
  dimension: 'statusId',
  aggregation: 'count',
  isTemplate: false,
  isPublic: false,
  order: 0,
  isActive: true,
  chartOptions: DEFAULT_CHART_OPTIONS
}

/**
 * 報表驗證規則
 */
export const REPORT_VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[\w\s\-_()[\]{}.,!?@#$%^&*+=|\\:;"'<>~`]+$/
  },
  description: {
    maxLength: 500
  },
  order: {
    min: 0,
    max: 9999
  }
} as const