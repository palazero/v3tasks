/**
 * 自訂欄位管理 Composable
 * 處理自訂欄位的狀態管理和操作
 */

import { ref, computed, watch } from 'vue';
import type { CustomField, CustomFieldValue, FieldType } from '@/types';
import { customFieldService } from '@/services/customFieldService';
import { useCurrentUser } from './useCurrentUser';

export function useCustomFields(projectId: string) {
  const { currentUser } = useCurrentUser();

  // 狀態
  const customFields = ref<CustomField[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const visibleFields = computed(() => {
    return customFields.value.filter((field) => field.isVisible);
  });

  const requiredFields = computed(() => {
    return customFields.value.filter((field) => field.isRequired);
  });

  const fieldsByType = computed(() => {
    const byType: Record<FieldType, CustomField[]> = {
      text: [],
      number: [],
      date: [],
      select: [],
      multiSelect: [],
      user: [],
      checkbox: [],
    };

    customFields.value.forEach((field) => {
      if (byType[field.type]) {
        byType[field.type].push(field);
      }
    });

    return byType;
  });

  /**
   * 載入專案自訂欄位
   */
  async function loadCustomFields(): Promise<void> {
    if (!projectId) return;

    try {
      isLoading.value = true;
      error.value = null;

      const fields = await customFieldService.getProjectCustomFields(projectId);
      customFields.value = fields;
    } catch (err) {
      error.value = '載入自訂欄位失敗';
      console.error('Failed to load custom fields:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 建立自訂欄位
   */
  async function createCustomField(
    field: Omit<CustomField, 'fieldId' | 'createdAt' | 'updatedAt' | 'projectId' | 'createdBy'>,
  ): Promise<string> {
    if (!currentUser.value) {
      throw new Error('需要登入才能建立欄位');
    }

    try {
      const fieldId = await customFieldService.createCustomField({
        ...field,
        projectId,
        createdBy: currentUser.value.userId,
      });

      await loadCustomFields(); // 重新載入
      return fieldId;
    } catch (err) {
      error.value = '建立自訂欄位失敗';
      console.error('Failed to create custom field:', err);
      throw err;
    }
  }

  /**
   * 更新自訂欄位
   */
  async function updateCustomField(fieldId: string, updates: Partial<CustomField>): Promise<void> {
    try {
      await customFieldService.updateCustomField(fieldId, updates);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '更新自訂欄位失敗';
      console.error('Failed to update custom field:', err);
      throw err;
    }
  }

  /**
   * 刪除自訂欄位
   */
  async function deleteCustomField(fieldId: string): Promise<void> {
    try {
      await customFieldService.deleteCustomField(fieldId);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '刪除自訂欄位失敗';
      console.error('Failed to delete custom field:', err);
      throw err;
    }
  }

  /**
   * 複製自訂欄位
   */
  async function duplicateCustomField(fieldId: string, newName: string): Promise<string> {
    try {
      const duplicatedFieldId = await customFieldService.duplicateCustomField(fieldId, newName);
      await loadCustomFields(); // 重新載入
      return duplicatedFieldId;
    } catch (err) {
      error.value = '複製自訂欄位失敗';
      console.error('Failed to duplicate custom field:', err);
      throw err;
    }
  }


  /**
   * 重新排序自訂欄位
   */
  async function reorderCustomFields(fieldIds: string[]): Promise<void> {
    try {
      await customFieldService.reorderCustomFields(projectId, fieldIds);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '重新排序失敗';
      console.error('Failed to reorder custom fields:', err);
      throw err;
    }
  }

  /**
   * 批次更新欄位可見性
   */
  async function updateFieldsVisibility(fieldIds: string[], isVisible: boolean): Promise<void> {
    try {
      await customFieldService.updateFieldsVisibility(fieldIds, isVisible);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '更新欄位可見性失敗';
      console.error('Failed to update fields visibility:', err);
      throw err;
    }
  }

  /**
   * 驗證欄位值
   */
  function validateFieldValue(
    fieldId: string,
    value: unknown,
  ): { isValid: boolean; error?: string } {
    const field = customFields.value.find((f) => f.fieldId === fieldId);
    if (!field) {
      return { isValid: false, error: '找不到欄位定義' };
    }

    return customFieldService.validateFieldValue(field, value);
  }

  /**
   * 格式化顯示值
   */
  function formatDisplayValue(fieldId: string, value: unknown): string {
    const field = customFields.value.find((f) => f.fieldId === fieldId);
    if (!field) {
      if (value === null || value === undefined) {
        return '-';
      }
      // 安全轉換為字串
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
      if (value instanceof Date) return value.toLocaleDateString('zh-TW');
      return '-';
    }

    return customFieldService.formatDisplayValue(field, value);
  }

  /**
   * 取得欄位預設值
   */
  function getFieldDefaultValue(fieldId: string): unknown {
    const field = customFields.value.find((f) => f.fieldId === fieldId);
    if (!field) {
      return null;
    }

    return customFieldService.getFieldDefaultValue(field);
  }

  /**
   * 取得欄位定義
   */
  function getFieldDefinition(fieldId: string): CustomField | undefined {
    return customFields.value.find((f) => f.fieldId === fieldId);
  }

  /**
   * 初始化任務自訂欄位值
   */
  function initializeTaskCustomFields(): CustomFieldValue[] {
    return customFields.value.map((field) => ({
      fieldId: field.fieldId,
      value: customFieldService.getFieldDefaultValue(field) as
        | string
        | number
        | boolean
        | string[]
        | Date
        | null,
      displayValue: customFieldService.formatDisplayValue(
        field,
        customFieldService.getFieldDefaultValue(field),
      ),
    }));
  }

  /**
   * 更新任務自訂欄位值
   */
  function updateTaskCustomFieldValue(
    currentValues: CustomFieldValue[],
    fieldId: string,
    value: unknown,
  ): CustomFieldValue[] {
    const field = customFields.value.find((f) => f.fieldId === fieldId);
    if (!field) {
      return currentValues;
    }

    const existingIndex = currentValues.findIndex((v) => v.fieldId === fieldId);
    const newValue: CustomFieldValue = {
      fieldId,
      value: value as string | number | boolean | string[] | Date | null,
      displayValue: customFieldService.formatDisplayValue(field, value),
    };

    if (existingIndex >= 0) {
      const newValues = [...currentValues];
      newValues[existingIndex] = newValue;
      return newValues;
    } else {
      return [...currentValues, newValue];
    }
  }

  /**
   * 匯出專案自訂欄位
   */
  async function exportCustomFields(): Promise<string> {
    try {
      return await customFieldService.exportProjectCustomFields(projectId);
    } catch (err) {
      error.value = '匯出自訂欄位失敗';
      console.error('Failed to export custom fields:', err);
      throw err;
    }
  }

  /**
   * 匯入專案自訂欄位
   */
  async function importCustomFields(
    data: string,
  ): Promise<{ fieldsCount: number; groupsCount: number }> {
    try {
      const result = await customFieldService.importProjectCustomFields(projectId, data);
      await loadCustomFields(); // 重新載入
      return result;
    } catch (err) {
      error.value = '匯入自訂欄位失敗';
      console.error('Failed to import custom fields:', err);
      throw err;
    }
  }

  /**
   * 初始化預設欄位
   */
  async function initializeDefaultFields(): Promise<void> {
    console.log('🔧 useCustomFields.initializeDefaultFields 被調用')
    console.log('currentUser.value:', currentUser.value)
    console.log('projectId:', projectId)
    
    if (!currentUser.value) {
      const errorMsg = '需要登入才能初始化欄位';
      console.error('❌', errorMsg)
      throw new Error(errorMsg);
    }

    try {
      console.log('📞 調用 customFieldService.initializeDefaultFields')
      await customFieldService.initializeDefaultFields(projectId, currentUser.value.userId);
      console.log('✅ customFieldService.initializeDefaultFields 完成')
      
      console.log('📞 重新載入欄位...')
      await loadCustomFields(); // 重新載入
      console.log('✅ 欄位重新載入完成')
    } catch (err) {
      error.value = '初始化預設欄位失敗';
      console.error('❌ Failed to initialize default fields:', err);
      throw err;
    }
  }

  // 自動載入資料
  watch(
    () => projectId,
    (newProjectId) => {
      if (newProjectId) {
        void loadCustomFields();
      }
    },
    { immediate: true },
  );

  return {
    // 狀態
    fields: customFields,
    customFields, // 向後相容性
    isLoading,
    error,

    // 計算屬性
    visibleFields,
    requiredFields,
    fieldsByType,

    // 欄位 CRUD
    loadCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    duplicateCustomField,

    // 批次操作
    reorderCustomFields,
    updateFieldsVisibility,

    // 值操作
    validateFieldValue,
    formatDisplayValue,
    getFieldDefaultValue,
    getFieldDefinition,
    initializeTaskCustomFields,
    updateTaskCustomFieldValue,

    // 匯入匯出
    exportCustomFields,
    importCustomFields,
    initializeDefaultFields,
  };
}

/**
 * 全域自訂欄位工具函數
 */
export interface CustomFieldUtilsInterface {
  getCustomFieldValue: (customFields: CustomFieldValue[], fieldId: string) => unknown;
  getCustomFieldDisplayValue: (customFields: CustomFieldValue[], fieldId: string) => string;
  hasCustomField: (customFields: CustomFieldValue[], fieldId: string) => boolean;
  filterEmptyCustomFields: (customFields: CustomFieldValue[]) => CustomFieldValue[];
}

export function useCustomFieldUtils(): CustomFieldUtilsInterface {
  /**
   * 從任務自訂欄位中取得特定欄位值
   */
  function getCustomFieldValue(customFields: CustomFieldValue[], fieldId: string): unknown {
    if (!customFields || !Array.isArray(customFields)) {
      return null;
    }
    const field = customFields.find((f) => f.fieldId === fieldId);
    return field?.value || null;
  }

  /**
   * 從任務自訂欄位中取得格式化顯示值
   */
  function getCustomFieldDisplayValue(customFields: CustomFieldValue[], fieldId: string): string {
    if (!customFields || !Array.isArray(customFields)) {
      return '-';
    }
    const field = customFields.find((f) => f.fieldId === fieldId);
    return field?.displayValue || '-';
  }

  /**
   * 檢查任務是否包含特定自訂欄位
   */
  function hasCustomField(customFields: CustomFieldValue[], fieldId: string): boolean {
    if (!customFields || !Array.isArray(customFields)) {
      return false;
    }
    return customFields.some((f) => f.fieldId === fieldId);
  }

  /**
   * 過濾空值的自訂欄位
   */
  function filterEmptyCustomFields(customFields: CustomFieldValue[]): CustomFieldValue[] {
    if (!customFields || !Array.isArray(customFields)) {
      return [];
    }
    return customFields.filter((field) => {
      const value = field.value;
      return value !== null && value !== undefined && value !== '';
    });
  }

  return {
    getCustomFieldValue,
    getCustomFieldDisplayValue,
    hasCustomField,
    filterEmptyCustomFields,
  };
}
