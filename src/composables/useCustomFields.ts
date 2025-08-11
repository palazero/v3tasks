/**
 * 自訂欄位管理 Composable
 * 處理自訂欄位的狀態管理和操作
 */

import { ref, computed, watch } from 'vue';
import type { CustomField, CustomFieldGroup, CustomFieldValue, FieldType } from '@/types';
import { customFieldService } from '@/services/customFieldService';
import { useCurrentUser } from './useCurrentUser';

export function useCustomFields(projectId: string) {
  const { currentUser } = useCurrentUser();

  // 狀態
  const customFields = ref<CustomField[]>([]);
  const customFieldGroups = ref<CustomFieldGroup[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 計算屬性
  const groupedFields = computed(() => {
    const grouped: Record<string, CustomField[]> = {};

    // 先建立群組
    customFieldGroups.value.forEach((group) => {
      grouped[group.groupId] = [];
    });

    // 沒有群組的欄位
    grouped['ungrouped'] = [];

    // 分配欄位到群組
    customFields.value.forEach((field) => {
      const groupId = field.groupId || 'ungrouped';
      if (!grouped[groupId]) {
        grouped[groupId] = [];
      }
      grouped[groupId].push(field);
    });

    // 排序每個群組內的欄位
    Object.keys(grouped).forEach((groupId) => {
      grouped[groupId]?.sort((a, b) => a.displayOrder - b.displayOrder);
    });

    return grouped;
  });

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

      const [fields, groups] = await Promise.all([
        customFieldService.getProjectCustomFields(projectId),
        customFieldService.getProjectCustomFieldGroups(projectId),
      ]);

      customFields.value = fields;
      customFieldGroups.value = groups;
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
   * 建立自訂欄位群組
   */
  async function createCustomFieldGroup(
    group: Omit<
      CustomFieldGroup,
      'groupId' | 'createdAt' | 'updatedAt' | 'projectId' | 'createdBy'
    >,
  ): Promise<string> {
    if (!currentUser.value) {
      throw new Error('需要登入才能建立群組');
    }

    try {
      const groupId = await customFieldService.createCustomFieldGroup({
        ...group,
        projectId,
        createdBy: currentUser.value.userId,
      });

      await loadCustomFields(); // 重新載入
      return groupId;
    } catch (err) {
      error.value = '建立欄位群組失敗';
      console.error('Failed to create custom field group:', err);
      throw err;
    }
  }

  /**
   * 更新自訂欄位群組
   */
  async function updateCustomFieldGroup(
    groupId: string,
    updates: Partial<CustomFieldGroup>,
  ): Promise<void> {
    try {
      await customFieldService.updateCustomFieldGroup(groupId, updates);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '更新欄位群組失敗';
      console.error('Failed to update custom field group:', err);
      throw err;
    }
  }

  /**
   * 刪除自訂欄位群組
   */
  async function deleteCustomFieldGroup(groupId: string): Promise<void> {
    try {
      await customFieldService.deleteCustomFieldGroup(groupId);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '刪除欄位群組失敗';
      console.error('Failed to delete custom field group:', err);
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
    if (!currentUser.value) {
      throw new Error('需要登入才能初始化欄位');
    }

    try {
      await customFieldService.initializeDefaultFields(projectId, currentUser.value.userId);
      await loadCustomFields(); // 重新載入
    } catch (err) {
      error.value = '初始化預設欄位失敗';
      console.error('Failed to initialize default fields:', err);
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
    groupedFields,
    visibleFields,
    requiredFields,
    fieldsByType,

    // 欄位 CRUD
    loadCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    duplicateCustomField,

    // 群組 CRUD
    createCustomFieldGroup,
    updateCustomFieldGroup,
    deleteCustomFieldGroup,

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
    const field = customFields.find((f) => f.fieldId === fieldId);
    return field?.value || null;
  }

  /**
   * 從任務自訂欄位中取得格式化顯示值
   */
  function getCustomFieldDisplayValue(customFields: CustomFieldValue[], fieldId: string): string {
    const field = customFields.find((f) => f.fieldId === fieldId);
    return field?.displayValue || '-';
  }

  /**
   * 檢查任務是否包含特定自訂欄位
   */
  function hasCustomField(customFields: CustomFieldValue[], fieldId: string): boolean {
    return customFields.some((f) => f.fieldId === fieldId);
  }

  /**
   * 過濾空值的自訂欄位
   */
  function filterEmptyCustomFields(customFields: CustomFieldValue[]): CustomFieldValue[] {
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
