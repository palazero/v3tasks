/**
 * 自訂欄位服務
 * 處理自訂欄位的 CRUD 操作和驗證
 */

import { getDatabase } from './db/database';
import type { CustomField, FieldType } from '@/types';
import { nanoid } from 'nanoid';

export class CustomFieldService {
  private readonly fieldsTableName = 'customFields';

  /**
   * 清理資料，移除不可序列化的屬性
   */
  private sanitizeData<T>(data: T): T {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // 移除函數、Symbol、undefined 和循環引用
    const cleanObject = (obj: T): T => {
      if (obj === null || obj === undefined) return obj;
      if (obj instanceof Date) return obj;
      if (Array.isArray(obj)) return obj.map((item) => cleanObject(item)) as T;

      if (typeof obj === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'function') continue;
          if (typeof value === 'symbol') continue;
          if (value === undefined) continue;
          if (key === 'children') continue;

          cleaned[key] = cleanObject(value as T);
        }
        return cleaned as T;
      }

      return obj;
    };

    return cleanObject(sanitized);
  }

  // ============= 自訂欄位 CRUD =============

  /**
   * 建立自訂欄位
   */
  async createCustomField(
    field: Omit<CustomField, 'fieldId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const db = getDatabase();

    const newField: CustomField = {
      ...field,
      fieldId: nanoid(12),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.customFields.add(this.sanitizeData(newField));
    return newField.fieldId;
  }

  /**
   * 取得專案的所有自訂欄位
   */
  async getProjectCustomFields(projectId: string): Promise<CustomField[]> {
    const db = getDatabase();

    return await db.customFields.where('projectId').equals(projectId).sortBy('displayOrder');
  }

  /**
   * 取得特定自訂欄位
   */
  async getCustomField(fieldId: string): Promise<CustomField | null> {
    const db = getDatabase();

    const field = await db.customFields.where('fieldId').equals(fieldId).first();

    return field || null;
  }

  /**
   * 更新自訂欄位
   */
  async updateCustomField(fieldId: string, updates: Partial<CustomField>): Promise<void> {
    const db = getDatabase();

    await db.customFields
      .where('fieldId')
      .equals(fieldId)
      .modify({
        ...updates,
        updatedAt: new Date(),
      });
  }

  /**
   * 刪除自訂欄位
   */
  async deleteCustomField(fieldId: string): Promise<void> {
    const db = getDatabase();

    await db.customFields.where('fieldId').equals(fieldId).delete();

    // 清理任務中的自訂欄位值
    const tasks = await db.tasks.toArray();
    for (const task of tasks) {
      if (task.customFields && task.customFields.length > 0) {
        task.customFields = task.customFields.filter(cf => cf.fieldId !== fieldId);
        await db.tasks.put(task);
      }
    }
  }

  /**
   * 複製自訂欄位
   */
  async duplicateCustomField(fieldId: string, newName: string): Promise<string> {
    const originalField = await this.getCustomField(fieldId);
    if (!originalField) {
      throw new Error('找不到要複製的欄位');
    }

    const duplicatedField = {
      ...originalField,
      name: newName,
      displayOrder: originalField.displayOrder + 1,
    };

    return await this.createCustomField(duplicatedField);
  }

  // ============= 自訂欄位群組 CRUD =============


  // ============= 欄位驗證 =============

  /**
   * 驗證欄位值
   */
  validateFieldValue(field: CustomField, value: unknown): { isValid: boolean; error?: string } {
    // 必填欄位檢查
    if (field.isRequired && (value === null || value === undefined || value === '')) {
      return { isValid: false, error: `${field.name} 為必填欄位` };
    }

    // 如果沒有值且非必填，跳過驗證
    if (!field.isRequired && (value === null || value === undefined || value === '')) {
      return { isValid: true };
    }

    return this.validateByType(field, value);
  }

  /**
   * 根據欄位類型驗證
   */
  private validateByType(field: CustomField, value: unknown): { isValid: boolean; error?: string } {
    const validation = field.validation;

    if (field.type === 'text') {
      if (typeof value !== 'string') {
        return { isValid: false, error: '必須為文字類型' };
      }

      if (validation?.minLength && value.length < validation.minLength) {
        return { isValid: false, error: `最少需要 ${validation.minLength} 個字元` };
      }

      if (validation?.maxLength && value.length > validation.maxLength) {
        return { isValid: false, error: `最多允許 ${validation.maxLength} 個字元` };
      }

      if (validation?.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return { isValid: false, error: validation.errorMessage || '格式不正確' };
        }
      }
    } else if (field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return { isValid: false, error: '必須為數字類型' };
      }

      if (validation?.min !== undefined && numValue < validation.min) {
        return { isValid: false, error: `數值不能小於 ${validation.min}` };
      }

      if (validation?.max !== undefined && numValue > validation.max) {
        return { isValid: false, error: `數值不能大於 ${validation.max}` };
      }
    } else if (field.type === 'date') {
      if (!(value instanceof Date) && typeof value !== 'string') {
        return { isValid: false, error: '必須為日期類型' };
      }

      const dateValue = value instanceof Date ? value : new Date(value);
      if (isNaN(dateValue.getTime())) {
        return { isValid: false, error: '日期格式不正確' };
      }
    } else if (field.type === 'select') {
      if (!field.options?.some((option) => option.value === value)) {
        return { isValid: false, error: '選擇的值無效' };
      }
    } else if (field.type === 'multiSelect') {
      if (!Array.isArray(value)) {
        return { isValid: false, error: '必須為陣列類型' };
      }

      const validOptions = field.options?.map((option) => option.value) || [];
      const invalidValues = (value as unknown[]).filter((v) => !validOptions.includes(String(v)));

      if (invalidValues.length > 0) {
        return { isValid: false, error: '包含無效的選項' };
      }
    }

    return { isValid: true };
  }

  // ============= 欄位值操作 =============

  /**
   * 格式化顯示值
   */
  formatDisplayValue(field: CustomField, value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (field.type === 'select') {
      const option = field.options?.find((opt) => opt.value === value);
      if (option?.label) return option.label;
      // 安全轉換為字串
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
      return '-';
    } else if (field.type === 'multiSelect') {
      if (!Array.isArray(value)) return '-';

      const labels = (value as unknown[])
        .map((v) => {
          const option = field.options?.find((opt) => opt.value === v);
          if (option?.label) return option.label;
          // 安全轉換為字串
          if (typeof v === 'string') return v;
          if (typeof v === 'number' || typeof v === 'boolean') return v.toString();
          return null;
        })
        .filter(Boolean);

      return labels.join(', ') || '-';
    } else if (field.type === 'date') {
      const dateValue = value instanceof Date ? value : new Date(value as string);
      if (isNaN(dateValue.getTime())) return '-';

      return dateValue.toLocaleDateString('zh-TW');
    } else if (field.type === 'checkbox') {
      return value ? '是' : '否';
    } else {
      // 安全轉換為字串
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
      if (value instanceof Date) return value.toLocaleDateString('zh-TW');
      return '-';
    }
  }

  /**
   * 取得欄位預設值
   */
  getFieldDefaultValue(field: CustomField): unknown {
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    if (field.type === 'text') return '';
    if (field.type === 'number') return 0;
    if (field.type === 'date') return null;
    if (field.type === 'select') return null;
    if (field.type === 'multiSelect') return [];
    if (field.type === 'checkbox') return false;
    if (field.type === 'user') return null;

    return null;
  }

  // ============= 批次操作 =============

  /**
   * 重新排序自訂欄位
   */
  async reorderCustomFields(projectId: string, fieldIds: string[]): Promise<void> {
    const db = getDatabase();

    for (let i = 0; i < fieldIds.length; i++) {
      const fieldId = fieldIds[i];
      if (fieldId) {
        await db.customFields
          .where('fieldId')
          .equals(fieldId)
          .modify({
            displayOrder: (i + 1) * 1000,
            updatedAt: new Date(),
          });
      }
    }
  }

  /**
   * 批次更新欄位可見性
   */
  async updateFieldsVisibility(fieldIds: string[], isVisible: boolean): Promise<void> {
    for (const fieldId of fieldIds) {
      await this.updateCustomField(fieldId, { isVisible });
    }
  }

  // ============= 匯入匯出 =============

  /**
   * 匯出專案自訂欄位
   */
  async exportProjectCustomFields(projectId: string): Promise<string> {
    const fields = await this.getProjectCustomFields(projectId);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projectId,
      fields,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 匯入專案自訂欄位
   */
  async importProjectCustomFields(
    projectId: string,
    data: string,
  ): Promise<{ fieldsCount: number }> {
    try {
      const importData = JSON.parse(data);

      if (!importData.fields || !Array.isArray(importData.fields)) {
        throw new Error('匯入資料格式錯誤');
      }

      let fieldsCount = 0;

      // 匯入欄位
      for (const field of importData.fields) {
        await this.createCustomField({
          ...field,
          projectId,
        });
        fieldsCount++;
      }

      return { fieldsCount };
    } catch (error) {
      throw new Error('匯入自訂欄位失敗：' + (error as Error).message);
    }
  }

  // ============= 系統預設欄位 =============

  /**
   * 初始化專案預設自訂欄位
   */
  async initializeDefaultFields(projectId: string, createdBy: string): Promise<void> {
    // 建立預設欄位
    const defaultFields = [
      {
        name: '客戶',
        description: '負責的客戶或部門',
        type: 'text' as FieldType,
        isRequired: false,
        isSystem: true,
        displayOrder: 1000,
        isVisible: true,
      },
      {
        name: '專案版本',
        description: '關聯的專案版本',
        type: 'select' as FieldType,
        isRequired: false,
        isSystem: true,
        options: [
          { value: 'v1.0', label: 'V1.0' },
          { value: 'v1.1', label: 'V1.1' },
          { value: 'v2.0', label: 'V2.0' },
        ],
        displayOrder: 2000,
        isVisible: true,
      },
      {
        name: '預估時數',
        description: '完成任務的預估工作時數',
        type: 'number' as FieldType,
        isRequired: false,
        isSystem: true,
        validation: { min: 0, max: 999 },
        displayOrder: 3000,
        isVisible: true,
      },
      {
        name: '實際時數',
        description: '實際花費的工作時數',
        type: 'number' as FieldType,
        isRequired: false,
        isSystem: true,
        validation: { min: 0, max: 999 },
        displayOrder: 4000,
        isVisible: true,
      },
      {
        name: '緊急程度',
        description: '任務的緊急程度',
        type: 'select' as FieldType,
        isRequired: false,
        isSystem: true,
        options: [
          { value: 'low', label: '低', color: 'green' },
          { value: 'medium', label: '中', color: 'orange' },
          { value: 'high', label: '高', color: 'red' },
          { value: 'critical', label: '緊急', color: 'purple' },
        ],
        displayOrder: 5000,
        isVisible: false,
      },
    ];

    for (const field of defaultFields) {
      await this.createCustomField({
        ...field,
        projectId,
        createdBy,
      });
    }
  }
}

// 單例實例
export const customFieldService = new CustomFieldService();
