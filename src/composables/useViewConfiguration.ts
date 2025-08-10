/**
 * 視圖配置管理 Composable
 * 處理視圖配置的狀態管理和持久化
 */

import { ref, computed, watch } from 'vue';
import type { ViewConfiguration, ViewPreset, ViewType } from '@/types';
import { viewConfigurationService } from '@/services/viewConfigurationService';
import { useCurrentUser } from './useCurrentUser';

export function useViewConfiguration(projectId: string, viewType: ViewType | string) {
  const { currentUser } = useCurrentUser();

  // 狀態
  const currentConfiguration = ref<ViewConfiguration>({
    viewType,
    visibleColumns: [],
    filters: [],
    sortBy: 'order',
    sortOrder: 'asc',
  });

  const availablePresets = ref<ViewPreset[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 預設配置
  const defaultConfiguration: ViewConfiguration = {
    viewType,
    visibleColumns: [
      { key: 'title', label: '任務標題', width: 300, visible: true },
      { key: 'status', label: '狀態', width: 120, visible: true },
      { key: 'assignee', label: '指派人員', width: 150, visible: true },
      { key: 'priority', label: '優先級', width: 120, visible: true },
      { key: 'deadline', label: '截止日期', width: 180, visible: true },
      { key: 'progress', label: '進度', width: 150, visible: true },
    ],
    filters: [],
    sortBy: 'order',
    sortOrder: 'asc',
  };

  // 計算屬性
  const hasCustomConfiguration = computed(() => {
    return JSON.stringify(currentConfiguration.value) !== JSON.stringify(defaultConfiguration);
  });

  const visibleColumnKeys = computed(() => {
    return (
      currentConfiguration.value.visibleColumns
        ?.filter((col) => col.visible)
        .map((col) => col.key) || []
    );
  });

  const activeFilters = computed(() => {
    return currentConfiguration.value.filters?.filter((filter) => filter.value) || [];
  });

  /**
   * 載入視圖配置
   */
  async function loadConfiguration(): Promise<void> {
    if (!currentUser.value) return;

    try {
      isLoading.value = true;
      error.value = null;

      const savedConfig = await viewConfigurationService.loadUserViewConfiguration(
        currentUser.value.userId,
        projectId,
        viewType,
      );

      if (savedConfig) {
        currentConfiguration.value = { ...defaultConfiguration, ...savedConfig };
      } else {
        currentConfiguration.value = { ...defaultConfiguration };
      }
    } catch (err) {
      error.value = '載入視圖配置失敗';
      console.error('Failed to load view configuration:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 儲存視圖配置
   */
  async function saveConfiguration(config?: ViewConfiguration): Promise<void> {
    if (!currentUser.value) return;

    const configToSave = config || currentConfiguration.value;

    try {
      error.value = null;

      await viewConfigurationService.saveUserViewConfiguration(
        currentUser.value.userId,
        projectId,
        viewType,
        configToSave,
      );

      if (!config) {
        // 如果沒有傳入配置，更新當前配置
        currentConfiguration.value = { ...configToSave };
      }
    } catch (err) {
      error.value = '儲存視圖配置失敗';
      console.error('Failed to save view configuration:', err);
      throw err;
    }
  }

  /**
   * 更新配置
   */
  async function updateConfiguration(updates: Partial<ViewConfiguration>): Promise<void> {
    const newConfig = { ...currentConfiguration.value, ...updates };
    currentConfiguration.value = newConfig;
    await saveConfiguration(newConfig);
  }

  /**
   * 重設為預設配置
   */
  async function resetToDefault(): Promise<void> {
    if (!currentUser.value) return;

    try {
      await viewConfigurationService.resetToDefault(currentUser.value.userId, projectId, viewType);
      currentConfiguration.value = { ...defaultConfiguration };
    } catch (err) {
      error.value = '重設配置失敗';
      console.error('Failed to reset configuration:', err);
      throw err;
    }
  }

  /**
   * 載入可用預設
   */
  async function loadPresets(): Promise<void> {
    try {
      availablePresets.value = await viewConfigurationService.getViewPresets();
    } catch (err) {
      error.value = '載入預設配置失敗';
      console.error('Failed to load presets:', err);
    }
  }

  /**
   * 套用預設配置
   */
  async function applyPreset(presetId: string): Promise<void> {
    const preset = availablePresets.value.find((p) => p.id === presetId);
    if (!preset) {
      throw new Error('找不到指定的預設配置');
    }

    await updateConfiguration(preset.configuration);
  }

  /**
   * 儲存為預設配置
   */
  async function saveAsPreset(name: string, description?: string): Promise<void> {
    if (!currentUser.value) return;

    try {
      await viewConfigurationService.saveViewPreset({
        name,
        description: description || '',
        configuration: { ...currentConfiguration.value },
        isSystem: false,
        createdBy: currentUser.value.userId,
      });

      // 重新載入預設列表
      await loadPresets();
    } catch (err) {
      error.value = '儲存預設配置失敗';
      console.error('Failed to save preset:', err);
      throw err;
    }
  }

  /**
   * 刪除預設配置
   */
  async function deletePreset(presetId: string): Promise<void> {
    try {
      await viewConfigurationService.deleteViewPreset(presetId);
      await loadPresets();
    } catch (err) {
      error.value = '刪除預設配置失敗';
      console.error('Failed to delete preset:', err);
      throw err;
    }
  }

  /**
   * 匯出配置
   */
  async function exportConfiguration(): Promise<string> {
    if (!currentUser.value) return '';

    try {
      return await viewConfigurationService.exportViewConfigurations(currentUser.value.userId);
    } catch (err) {
      error.value = '匯出配置失敗';
      console.error('Failed to export configuration:', err);
      throw err;
    }
  }

  /**
   * 匯入配置
   */
  async function importConfiguration(configurationJson: string): Promise<number> {
    if (!currentUser.value) return 0;

    try {
      const importedCount = await viewConfigurationService.importViewConfigurations(
        currentUser.value.userId,
        configurationJson,
      );

      // 重新載入當前配置
      await loadConfiguration();
      return importedCount;
    } catch (err) {
      error.value = '匯入配置失敗';
      console.error('Failed to import configuration:', err);
      throw err;
    }
  }

  // 監聽用戶變化
  watch(
    () => currentUser.value?.userId,
    (newUserId) => {
      if (newUserId) {
        void loadConfiguration();
        void loadPresets();
      }
    },
    { immediate: true },
  );

  // 自動儲存 (防抖)
  let saveTimeout: NodeJS.Timeout | null = null;
  const autoSave = (config: ViewConfiguration) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      saveConfiguration(config).catch(console.error);
    }, 1000); // 1秒延遲儲存
  };

  return {
    // 狀態
    currentConfiguration,
    availablePresets,
    isLoading,
    error,

    // 計算屬性
    hasCustomConfiguration,
    visibleColumnKeys,
    activeFilters,
    defaultConfiguration,

    // 方法
    loadConfiguration,
    saveConfiguration,
    updateConfiguration,
    resetToDefault,
    loadPresets,
    applyPreset,
    saveAsPreset,
    deletePreset,
    exportConfiguration,
    importConfiguration,
    autoSave,
  };
}

/**
 * 全域視圖配置管理
 */
export function useGlobalViewConfiguration() {
  const { currentUser } = useCurrentUser();

  /**
   * 初始化系統預設配置
   */
  async function initializeSystemPresets(): Promise<void> {
    try {
      await viewConfigurationService.initializeSystemPresets();
    } catch (err) {
      console.error('Failed to initialize system presets:', err);
    }
  }

  /**
   * 取得所有用戶視圖配置
   */
  async function getUserConfigurations(): Promise<
    Array<{
      projectId: string;
      viewType: string;
      configuration: ViewConfiguration;
      updatedAt: Date;
    }>
  > {
    if (!currentUser.value) return [];

    try {
      return await viewConfigurationService.getUserViewConfigurations(currentUser.value.userId);
    } catch (err) {
      console.error('Failed to get user configurations:', err);
      return [];
    }
  }

  /**
   * 清除所有用戶配置
   */
  async function clearAllConfigurations(): Promise<void> {
    if (!currentUser.value) return;

    try {
      const configurations = await getUserConfigurations();
      for (const config of configurations) {
        await viewConfigurationService.deleteUserViewConfiguration(
          currentUser.value.userId,
          config.projectId,
          config.viewType,
        );
      }
    } catch (err) {
      console.error('Failed to clear configurations:', err);
      throw err;
    }
  }

  return {
    initializeSystemPresets,
    getUserConfigurations,
    clearAllConfigurations,
  };
}
