/**
 * 統一的欄位定義系統
 * 定義所有視圖可用的系統欄位
 */

import type { CustomFieldDefinition } from '@/types'

/**
 * 欄位定義介面
 */
export interface FieldDefinition {
  key: string
  label: string
  type: 'system' | 'custom'
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
  required?: boolean
  applicableViews: ('table' | 'list' | 'gantt' | 'board')[]
  renderType: 'text' | 'date' | 'select' | 'progress' | 'user' | 'priority' | 'status' | 'tags'
  defaultVisible: boolean
  sortable?: boolean
  description?: string
}

/**
 * 系統欄位定義
 */
export const SYSTEM_FIELDS: FieldDefinition[] = [
  {
    key: 'title',
    label: '任務標題',
    type: 'system',
    defaultWidth: 300,
    minWidth: 10,
    maxWidth: 500,
    required: true,
    applicableViews: ['table', 'list', 'gantt'],
    renderType: 'text',
    defaultVisible: true,
    sortable: true,
    description: '任務的名稱或標題'
  },
  {
    key: 'status',
    label: '狀態',
    type: 'system',
    defaultWidth: 120,
    minWidth: 10,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'gantt', 'board'],
    renderType: 'status',
    defaultVisible: true,
    sortable: true,
    description: '任務的當前狀態'
  },
  {
    key: 'assignee',
    label: '指派人員',
    type: 'system',
    defaultWidth: 150,
    minWidth: 100,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'gantt', 'board'],
    renderType: 'user',
    defaultVisible: true,
    sortable: true,
    description: '負責此任務的人員'
  },
  {
    key: 'priority',
    label: '優先級',
    type: 'system',
    defaultWidth: 120,
    minWidth: 10,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'gantt', 'board'],
    renderType: 'priority',
    defaultVisible: true,
    sortable: true,
    description: '任務的優先級別'
  },
  {
    key: 'startDate',
    label: '開始日期',
    type: 'system',
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 500,
    applicableViews: ['table', 'gantt'],
    renderType: 'date',
    defaultVisible: false,
    sortable: true,
    description: '任務的開始日期'
  },
  {
    key: 'deadline',
    label: '截止日期',
    type: 'system',
    defaultWidth: 120,
    minWidth: 10,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'gantt', 'board'],
    renderType: 'date',
    defaultVisible: true,
    sortable: true,
    description: '任務的截止日期'
  },
  {
    key: 'duration',
    label: '工期',
    type: 'system',
    defaultWidth: 80,
    minWidth: 10,
    maxWidth: 500,
    applicableViews: ['table', 'gantt'],
    renderType: 'text',
    defaultVisible: false,
    sortable: true,
    description: '任務的預計工作天數'
  },
  {
    key: 'progress',
    label: '進度',
    type: 'system',
    defaultWidth: 150,
    minWidth: 100,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'gantt'],
    renderType: 'progress',
    defaultVisible: true,
    sortable: true,
    description: '任務的完成進度'
  },
  {
    key: 'tags',
    label: '標籤',
    type: 'system',
    defaultWidth: 200,
    minWidth: 100,
    maxWidth: 500,
    applicableViews: ['table', 'list', 'board'],
    renderType: 'tags',
    defaultVisible: false,
    sortable: false,
    description: '任務的標籤'
  },
  {
    key: 'creator',
    label: '建立者',
    type: 'system',
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 500,
    applicableViews: ['table', 'gantt'],
    renderType: 'user',
    defaultVisible: false,
    sortable: true,
    description: '建立此任務的人員'
  },
  {
    key: 'createdAt',
    label: '建立時間',
    type: 'system',
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 500,
    applicableViews: ['table'],
    renderType: 'date',
    defaultVisible: false,
    sortable: true,
    description: '任務的建立時間'
  },
  {
    key: 'updatedAt',
    label: '更新時間',
    type: 'system',
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 500,
    applicableViews: ['table'],
    renderType: 'date',
    defaultVisible: false,
    sortable: true,
    description: '任務的最後更新時間'
  },
  {
    key: 'description',
    label: '描述',
    type: 'system',
    defaultWidth: 300,
    minWidth: 200,
    maxWidth: 500,
    applicableViews: ['table'],
    renderType: 'text',
    defaultVisible: false,
    sortable: false,
    description: '任務的詳細描述'
  }
]

/**
 * 將自訂欄位定義轉換為欄位定義格式
 */
export function customFieldToFieldDefinition(customField: CustomFieldDefinition): FieldDefinition {
  // 根據欄位類型決定預設寬度
  const getDefaultWidth = (type: string): number => {
    switch (type) {
      case 'text':
      case 'longText':
        return 200
      case 'number':
      case 'currency':
        return 120
      case 'date':
      case 'datetime':
        return 160
      case 'select':
      case 'multiSelect':
        return 150
      case 'checkbox':
        return 80
      case 'user':
        return 150
      case 'url':
      case 'email':
        return 180
      default:
        return 150
    }
  }

  // 根據欄位類型決定渲染類型
  const getRenderType = (type: string): FieldDefinition['renderType'] => {
    switch (type) {
      case 'date':
      case 'datetime':
        return 'date'
      case 'user':
        return 'user'
      case 'select':
      case 'multiSelect':
        return 'select'
      default:
        return 'text'
    }
  }

  return {
    key: `custom_${customField.fieldId}`,
    label: customField.name,
    type: 'custom',
    defaultWidth: getDefaultWidth(customField.type),
    minWidth: 10,
    maxWidth: 500,
    required: customField.isRequired,
    applicableViews: ['table', 'list', 'gantt'], // 自訂欄位預設適用所有視圖
    renderType: getRenderType(customField.type),
    defaultVisible: false, // 自訂欄位預設隱藏
    sortable: true,
    description: `自訂欄位: ${customField.name}`
  }
}

/**
 * 取得特定視圖的可用欄位
 */
export function getFieldsForView(
  viewType: 'table' | 'list' | 'gantt' | 'board',
  customFields: CustomFieldDefinition[] = []
): FieldDefinition[] {
  // 篩選系統欄位
  const systemFields = SYSTEM_FIELDS.filter(field => 
    field.applicableViews.includes(viewType)
  )
  
  // 轉換自訂欄位
  const customFieldDefinitions = customFields.map(customFieldToFieldDefinition)
  
  // 合併並排序（系統欄位在前，自訂欄位在後）
  return [...systemFields, ...customFieldDefinitions]
}

/**
 * 取得預設顯示的欄位
 */
export function getDefaultVisibleFields(
  viewType: 'table' | 'list' | 'gantt' | 'board',
  customFields: CustomFieldDefinition[] = []
): string[] {
  const allFields = getFieldsForView(viewType, customFields)
  return allFields
    .filter(field => field.defaultVisible || field.required)
    .map(field => field.key)
}

/**
 * 取得必要欄位（不可隱藏）
 */
export function getRequiredFields(
  viewType: 'table' | 'list' | 'gantt' | 'board'
): string[] {
  return SYSTEM_FIELDS
    .filter(field => 
      field.required && field.applicableViews.includes(viewType)
    )
    .map(field => field.key)
}

/**
 * 驗證欄位鍵是否有效
 */
export function isValidFieldKey(
  key: string,
  viewType: 'table' | 'list' | 'gantt' | 'board',
  customFields: CustomFieldDefinition[] = []
): boolean {
  const allFields = getFieldsForView(viewType, customFields)
  return allFields.some(field => field.key === key)
}