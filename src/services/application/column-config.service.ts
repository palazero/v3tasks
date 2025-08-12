/**
 * 欄位配置應用服務實作
 * 協調欄位配置的業務邏輯
 */

import type { IColumnConfigService } from './interfaces/IColumnConfigService'
import type { ColumnConfig, CustomFieldDefinition, ViewType } from '@/types'
import {
  type FieldDefinition,
  getFieldsForView,
  getDefaultVisibleFields,
  getRequiredFields,
  customFieldToFieldDefinition
} from '@/config/columnDefinitions'
import { getProjectRepository } from '../repositories'

export class ColumnConfigService implements IColumnConfigService {
  /**
   * 取得視圖的預設欄位配置（支援多種調用方式）
   */
  getDefaultColumns(
    viewType: ViewType,
    projectIdOrCustomFields?: string | CustomFieldDefinition[],
    includeCustomFields: boolean = true
  ): ColumnConfig[] {
    let customFields: CustomFieldDefinition[] = []
    
    // 處理不同的參數類型
    if (Array.isArray(projectIdOrCustomFields)) {
      // 直接傳入 customFields
      customFields = projectIdOrCustomFields
    } else if (typeof projectIdOrCustomFields === 'string' && includeCustomFields) {
      // 傳入 projectId，需要異步載入（但這裡先返回同步結果）
      console.warn('getDefaultColumns: 同步方法無法載入專案自訂欄位，請使用 getDefaultColumnsAsync')
      customFields = []
    }

    // 取得該視圖的所有可用欄位
    const fields = getFieldsForView(viewType as 'table' | 'list' | 'gantt' | 'board', customFields)
    const defaultVisible = getDefaultVisibleFields(viewType as 'table' | 'list' | 'gantt' | 'board', customFields)
    
    // 轉換為欄位配置
    return fields.map((field, index) => ({
      key: field.key,
      label: field.label,
      visible: defaultVisible.includes(field.key),
      width: field.defaultWidth,
      order: index,
      required: field.required ?? false,
      sortable: field.sortable ?? true,
      resizable: !['actions', 'checkbox'].includes(field.key)
    }))
  }

  /**
   * 取得視圖的預設欄位配置（異步版本，用於從 projectId 載入）
   */
  async getDefaultColumnsAsync(
    viewType: ViewType,
    projectId?: string,
    includeCustomFields: boolean = true
  ): Promise<ColumnConfig[]> {
    let customFields: CustomFieldDefinition[] = []
    
    if (includeCustomFields && projectId) {
      const projectRepo = getProjectRepository()
      const project = await projectRepo.findById(projectId)
      customFields = project?.customFields || []
    }

    return this.getDefaultColumns(viewType, customFields, includeCustomFields)
  }

  /**
   * 取得欄位定義（包含自訂欄位）
   */
  async getFieldDefinitions(
    viewType: ViewType,
    projectId?: string
  ): Promise<FieldDefinition[]> {
    let customFields: CustomFieldDefinition[] = []
    
    if (projectId) {
      const projectRepo = getProjectRepository()
      const project = await projectRepo.findById(projectId)
      customFields = project?.customFields || []
    }

    return getFieldsForView(viewType as 'table' | 'list' | 'gantt' | 'board', customFields)
  }

  /**
   * 合併現有欄位配置與欄位定義
   * 用於保持現有配置並加入新的欄位定義
   */
  mergeWithFieldDefinitions(
    existingColumns: ColumnConfig[],
    fieldDefinitions: FieldDefinition[]
  ): ColumnConfig[] {
    // 建立現有欄位的映射表
    const existingMap = new Map(existingColumns.map(col => [col.key, col]))
    
    // 根據欄位定義生成配置，保留現有設定
    const mergedColumns: ColumnConfig[] = fieldDefinitions.map((field, index) => {
      const existing = existingMap.get(field.key)
      
      return {
        key: field.key,
        label: field.label,
        visible: existing?.visible ?? (field.defaultVisible ?? true),
        width: existing?.width ?? field.defaultWidth,
        order: existing?.order ?? index,
        required: field.required ?? false,
        sortable: existing?.sortable ?? (field.sortable ?? true),
        resizable: existing?.resizable ?? (!['actions', 'checkbox'].includes(field.key))
      }
    })
    
    // 按 order 排序
    return mergedColumns.sort((a, b) => a.order - b.order)
  }

  /**
   * 合併系統欄位和自訂欄位配置
   */
  async mergeFieldConfigurations(
    systemColumns: ColumnConfig[],
    customFields: CustomFieldDefinition[],
    viewType: ViewType
  ): Promise<ColumnConfig[]> {
    // 轉換自訂欄位為欄位定義
    const customFieldDefinitions = customFields.map(customFieldToFieldDefinition)
    
    // 建立自訂欄位的欄位配置
    const customColumnConfigs: ColumnConfig[] = customFieldDefinitions.map((field, index) => ({
      key: field.key,
      label: field.label,
      visible: false, // 自訂欄位預設隱藏
      width: field.defaultWidth,
      order: systemColumns.length + index,
      required: false,
      sortable: field.sortable ?? true,
      resizable: true
    }))

    return [...systemColumns, ...customColumnConfigs]
  }

  /**
   * 驗證欄位配置
   */
  async validateColumnConfig(config: ColumnConfig[]): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // 檢查必要欄位
    const requiredFields = ['title'] // 最基本的必要欄位
    const configKeys = config.map(c => c.key)
    
    for (const requiredField of requiredFields) {
      if (!configKeys.includes(requiredField)) {
        errors.push(`缺少必要欄位: ${requiredField}`)
      }
    }

    // 檢查重複的 key
    const keySet = new Set<string>()
    for (const column of config) {
      if (keySet.has(column.key)) {
        errors.push(`重複的欄位 key: ${column.key}`)
      }
      keySet.add(column.key)
    }

    // 檢查順序值
    const orders = config.map(c => c.order).filter(order => order !== undefined)
    const uniqueOrders = new Set(orders)
    if (orders.length !== uniqueOrders.size) {
      errors.push('存在重複的順序值')
    }

    // 檢查寬度值
    for (const column of config) {
      if (column.width !== undefined && (column.width < 50 || column.width > 1000)) {
        errors.push(`欄位 ${column.key} 的寬度不在合理範圍內 (50-1000px)`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 優化欄位配置
   */
  async optimizeColumnConfig(
    config: ColumnConfig[],
    viewType: ViewType
  ): Promise<ColumnConfig[]> {
    // 移除無效或不支援的欄位
    const validFields = await this.getFieldDefinitions(viewType)
    const validKeys = new Set(validFields.map(f => f.key))
    
    let optimizedConfig = config.filter(column => validKeys.has(column.key))

    // 重新排序
    optimizedConfig = optimizedConfig
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((column, index) => ({
        ...column,
        order: index
      }))

    // 確保至少有一個可見欄位
    const hasVisibleField = optimizedConfig.some(c => c.visible)
    if (!hasVisibleField && optimizedConfig.length > 0) {
      optimizedConfig[0].visible = true
    }

    return optimizedConfig
  }

  /**
   * 取得欄位配置統計
   */
  async getColumnStatistics(config: ColumnConfig[]): Promise<{
    totalFields: number
    visibleFields: number
    hiddenFields: number
    requiredFields: number
    customFields: number
  }> {
    const totalFields = config.length
    const visibleFields = config.filter(c => c.visible).length
    const hiddenFields = totalFields - visibleFields
    const requiredFields = config.filter(c => c.required).length
    
    // 自訂欄位通常以特定前綴開頭或在特定範圍內
    const customFields = config.filter(c => 
      c.key.startsWith('custom_') || 
      c.key.includes('field_')
    ).length

    return {
      totalFields,
      visibleFields,
      hiddenFields,
      requiredFields,
      customFields
    }
  }

  /**
   * 重置欄位配置為預設值
   */
  async resetToDefaults(
    viewType: ViewType,
    projectId?: string
  ): Promise<ColumnConfig[]> {
    return await this.getDefaultColumns(viewType, projectId)
  }

  /**
   * 匯出欄位配置
   */
  async exportColumnConfig(config: ColumnConfig[]): Promise<string> {
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config: config
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 匯入欄位配置
   */
  async importColumnConfig(
    configData: string,
    viewType: ViewType
  ): Promise<ColumnConfig[]> {
    try {
      const importData = JSON.parse(configData)
      
      if (!importData.config || !Array.isArray(importData.config)) {
        throw new Error('無效的配置資料格式')
      }

      const config = importData.config as ColumnConfig[]
      
      // 驗證匯入的配置
      const validation = await this.validateColumnConfig(config)
      if (!validation.isValid) {
        throw new Error(`配置驗證失敗: ${validation.errors.join(', ')}`)
      }

      // 優化配置
      return await this.optimizeColumnConfig(config, viewType)
    } catch (error) {
      throw new Error(`匯入配置失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }
}

// 建立單例實例
export const columnConfigService = new ColumnConfigService()

// 保持向後兼容的函數導出
export function getColumnConfigService(): ColumnConfigService {
  return columnConfigService
}