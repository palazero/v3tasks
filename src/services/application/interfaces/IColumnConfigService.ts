/**
 * 欄位配置應用服務介面
 * 協調欄位配置的業務邏輯
 */

import type { ColumnConfig, ViewType, CustomFieldDefinition } from '@/types'
import type { FieldDefinition } from '@/config/columnDefinitions'

export interface IColumnConfigService {
  /**
   * 取得視圖的預設欄位配置（同步版本）
   */
  getDefaultColumns(
    viewType: ViewType,
    projectIdOrCustomFields?: string | CustomFieldDefinition[],
    includeCustomFields?: boolean
  ): ColumnConfig[]

  /**
   * 取得視圖的預設欄位配置（異步版本）
   */
  getDefaultColumnsAsync(
    viewType: ViewType,
    projectId?: string,
    includeCustomFields?: boolean
  ): Promise<ColumnConfig[]>

  /**
   * 取得欄位定義（包含自訂欄位）
   */
  getFieldDefinitions(
    viewType: ViewType,
    projectId?: string
  ): Promise<FieldDefinition[]>

  /**
   * 合併現有欄位配置與欄位定義
   */
  mergeWithFieldDefinitions(
    existingColumns: ColumnConfig[],
    fieldDefinitions: FieldDefinition[]
  ): ColumnConfig[]

  /**
   * 合併系統欄位和自訂欄位配置
   */
  mergeFieldConfigurations(
    systemColumns: ColumnConfig[],
    customFields: CustomFieldDefinition[],
    viewType: ViewType
  ): Promise<ColumnConfig[]>

  /**
   * 驗證欄位配置
   */
  validateColumnConfig(config: ColumnConfig[]): Promise<{
    isValid: boolean
    errors: string[]
  }>

  /**
   * 優化欄位配置（移除無效欄位、調整順序等）
   */
  optimizeColumnConfig(
    config: ColumnConfig[],
    viewType: ViewType
  ): Promise<ColumnConfig[]>

  /**
   * 取得欄位配置統計
   */
  getColumnStatistics(config: ColumnConfig[]): Promise<{
    totalFields: number
    visibleFields: number
    hiddenFields: number
    requiredFields: number
    customFields: number
  }>

  /**
   * 重置欄位配置為預設值
   */
  resetToDefaults(
    viewType: ViewType,
    projectId?: string
  ): Promise<ColumnConfig[]>

  /**
   * 匯出欄位配置
   */
  exportColumnConfig(config: ColumnConfig[]): Promise<string>

  /**
   * 匯入欄位配置
   */
  importColumnConfig(
    configData: string,
    viewType: ViewType
  ): Promise<ColumnConfig[]>
}