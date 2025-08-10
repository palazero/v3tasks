/**
 * 專案視圖記憶 Composable
 * 記錄每個專案的最後選取視圖，並在切換專案時自動恢復
 */

import { ref, computed, type ComputedRef } from 'vue';
import { useViewStore } from '@/stores/view';

// 專案視圖記憶映射 (projectId -> viewId)
const projectViewMemory = ref<Record<string, string>>({});

// 從 localStorage 載入記憶
const STORAGE_KEY = 'project_view_memory';
const loadMemoryFromStorage = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      projectViewMemory.value = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load project view memory:', error);
    projectViewMemory.value = {};
  }
};

// 儲存記憶到 localStorage
const saveMemoryToStorage = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectViewMemory.value));
  } catch (error) {
    console.warn('Failed to save project view memory:', error);
  }
};

// 初始載入
loadMemoryFromStorage();

/**
 * 專案視圖記憶 Hook
 */
export function useProjectViewMemory(): {
  projectViewMemory: ComputedRef<Record<string, string>>;
  memoryStats: ComputedRef<{
    totalProjects: number;
    projects: Array<{ projectId: string; viewId: string }>;
  }>;
  rememberProjectView: (projectId: string, viewId: string) => void;
  getProjectView: (projectId: string) => string | null;
  switchToProjectView: (projectId: string) => Promise<void>;
  forgetProjectView: (projectId: string) => void;
  clearAllMemory: () => void;
} {
  const viewStore = useViewStore();

  /**
   * 記錄專案的當前視圖
   */
  const rememberProjectView = (projectId: string, viewId: string): void => {
    if (projectId && viewId) {
      projectViewMemory.value[projectId] = viewId;
      saveMemoryToStorage();
    }
  };

  /**
   * 取得專案的記憶視圖
   */
  const getProjectView = (projectId: string): string | null => {
    return projectViewMemory.value[projectId] || null;
  };

  /**
   * 切換到專案並恢復其記憶視圖
   */
  const switchToProjectView = async (projectId: string): Promise<void> => {
    // 載入專案的視圖
    if (projectId === 'all') {
      await viewStore.loadAllTasksViews();
    } else {
      await viewStore.loadProjectViews(projectId);
    }

    // 取得該專案的記憶視圖
    const rememberedViewId = getProjectView(projectId);

    if (rememberedViewId) {
      // 檢查記憶的視圖是否存在於當前載入的視圖中
      const viewExists = viewStore.views.some((view) => view.viewId === rememberedViewId);

      if (viewExists) {
        // 切換到記憶的視圖
        viewStore.switchView(rememberedViewId);
      } else {
        // 如果記憶的視圖不存在，切換到第一個可用視圖
        if (viewStore.views.length > 0) {
          viewStore.switchView(viewStore.views[0]?.viewId || '');
        }
      }
    } else {
      // 沒有記憶，切換到第一個可用視圖
      if (viewStore.views.length > 0) {
        viewStore.switchView(viewStore.views[0]?.viewId || '');
      }
    }
  };

  /**
   * 清除指定專案的記憶
   */
  const forgetProjectView = (projectId: string): void => {
    if (projectViewMemory.value[projectId]) {
      delete projectViewMemory.value[projectId];
      saveMemoryToStorage();
    }
  };

  /**
   * 清除所有專案記憶
   */
  const clearAllMemory = (): void => {
    projectViewMemory.value = {};
    saveMemoryToStorage();
  };

  /**
   * 取得所有專案記憶統計
   */
  const memoryStats = computed(() => {
    const projects = Object.keys(projectViewMemory.value);
    return {
      totalProjects: projects.length,
      projects: projects.map((projectId) => ({
        projectId,
        viewId: projectViewMemory.value[projectId] || '',
      })),
    };
  });

  return {
    // 狀態
    projectViewMemory: computed(() => projectViewMemory.value),
    memoryStats,

    // 方法
    rememberProjectView,
    getProjectView,
    switchToProjectView,
    forgetProjectView,
    clearAllMemory,
  };
}
