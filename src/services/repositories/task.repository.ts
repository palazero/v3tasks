/**
 * 任務 Repository
 * 處理任務相關的資料存取
 */

import { BaseRepository } from './base.repository';
import { db } from '../db/database';
import type { Task } from '@/types';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(db.tasks);
  }

  /**
   * 取得專案的所有任務
   */
  async findByProject(projectId: string): Promise<Task[]> {
    return await this.table.where('projectId').equals(projectId).toArray();
  }

  /**
   * 取得專案的根任務（無父任務）
   */
  async findRootTasks(projectId: string): Promise<Task[]> {
    return await this.table
      .where('projectId')
      .equals(projectId)
      .and((task) => !task.parentTaskId)
      .sortBy('order');
  }

  /**
   * 取得子任務
   */
  async findChildren(parentTaskId: string): Promise<Task[]> {
    return await this.table.where('parentTaskId').equals(parentTaskId).sortBy('order');
  }

  /**
   * 取得指派給用戶的任務
   */
  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return await this.table.where('assigneeId').equals(assigneeId).toArray();
  }

  /**
   * 取得用戶建立的任務
   */
  async findByCreator(creatorId: string): Promise<Task[]> {
    return await this.table.where('creatorId').equals(creatorId).toArray();
  }

  /**
   * 根據狀態取得任務
   */
  async findByStatus(projectId: string, statusId: string): Promise<Task[]> {
    return await this.table
      .where('projectId')
      .equals(projectId)
      .and((task) => task.statusId === statusId)
      .toArray();
  }

  /**
   * 根據優先級取得任務
   */
  async findByPriority(projectId: string, priorityId: string): Promise<Task[]> {
    return await this.table
      .where('projectId')
      .equals(projectId)
      .and((task) => task.priorityId === priorityId)
      .toArray();
  }

  /**
   * 建立任務樹狀結構
   */
  async buildTaskTree(projectId: string): Promise<Task[]> {
    const allTasks = await this.findByProject(projectId);
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];

    // 建立任務映射
    allTasks.forEach((task) => {
      taskMap.set(task.taskId, { ...task, children: [] });
    });

    // 建立樹狀結構
    allTasks.forEach((task) => {
      const currentTask = taskMap.get(task.taskId)!;
      if (task.parentTaskId) {
        const parent = taskMap.get(task.parentTaskId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(currentTask);
        }
      } else {
        rootTasks.push(currentTask);
      }
    });

    // 排序
    const sortTasks = (tasks: Task[]): void => {
      tasks.sort((a, b) => a.order - b.order);
      tasks.forEach((task) => {
        if (task.children && task.children.length > 0) {
          sortTasks(task.children);
        }
      });
    };

    sortTasks(rootTasks);
    return rootTasks;
  }

  /**
   * 取得任務的所有祖先
   */
  async getAncestors(taskId: string): Promise<Task[]> {
    const ancestors: Task[] = [];
    let currentTask = await this.findById(taskId);

    while (currentTask && currentTask.parentTaskId) {
      const parent = await this.findById(currentTask.parentTaskId);
      if (parent) {
        ancestors.unshift(parent);
        currentTask = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * 取得任務的所有後代
   */
  async getDescendants(taskId: string): Promise<Task[]> {
    const descendants: Task[] = [];
    const queue: string[] = [taskId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.findChildren(currentId);
      descendants.push(...children);
      queue.push(...children.map((child) => child.taskId));
    }

    return descendants;
  }

  /**
   * 更新任務順序
   */
  async updateOrder(taskId: string, newOrder: number): Promise<void> {
    await this.update(taskId, { order: newOrder });
  }

  /**
   * 批次更新任務順序
   */
  async batchUpdateOrder(updates: Array<{ taskId: string; order: number }>): Promise<void> {
    await this.updateMany(
      updates.map(({ taskId, order }) => ({
        id: taskId,
        data: { order },
      })),
    );
  }

  /**
   * 移動任務到新的父任務
   */
  async moveToParent(taskId: string, newParentId: string | null, newOrder: number): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) return;

    // 計算新的層級
    let newLevel = 0;
    if (newParentId) {
      const parent = await this.findById(newParentId);
      if (parent) {
        newLevel = parent.level + 1;
      }
    }

    // 更新任務
    await this.update(taskId, {
      parentTaskId: newParentId,
      order: newOrder,
      level: newLevel,
    });

    // 更新所有後代的層級
    const updateDescendantsLevel = async (parentId: string, parentLevel: number): Promise<void> => {
      const children = await this.findChildren(parentId);
      for (const child of children) {
        await this.update(child.taskId, { level: parentLevel + 1 });
        await updateDescendantsLevel(child.taskId, parentLevel + 1);
      }
    };

    await updateDescendantsLevel(taskId, newLevel);
  }

  /**
   * 取得逾期任務
   */
  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    const allTasks = await this.findAll();
    return allTasks.filter(
      (task) =>
        task.endDateTime &&
        new Date(task.endDateTime) < now &&
        task.statusId !== 'done' &&
        task.statusId !== 'cancelled',
    );
  }

  /**
   * 取得即將到期的任務（未來7天）
   */
  async findUpcoming(days: number = 7): Promise<Task[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const allTasks = await this.findAll();

    return allTasks.filter((task) => {
      if (!task.endDateTime || task.statusId === 'done' || task.statusId === 'cancelled') {
        return false;
      }
      const endDate = new Date(task.endDateTime);
      return endDate >= now && endDate <= future;
    });
  }

  /**
   * 取得任務統計資訊
   */
  async getProjectStats(projectId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  }> {
    const tasks = await this.findByProject(projectId);
    const now = new Date();

    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.statusId === 'todo').length,
      inProgress: tasks.filter((t) => t.statusId === 'inProgress').length,
      done: tasks.filter((t) => t.statusId === 'done').length,
      overdue: tasks.filter(
        (t) =>
          t.endDateTime &&
          new Date(t.endDateTime) < now &&
          t.statusId !== 'done' &&
          t.statusId !== 'cancelled',
      ).length,
    };
  }

  /**
   * 複製任務（包含子任務）
   */
  async duplicate(taskId: string, includeChildren: boolean = false): Promise<string> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 複製主任務，排除 taskId 和 children
    const { taskId: _, children: __, ...taskData } = task;
    
    const newTask: Omit<Task, 'taskId'> = {
      ...taskData,
      title: `${task.title} (複製)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newTaskId = await this.create(newTask as Task);

    // 複製子任務
    if (includeChildren) {
      const childTasks = await this.findChildren(taskId);
      for (const child of childTasks) {
        await this.duplicateWithNewParent(child.taskId, String(newTaskId));
      }
    }

    return String(newTaskId);
  }

  /**
   * 複製任務到新的父任務
   */
  private async duplicateWithNewParent(taskId: string, newParentId: string): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) return;

    // 排除 taskId 和 children
    const { taskId: _, children: __, ...taskData } = task;
    
    const newTask: Omit<Task, 'taskId'> = {
      ...taskData,
      parentTaskId: newParentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newTaskId = await this.create(newTask as Task);

    // 遞迴複製子任務
    const childTasks = await this.findChildren(taskId);
    for (const child of childTasks) {
      await this.duplicateWithNewParent(child.taskId, String(newTaskId));
    }
  }
}

// 建立單例實例
let taskRepositoryInstance: TaskRepository | null = null;

/**
 * 取得 TaskRepository 實例
 */
export function getTaskRepository(): TaskRepository {
  if (!taskRepositoryInstance) {
    taskRepositoryInstance = new TaskRepository();
  }
  return taskRepositoryInstance;
}
