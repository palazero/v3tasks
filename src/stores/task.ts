/**
 * 任務狀態管理 Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { nanoid } from 'nanoid';
import type { Task, FilterConfig, SortConfig } from '@/types';
import { getTaskRepository, getProjectRepository } from '@/services/repositories';
import { useUserStore } from './user';
import { useNestedTasks } from '@/composables/useNestedTasks';
import { useTaskDependencies } from '@/composables/useTaskDependencies';

export const useTaskStore = defineStore('task', () => {
  // Repository
  const taskRepo = getTaskRepository();
  const projectRepo = getProjectRepository();

  // Composables
  const nestedTasksUtils = useNestedTasks();
  const {
    buildTaskTree,
    createSubtask,
    indentTask,
    outdentTask,
    toggleTaskExpanded: toggleExpanded,
  } = nestedTasksUtils;
  const { addTaskDependency, removeTaskDependency } = useTaskDependencies();

  // 狀態
  const tasks = ref<Task[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 當前篩選和排序設定
  const currentFilters = ref<FilterConfig[]>([]);
  const currentSorts = ref<SortConfig[]>([]);
  const currentGroupBy = ref<string | null>(null);

  // 計算屬性
  const taskMap = computed(() => {
    const map = new Map<string, Task>();
    tasks.value.forEach((task) => map.set(task.taskId, task));
    return map;
  });

  // 取得用戶可存取的所有任務（AllTasks 頁面用）
  async function loadAllUserTasks(): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.currentUser) return;

    isLoading.value = true;
    error.value = null;

    try {
      let allTasks: Task[] = [];

      if (userStore.isAdmin) {
        // 管理員可以看到所有任務
        allTasks = await taskRepo.findAll();
      } else {
        // 一般用戶只能看到參與專案的任務
        const userProjects = await projectRepo.findByMember(userStore.currentUserId);

        for (const project of userProjects) {
          if (!project.isArchived) {
            const projectTasks = await taskRepo.findByProject(project.projectId);
            allTasks.push(...projectTasks);
          }
        }
      }

      tasks.value = allTasks;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入任務失敗';
      console.error('Failed to load all user tasks:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // 取得專案任務
  async function loadProjectTasks(projectId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const projectTasks = await taskRepo.findByProject(projectId);
      tasks.value = projectTasks;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入專案任務失敗';
      console.error('Failed to load project tasks:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // 建立任務
  async function createTask(taskData: Partial<Task>): Promise<Task | null> {
    const userStore = useUserStore();
    if (!userStore.currentUser || !taskData.projectId) return null;

    isLoading.value = true;
    error.value = null;

    try {
      // 取得專案中現有任務的最大 order
      const existingTasks = await taskRepo.findByProject(taskData.projectId);
      const maxOrder = Math.max(...existingTasks.map((t) => t.order), -1);

      const newTask: Task = {
        taskId: nanoid(12),
        projectId: taskData.projectId,
        title: taskData.title || '新任務',
        description: taskData.description || {
          type: 'doc',
          content: [],
        },
        statusId: taskData.statusId || 'todo',
        assigneeId: taskData.assigneeId || '',
        priorityId: taskData.priorityId || 'medium',
        startDateTime: taskData.startDateTime || null,
        endDateTime: taskData.endDateTime || null,
        parentTaskId: taskData.parentTaskId || null,
        order: maxOrder + 1,
        level: taskData.parentTaskId ? 1 : 0, // 暫時簡化，實際應計算層級
        creatorId: userStore.currentUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        customFields: taskData.customFields || [],
        tags: taskData.tags || [],
        progress: taskData.progress || 0,
      };

      await taskRepo.create(newTask);

      // 更新本地狀態
      tasks.value.push(newTask);

      return newTask;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '建立任務失敗';
      console.error('Failed to create task:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // 更新任務
  async function updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const updateData: Partial<Task> = {
        ...updates,
        updatedAt: new Date(),
      };

      await taskRepo.update(taskId, updateData);

      // 更新本地狀態
      const index = tasks.value.findIndex((t) => t.taskId === taskId);
      if (index !== -1) {
        const currentTask = tasks.value[index];
        tasks.value[index] = { ...currentTask, ...updateData } as Task;
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新任務失敗';
      console.error('Failed to update task:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 刪除任務
  async function deleteTask(taskId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await taskRepo.delete(taskId);

      // 更新本地狀態
      tasks.value = tasks.value.filter((t) => t.taskId !== taskId);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '刪除任務失敗';
      console.error('Failed to delete task:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 切換任務狀態
  async function toggleTaskStatus(taskId: string, newStatus: string): Promise<boolean> {
    return await updateTask(taskId, { statusId: newStatus });
  }

  // 指派任務
  async function assignTask(taskId: string, assigneeId?: string): Promise<boolean> {
    const updateData: Partial<Task> = { assigneeId: assigneeId || '' };
    return await updateTask(taskId, updateData);
  }

  // 取得任務
  function getTask(taskId: string): Task | undefined {
    return taskMap.value.get(taskId);
  }

  // 根據專案分組任務（AllTasks 頁面用）
  const tasksByProject = computed(() => {
    const grouped = new Map<string, Task[]>();

    tasks.value.forEach((task) => {
      const projectId = task.projectId;
      if (!grouped.has(projectId)) {
        grouped.set(projectId, []);
      }
      grouped.get(projectId)!.push(task);
    });

    return grouped;
  });

  // 篩選任務
  const filteredTasks = computed(() => {
    let result = tasks.value;

    // 應用篩選
    if (currentFilters.value.length > 0) {
      result = result.filter((task) => {
        return currentFilters.value.every((filter) => {
          // 使用物件映射替代 switch，避免 lexical declaration 問題
          const filterOperators: Record<string, (task: Task, filter: FilterConfig) => boolean> = {
            equals: (task, filter) => getTaskFieldValue(task, filter.fieldId) === filter.value,
            contains: (task, filter) => {
              const fieldValue = getTaskFieldValue(task, filter.fieldId);
              return (
                typeof fieldValue === 'string' &&
                fieldValue.toLowerCase().includes((filter.value as string).toLowerCase())
              );
            },
            // 可擴展更多篩選操作...
          };

          const operator = filterOperators[filter.operator];
          return operator ? operator(task, filter) : true;
        });
      });
    }

    // 應用排序
    if (currentSorts.value.length > 0) {
      result = [...result].sort((a, b) => {
        for (const sort of currentSorts.value) {
          const aValue = getTaskFieldValue(a, sort.fieldId);
          const bValue = getTaskFieldValue(b, sort.fieldId);

          let comparison = 0;
          if (aValue !== null && bValue !== null) {
            if (aValue < bValue) comparison = -1;
            else if (aValue > bValue) comparison = 1;
          } else if (aValue === null && bValue !== null) {
            comparison = 1;
          } else if (aValue !== null && bValue === null) {
            comparison = -1;
          }

          if (comparison !== 0) {
            return sort.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    return result;
  });

  // 輔助函數：取得任務欄位值
  function getTaskFieldValue(task: Task, fieldId: string): string | number | Date | null {
    // 使用物件映射替代 switch，避免 lexical declaration 問題
    const fieldGetters: Record<string, (task: Task) => string | number | Date | null> = {
      title: (task) => task.title,
      statusId: (task) => task.statusId,
      assigneeId: (task) => task.assigneeId || null,
      priorityId: (task) => task.priorityId,
      startDateTime: (task) => task.startDateTime || null,
      endDateTime: (task) => task.endDateTime || null,
      createdAt: (task) => task.createdAt,
      updatedAt: (task) => task.updatedAt,
    };

    // 檢查標準欄位
    const getter = fieldGetters[fieldId];
    if (getter) {
      return getter(task);
    }

    // 檢查自訂欄位
    const customField = task.customFields.find((cf) => cf.fieldId === fieldId);
    return (customField?.value as string | number | Date | null) || null;
  }

  // 設定篩選
  function setFilters(filters: FilterConfig[]): void {
    currentFilters.value = filters;
  }

  // 設定排序
  function setSorts(sorts: SortConfig[]): void {
    currentSorts.value = sorts;
  }

  // 設定分組
  function setGroupBy(fieldId: string | null): void {
    currentGroupBy.value = fieldId;
  }

  // 清除所有篩選和排序
  function clearFiltersAndSorts(): void {
    currentFilters.value = [];
    currentSorts.value = [];
    currentGroupBy.value = null;
  }

  // 取得任務統計
  const taskStats = computed(() => {
    return {
      total: tasks.value.length,
      todo: tasks.value.filter((t) => t.statusId === 'todo').length,
      inProgress: tasks.value.filter((t) => t.statusId === 'inProgress').length,
      done: tasks.value.filter((t) => t.statusId === 'done').length,
      overdue: tasks.value.filter((t) => {
        if (!t.endDateTime || t.statusId === 'done') return false;
        return new Date(t.endDateTime) < new Date();
      }).length,
    };
  });

  // 巢狀任務樹結構
  const nestedTasks = computed(() => {
    return buildTaskTree(filteredTasks.value);
  });

  // 新增子任務
  async function addSubtask(parentTask: Task, title: string): Promise<Task | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const subtaskData = createSubtask(parentTask, title);
      const newSubtaskId = await taskRepo.create(subtaskData as Task);
      const created = await taskRepo.findById(String(newSubtaskId));
      const newSubtask: Task = created ?? (subtaskData as Task);

      tasks.value.push(newSubtask);

      // 確保父任務展開狀態
      await updateTask(parentTask.taskId, { isExpanded: true });

      return newSubtask;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '新增子任務失敗';
      console.error('Failed to add subtask:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // 任務縮排
  async function indentTaskAction(task: Task): Promise<boolean> {
    const result = indentTask(task, tasks.value);
    if (result) {
      return await updateTask(result.taskId, result.updates);
    }
    return false;
  }

  // 任務取消縮排
  async function outdentTaskAction(task: Task): Promise<boolean> {
    const result = outdentTask(task, tasks.value);
    if (result) {
      return await updateTask(result.taskId, result.updates);
    }
    return false;
  }

  // 切換任務展開狀態
  async function toggleTaskExpandedState(task: Task): Promise<boolean> {
    const result = toggleExpanded(task);
    return await updateTask(result.taskId, result.updates);
  }

  // 批量更新任務（用於拖拉排序）
  async function batchUpdateTasks(
    updates: Array<{ taskId: string; updates: Partial<Task> }>,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await Promise.all(updates.map((update) => taskRepo.update(update.taskId, update.updates)));

      // 更新本地狀態
      updates.forEach((update) => {
        const index = tasks.value.findIndex((t) => t.taskId === update.taskId);
        if (index !== -1) {
          const currentTask = tasks.value[index];
          tasks.value[index] = { ...currentTask, ...update.updates } as Task;
        }
      });

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量更新任務失敗';
      console.error('Failed to batch update tasks:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 新增任務依賴
  async function addTaskDependencyAction(taskId: string, dependencyId: string): Promise<boolean> {
    const result = addTaskDependency(taskId, dependencyId, tasks.value);
    if (result.valid && result.updates) {
      return await batchUpdateTasks(result.updates);
    } else {
      error.value = result.error || '新增依賴失敗';
      return false;
    }
  }

  // 移除任務依賴
  async function removeTaskDependencyAction(
    taskId: string,
    dependencyId: string,
  ): Promise<boolean> {
    const result = removeTaskDependency(taskId, dependencyId, tasks.value);
    if (result.valid && result.updates) {
      return await batchUpdateTasks(result.updates);
    } else {
      error.value = result.error || '移除依賴失敗';
      return false;
    }
  }

  return {
    // 狀態
    tasks,
    isLoading,
    error,
    currentFilters,
    currentSorts,
    currentGroupBy,

    // 計算屬性
    taskMap,
    tasksByProject,
    filteredTasks,
    taskStats,
    nestedTasks,

    // 基本動作
    loadAllUserTasks,
    loadProjectTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    assignTask,
    getTask,
    setFilters,
    setSorts,
    setGroupBy,
    clearFiltersAndSorts,

    // 巢狀任務動作
    addSubtask,
    indentTaskAction,
    outdentTaskAction,
    toggleTaskExpanded: toggleTaskExpandedState,
    batchUpdateTasks,

    // 依賴關係動作
    addTaskDependencyAction,
    removeTaskDependencyAction,
  };
});
