/**
 * 任務領域服務介面
 * 定義任務相關的核心業務操作
 */

import type { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '@/types'

export interface ITaskService {
  /**
   * 建立新任務
   */
  createTask(request: CreateTaskRequest): Promise<Task>

  /**
   * 更新任務
   */
  updateTask(id: string, updates: UpdateTaskRequest): Promise<Task>

  /**
   * 刪除任務
   */
  deleteTask(id: string): Promise<void>

  /**
   * 根據 ID 取得任務
   */
  getTaskById(id: string): Promise<Task | null>

  /**
   * 取得專案的所有任務
   */
  getTasksByProject(projectId: string): Promise<Task[]>

  /**
   * 取得用戶的所有任務
   */
  getTasksByUser(userId: string): Promise<Task[]>

  /**
   * 更新任務狀態
   */
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>

  /**
   * 更新任務優先級
   */
  updateTaskPriority(id: string, priority: TaskPriority): Promise<Task>

  /**
   * 批量更新任務
   */
  batchUpdateTasks(updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]>

  /**
   * 複製任務
   */
  duplicateTask(id: string, overrides?: Partial<Task>): Promise<Task>

  /**
   * 移動任務到不同專案
   */
  moveTaskToProject(taskId: string, targetProjectId: string): Promise<Task>
}