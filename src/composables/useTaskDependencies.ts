/**
 * 任務依賴管理 Composable
 * 處理任務前置關係、依賴檢查、自動狀態更新
 */

import type { Task } from '@/types';

export function useTaskDependencies(): {
  canTaskStart: (task: Task, allTasks: Task[]) => boolean;
  getTaskDependencies: (task: Task, allTasks: Task[]) => Task[];
  getBlockedTasks: (task: Task, allTasks: Task[]) => Task[];
  addTaskDependency: (taskId: string, dependencyId: string, allTasks: Task[]) => { valid: boolean; updates?: Array<{ taskId: string; updates: Partial<Task> }>; error?: string };
  removeTaskDependency: (taskId: string, dependencyId: string, allTasks: Task[]) => { valid: boolean; updates?: Array<{ taskId: string; updates: Partial<Task> }>; error?: string };
  wouldCreateCircularDependency: (taskId: string, dependencyId: string, allTasks: Task[]) => boolean;
  getTaskDependencyStatus: (task: Task, allTasks: Task[]) => { canStart: boolean; blockedBy: Task[] };
  autoUpdateTaskStatus: (completedTaskId: string, allTasks: Task[], onTaskUpdate: (task: Task) => void) => void;
  getProjectDependencyGraph: (tasks: Task[]) => { nodes: Array<{ id: string; title: string; status: string }>; edges: Array<{ from: string; to: string }> };
  validateTaskDependencies: (tasks: Task[]) => { valid: boolean; errors: string[] };
} {
  /**
   * 檢查任務是否可以開始（所有前置任務都已完成）
   */
  function canTaskStart(task: Task, allTasks: Task[]): boolean {
    if (!task.dependencyIds || task.dependencyIds.length === 0) {
      return true;
    }

    const dependencies = task.dependencyIds
      .map((id) => allTasks.find((t) => t.taskId === id))
      .filter(Boolean) as Task[];

    return dependencies.every((dep) => dep.statusId === 'done');
  }

  /**
   * 取得任務的前置任務
   */
  function getTaskDependencies(task: Task, allTasks: Task[]): Task[] {
    if (!task.dependencyIds || task.dependencyIds.length === 0) {
      return [];
    }

    return task.dependencyIds
      .map((id) => allTasks.find((t) => t.taskId === id))
      .filter(Boolean) as Task[];
  }

  /**
   * 取得被此任務阻擋的任務
   */
  function getBlockedTasks(task: Task, allTasks: Task[]): Task[] {
    return allTasks.filter((t) => t.dependencyIds && t.dependencyIds.includes(task.taskId));
  }

  /**
   * 新增任務依賴關係
   */
  function addTaskDependency(
    taskId: string,
    dependencyId: string,
    allTasks: Task[],
  ): {
    valid: boolean;
    updates?: Array<{ taskId: string; updates: Partial<Task> }>;
    error?: string;
  } {
    const task = allTasks.find((t) => t.taskId === taskId);
    const dependency = allTasks.find((t) => t.taskId === dependencyId);

    if (!task || !dependency) {
      return { valid: false, error: '找不到指定的任務' };
    }

    // 檢查是否會造成循環依賴
    if (wouldCreateCircularDependency(taskId, dependencyId, allTasks)) {
      return { valid: false, error: '此依賴會造成循環關係' };
    }

    // 檢查是否已存在此依賴
    const existingDeps = task.dependencyIds || [];
    if (existingDeps.includes(dependencyId)) {
      return { valid: false, error: '依賴關係已存在' };
    }

    const updates = [
      // 更新任務的依賴列表
      {
        taskId: taskId,
        updates: {
          dependencyIds: [...existingDeps, dependencyId],
        },
      },
      // 更新依賴任務的被阻擋列表
      {
        taskId: dependencyId,
        updates: {
          blockedByIds: [...(dependency.blockedByIds || []), taskId],
        },
      },
    ];

    return { valid: true, updates };
  }

  /**
   * 移除任務依賴關係
   */
  function removeTaskDependency(
    taskId: string,
    dependencyId: string,
    allTasks: Task[],
  ): {
    valid: boolean;
    updates?: Array<{ taskId: string; updates: Partial<Task> }>;
    error?: string;
  } {
    const task = allTasks.find((t) => t.taskId === taskId);
    const dependency = allTasks.find((t) => t.taskId === dependencyId);

    if (!task || !dependency) {
      return { valid: false, error: '找不到指定的任務' };
    }

    const updates = [
      // 更新任務的依賴列表
      {
        taskId: taskId,
        updates: {
          dependencyIds: (task.dependencyIds || []).filter((id) => id !== dependencyId),
        },
      },
      // 更新依賴任務的被阻擋列表
      {
        taskId: dependencyId,
        updates: {
          blockedByIds: (dependency.blockedByIds || []).filter((id) => id !== taskId),
        },
      },
    ];

    return { valid: true, updates };
  }

  /**
   * 檢查是否會造成循環依賴
   */
  function wouldCreateCircularDependency(
    taskId: string,
    dependencyId: string,
    allTasks: Task[],
  ): boolean {
    const visited = new Set<string>();

    function hasPath(fromId: string, toId: string): boolean {
      if (fromId === toId) return true;
      if (visited.has(fromId)) return false;

      visited.add(fromId);

      const fromTask = allTasks.find((t) => t.taskId === fromId);
      if (!fromTask || !fromTask.dependencyIds) return false;

      return fromTask.dependencyIds.some((depId) => hasPath(depId, toId));
    }

    return hasPath(dependencyId, taskId);
  }

  /**
   * 取得任務的依賴狀態
   */
  function getTaskDependencyStatus(
    task: Task,
    allTasks: Task[],
  ): {
    canStart: boolean;
    blockedBy: Task[];
    dependsOn: Task[];
    blocking: Task[];
    completionRate: number;
  } {
    const dependsOn = getTaskDependencies(task, allTasks);
    const blocking = getBlockedTasks(task, allTasks);
    const blockedBy = dependsOn.filter((dep) => dep.statusId !== 'done');
    const canStart = canTaskStart(task, allTasks);

    // 計算前置任務完成率
    const completionRate =
      dependsOn.length === 0
        ? 1
        : dependsOn.filter((dep) => dep.statusId === 'done').length / dependsOn.length;

    return {
      canStart,
      blockedBy,
      dependsOn,
      blocking,
      completionRate,
    };
  }

  /**
   * 自動更新相關任務狀態
   * 當任務完成時，檢查是否有被阻擋的任務可以開始
   */
  function autoUpdateTaskStatus(
    completedTaskId: string,
    allTasks: Task[],
  ): Array<{ taskId: string; updates: Partial<Task> }> {
    const updates: Array<{ taskId: string; updates: Partial<Task> }> = [];
    const blockedTasks = getBlockedTasks(
      allTasks.find((t) => t.taskId === completedTaskId)!,
      allTasks,
    );

    blockedTasks.forEach((blockedTask) => {
      if (blockedTask.statusId === 'todo' && canTaskStart(blockedTask, allTasks)) {
        // 可以考慮自動將狀態改為 'ready' 或觸發通知
        // 這裡先不自動更改狀態，而是標記為可開始
        console.log(`Task ${blockedTask.title} is now ready to start`);
      }
    });

    return updates;
  }

  /**
   * 取得專案的任務依賴圖
   */
  function getProjectDependencyGraph(tasks: Task[]): {
    nodes: Array<{ id: string; title: string; status: string }>;
    edges: Array<{ from: string; to: string }>;
  } {
    const nodes = tasks.map((task) => ({
      id: task.taskId,
      title: task.title,
      status: task.statusId,
    }));

    const edges: Array<{ from: string; to: string }> = [];

    tasks.forEach((task) => {
      if (task.dependencyIds) {
        task.dependencyIds.forEach((depId) => {
          edges.push({
            from: depId,
            to: task.taskId,
          });
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * 驗證任務依賴的完整性
   */
  function validateTaskDependencies(tasks: Task[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const taskIds = new Set(tasks.map((t) => t.taskId));

    tasks.forEach((task) => {
      // 檢查依賴任務是否存在
      if (task.dependencyIds) {
        task.dependencyIds.forEach((depId) => {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${task.title} depends on non-existent task ${depId}`);
          }
        });
      }

      // 檢查循環依賴
      if (task.dependencyIds) {
        task.dependencyIds.forEach((depId) => {
          if (wouldCreateCircularDependency(task.taskId, depId, tasks)) {
            errors.push(`Circular dependency detected between ${task.title} and ${depId}`);
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  return {
    canTaskStart,
    getTaskDependencies,
    getBlockedTasks,
    addTaskDependency,
    removeTaskDependency,
    wouldCreateCircularDependency,
    getTaskDependencyStatus,
    autoUpdateTaskStatus,
    getProjectDependencyGraph,
    validateTaskDependencies,
  };
}
