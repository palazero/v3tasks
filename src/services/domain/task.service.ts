/**
 * 任務領域服務實作
 * 實作任務相關的核心業務邏輯
 */

import type { ITaskService } from './interfaces/ITaskService'
import type { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '@/types'
import { getTaskRepository, getProjectRepository } from '../repositories'
import { nanoid } from 'nanoid'

export class TaskService implements ITaskService {
  /**
   * 建立新任務
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    const taskRepo = getTaskRepository()
    
    // 驗證專案存在
    if (request.projectId) {
      const projectRepo = getProjectRepository()
      const project = await projectRepo.findById(request.projectId)
      if (!project) {
        throw new Error(`專案不存在: ${request.projectId}`)
      }
    }

    const newTask: Task = {
      ...request,
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: request.status || 'todo',
      priority: request.priority || 'medium',
      progress: request.progress || 0,
      customFields: request.customFields || {},
      tags: request.tags || []
    }

    return await taskRepo.create(newTask)
  }

  /**
   * 更新任務
   */
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    const taskRepo = getTaskRepository()
    
    const existingTask = await taskRepo.findById(id)
    if (!existingTask) {
      throw new Error(`任務不存在: ${id}`)
    }

    const updatedTask = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await taskRepo.update(id, updatedTask)
  }

  /**
   * 刪除任務
   */
  async deleteTask(id: string): Promise<void> {
    const taskRepo = getTaskRepository()
    
    const existingTask = await taskRepo.findById(id)
    if (!existingTask) {
      throw new Error(`任務不存在: ${id}`)
    }

    await taskRepo.delete(id)
  }

  /**
   * 根據 ID 取得任務
   */
  async getTaskById(id: string): Promise<Task | null> {
    const taskRepo = getTaskRepository()
    return await taskRepo.findById(id)
  }

  /**
   * 取得專案的所有任務
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const taskRepo = getTaskRepository()
    return await taskRepo.findBy({ projectId })
  }

  /**
   * 取得用戶的所有任務
   */
  async getTasksByUser(userId: string): Promise<Task[]> {
    const taskRepo = getTaskRepository()
    return await taskRepo.findBy({ assigneeId: userId })
  }

  /**
   * 更新任務狀態
   */
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const updates: UpdateTaskRequest = { status }
    
    // 如果狀態改為完成，更新進度為 100%
    if (status === 'done') {
      updates.progress = 100
      updates.completedAt = new Date().toISOString()
    }

    return await this.updateTask(id, updates)
  }

  /**
   * 更新任務優先級
   */
  async updateTaskPriority(id: string, priority: TaskPriority): Promise<Task> {
    return await this.updateTask(id, { priority })
  }

  /**
   * 批量更新任務
   */
  async batchUpdateTasks(updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]> {
    const taskRepo = getTaskRepository()
    const results: Task[] = []

    for (const { id, updates: taskUpdates } of updates) {
      try {
        const updatedTask = await taskRepo.update(id, {
          ...taskUpdates,
          updatedAt: new Date().toISOString()
        })
        results.push(updatedTask)
      } catch (error) {
        console.warn(`批量更新任務失敗 ${id}:`, error)
      }
    }

    return results
  }

  /**
   * 複製任務
   */
  async duplicateTask(id: string, overrides?: Partial<Task>): Promise<Task> {
    const originalTask = await this.getTaskById(id)
    if (!originalTask) {
      throw new Error(`任務不存在: ${id}`)
    }

    const duplicatedTask: CreateTaskRequest = {
      title: `${originalTask.title} (副本)`,
      description: originalTask.description,
      projectId: originalTask.projectId,
      assigneeId: originalTask.assigneeId,
      status: 'todo',
      priority: originalTask.priority,
      startDateTime: originalTask.startDateTime,
      endDateTime: originalTask.endDateTime,
      estimatedHours: originalTask.estimatedHours,
      tags: [...(originalTask.tags || [])],
      customFields: { ...originalTask.customFields },
      parentTaskId: originalTask.parentTaskId,
      ...overrides
    }

    return await this.createTask(duplicatedTask)
  }

  /**
   * 移動任務到不同專案
   */
  async moveTaskToProject(taskId: string, targetProjectId: string): Promise<Task> {
    // 驗證目標專案存在
    const projectRepo = getProjectRepository()
    const targetProject = await projectRepo.findById(targetProjectId)
    if (!targetProject) {
      throw new Error(`目標專案不存在: ${targetProjectId}`)
    }

    return await this.updateTask(taskId, { projectId: targetProjectId })
  }
}