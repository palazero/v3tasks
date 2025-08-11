/**
 * 欄位配置服務
 * 處理欄位配置的邏輯和轉換
 */

import type { ColumnConfig, CustomFieldDefinition, ViewType } from '@/types'
import {
  type FieldDefinition,
  getFieldsForView,
  getDefaultVisibleFields,
  getRequiredFields,
  customFieldToFieldDefinition
} from '@/config/columnDefinitions'

export class ColumnConfigService {
  /**
   * 取得視圖的預設欄位配置
   */
  getDefaultColumns(
    viewType: ViewType,
    customFields: CustomFieldDefinition[] = []
  ): ColumnConfig[] {
    // 取得該視圖的所有可用欄位
    const fields = getFieldsForView(viewType as any, customFields)
    const defaultVisible = getDefaultVisibleFields(viewType as any, customFields)
    
    // 轉換為欄位配置
    return fields.map((field, index) => ({
      key: field.key,
      label: field.label,
      visible: defaultVisible.includes(field.key),
      width: field.defaultWidth,
      order: index,
      required: field.required,
      sortable: field.sortable,
      resizable: !['actions', 'checkbox'].includes(field.key)
    }))
  }

  /**
   * 合併現有配置與新的欄位定義
   * 保留用戶的設定，同時添加新欄位
   */
  mergeWithFieldDefinitions(
    existingConfig: ColumnConfig[],
    fieldDefinitions: FieldDefinition[]
  ): ColumnConfig[] {
    // 建立現有配置的映射
    const configMap = new Map<string, ColumnConfig>()
    existingConfig.forEach(config => {
      configMap.set(config.key, config)
    })
    
    // 建立結果陣列
    const mergedConfig: ColumnConfig[] = []
    const processedKeys = new Set<string>()
    
    // 先處理現有配置中的欄位（保持用戶的順序）
    existingConfig.forEach(config => {
      const fieldDef = fieldDefinitions.find(f => f.key === config.key)
      if (fieldDef) {
        // 合併欄位定義和現有配置
        mergedConfig.push({
          ...config,
          label: fieldDef.label, // 使用最新的標籤
          width: config.width || fieldDef.defaultWidth, // 保留現有寬度或使用預設值
          required: fieldDef.required,
          sortable: fieldDef.sortable,
          minWidth: fieldDef.minWidth,
          maxWidth: fieldDef.maxWidth
        })
        processedKeys.add(config.key)
      }
    })
    
    // 添加新的欄位（未在現有配置中的）
    fieldDefinitions.forEach(fieldDef => {
      if (!processedKeys.has(fieldDef.key)) {
        mergedConfig.push({
          key: fieldDef.key,
          label: fieldDef.label,
          visible: fieldDef.defaultVisible,
          width: fieldDef.defaultWidth,
          order: mergedConfig.length,
          required: fieldDef.required,
          sortable: fieldDef.sortable,
          resizable: !['actions', 'checkbox'].includes(fieldDef.key)
        })
      }
    })
    
    // 重新排序
    mergedConfig.forEach((config, index) => {
      config.order = index
    })
    
    return mergedConfig
  }

  /**
   * 合併系統欄位和自訂欄位
   */
  mergeWithCustomFields(
    systemColumns: ColumnConfig[],
    customFields: CustomFieldDefinition[]
  ): ColumnConfig[] {
    // 轉換自訂欄位為欄位配置
    const customFieldConfigs = customFields.map((field, index) => {
      const fieldDef = customFieldToFieldDefinition(field)
      return {
        key: fieldDef.key,
        label: fieldDef.label,
        visible: false, // 自訂欄位預設隱藏
        width: fieldDef.defaultWidth,
        order: systemColumns.length + index,
        required: fieldDef.required,
        sortable: true,
        resizable: true
      } as ColumnConfig
    })
    
    return [...systemColumns, ...customFieldConfigs]
  }

  /**
   * 驗證欄位配置
   */
  validateColumnConfig(
    config: ColumnConfig[],
    viewType: ViewType
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const requiredFields = getRequiredFields(viewType as any)
    
    // 檢查必要欄位
    requiredFields.forEach(requiredKey => {
      const column = config.find(c => c.key === requiredKey)
      if (!column || !column.visible) {
        errors.push(`必要欄位 "${requiredKey}" 必須顯示`)
      }
    })
    
    // 檢查重複的 key
    const keys = new Set<string>()
    config.forEach(column => {
      if (keys.has(column.key)) {
        errors.push(`欄位 key "${column.key}" 重複`)
      }
      keys.add(column.key)
    })
    
    // 檢查順序值
    const orders = config.map(c => c.order || 0)
    const uniqueOrders = new Set(orders)
    if (uniqueOrders.size !== orders.length) {
      errors.push('欄位順序值有重複')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 遷移舊版配置格式
   */
  migrateOldConfig(oldConfig: any): ColumnConfig[] | null {
    // 如果已經是新格式，直接返回
    if (Array.isArray(oldConfig) && oldConfig.length > 0) {
      const firstItem = oldConfig[0]
      if ('key' in firstItem && 'visible' in firstItem) {
        return oldConfig as ColumnConfig[]
      }
    }
    
    // 嘗試從舊格式遷移
    if (oldConfig && typeof oldConfig === 'object') {
      // 舊格式範例: { visibleFields: ['title', 'status'], columnWidths: { title: 300 } }
      if ('visibleFields' in oldConfig && Array.isArray(oldConfig.visibleFields)) {
        const visibleFields = new Set(oldConfig.visibleFields)
        const columnWidths = oldConfig.columnWidths || {}
        
        // 建立新格式配置
        const newConfig: ColumnConfig[] = []
        oldConfig.visibleFields.forEach((key: string, index: number) => {
          newConfig.push({
            key,
            label: key, // 標籤會在合併時更新
            visible: true,
            width: columnWidths[key] || undefined,
            order: index
          })
        })
        
        return newConfig
      }
    }
    
    return null
  }

  /**
   * 根據視圖類型過濾欄位配置
   */
  filterColumnsForView(
    columns: ColumnConfig[],
    viewType: ViewType,
    fieldDefinitions: FieldDefinition[]
  ): ColumnConfig[] {
    // 建立欄位定義映射
    const fieldDefMap = new Map<string, FieldDefinition>()
    fieldDefinitions.forEach(def => {
      fieldDefMap.set(def.key, def)
    })
    
    // 過濾適用於該視圖的欄位
    return columns.filter(column => {
      const fieldDef = fieldDefMap.get(column.key)
      if (!fieldDef) return false
      
      return fieldDef.applicableViews.includes(viewType as any)
    })
  }

  /**
   * 排序欄位配置
   */
  sortColumns(columns: ColumnConfig[]): ColumnConfig[] {
    return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  /**
   * 取得可見欄位
   */
  getVisibleColumns(columns: ColumnConfig[]): ColumnConfig[] {
    return columns.filter(c => c.visible)
  }

  /**
   * 更新欄位順序
   */
  updateColumnOrder(columns: ColumnConfig[]): ColumnConfig[] {
    return columns.map((col, index) => ({
      ...col,
      order: index
    }))
  }

  /**
   * 將欄位配置轉換為表格欄位定義（用於 q-table）
   */
  toTableColumns(
    columns: ColumnConfig[],
    fieldDefinitions: FieldDefinition[]
  ): any[] {
    // 建立欄位定義映射
    const fieldDefMap = new Map<string, FieldDefinition>()
    fieldDefinitions.forEach(def => {
      fieldDefMap.set(def.key, def)
    })
    
    return this.getVisibleColumns(this.sortColumns(columns))
      .map(column => {
        const fieldDef = fieldDefMap.get(column.key)
        
        return {
          name: column.key,
          label: column.label,
          field: column.key,
          align: column.key === 'title' ? 'left' : 'center',
          sortable: column.sortable !== false,
          style: column.width ? `width: ${column.width}px` : undefined,
          required: column.required,
          format: fieldDef?.renderType === 'date' ? 
            (val: any) => this.formatDate(val) : undefined
        }
      })
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return '-'
    
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
}

// 建立單例實例
let columnConfigServiceInstance: ColumnConfigService | null = null

/**
 * 取得 ColumnConfigService 實例
 */
export function getColumnConfigService(): ColumnConfigService {
  if (!columnConfigServiceInstance) {
    columnConfigServiceInstance = new ColumnConfigService()
  }
  return columnConfigServiceInstance
}