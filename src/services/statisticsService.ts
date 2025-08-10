/**
 * 統計服務 - 提供各種統計資料計算
 */

import { getTaskRepository, getProjectRepository, getUserRepository } from './repositories'
import type { Task, Project, TaskStatus, TaskPriority } from '@/types'

export interface TaskStatistics {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  overdue: number
  dueToday: number
  dueThisWeek: number
  completed: number
  completionRate: number
}

export interface ProjectStatistics {
  total: number
  active: number
  archived: number
  tasksPerProject: { projectId: string; projectName: string; taskCount: number }[]
  completionRates: { projectId: string; projectName: string; rate: number }[]
}

export interface UserStatistics {
  assignedTasks: number
  completedTasks: number
  overdueTasks: number
  completionRate: number
  workload: { date: string; taskCount: number }[]
}

export interface TimelineData {
  date: string
  created: number
  completed: number
  active: number
}

export class StatisticsService {
  private taskRepo = getTaskRepository()
  private projectRepo = getProjectRepository()
  private userRepo = getUserRepository()

  /**
   * 獲取任務統計資料
   */
  async getTaskStatistics(projectId?: string): Promise<TaskStatistics> {
    let tasks: Task[]
    
    if (projectId && projectId !== 'all') {
      tasks = await this.taskRepo.findByProject(projectId)
    } else {
      tasks = await this.taskRepo.findAll()
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 狀態統計
    const byStatus: Record<TaskStatus, number> = {
      todo: 0,
      inProgress: 0,
      done: 0,
      cancelled: 0
    }

    // 優先級統計
    const byPriority: Record<TaskPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }

    let overdue = 0
    let dueToday = 0
    let dueThisWeek = 0
    let completed = 0

    tasks.forEach(task => {
      // 狀態統計
      if (task.statusId in byStatus) {
        byStatus[task.statusId as TaskStatus]++
      }

      // 優先級統計
      if (task.priorityId in byPriority) {
        byPriority[task.priorityId as TaskPriority]++
      }

      // 完成任務計數
      if (task.statusId === 'done') {
        completed++
      }

      // 截止日期統計
      if (task.endDateTime) {
        const dueDate = new Date(task.endDateTime)
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

        if (dueDateOnly < today && task.statusId !== 'done') {
          overdue++
        } else if (dueDateOnly.getTime() === today.getTime()) {
          dueToday++
        } else if (dueDateOnly >= today && dueDateOnly < nextWeek) {
          dueThisWeek++
        }
      }
    })

    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      dueToday,
      dueThisWeek,
      completed,
      completionRate
    }
  }

  /**
   * 獲取專案統計資料
   */
  async getProjectStatistics(): Promise<ProjectStatistics> {
    const projects = await this.projectRepo.findAll()
    const allTasks = await this.taskRepo.findAll()

    const active = projects.filter(p => !p.isArchived).length
    const archived = projects.filter(p => p.isArchived).length

    // 每個專案的任務數量
    const tasksPerProject = projects.map(project => {
      const tasks = allTasks.filter(task => task.projectId === project.projectId)
      return {
        projectId: project.projectId,
        projectName: project.name,
        taskCount: tasks.length
      }
    }).sort((a, b) => b.taskCount - a.taskCount)

    // 每個專案的完成率
    const completionRates = projects.map(project => {
      const tasks = allTasks.filter(task => task.projectId === project.projectId)
      const completedTasks = tasks.filter(task => task.statusId === 'done').length
      const rate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0

      return {
        projectId: project.projectId,
        projectName: project.name,
        rate
      }
    }).sort((a, b) => b.rate - a.rate)

    return {
      total: projects.length,
      active,
      archived,
      tasksPerProject,
      completionRates
    }
  }

  /**
   * 獲取用戶統計資料
   */
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    const allTasks = await this.taskRepo.findAll()
    const userTasks = allTasks.filter(task => task.assigneeId === userId)

    const assignedTasks = userTasks.length
    const completedTasks = userTasks.filter(task => task.statusId === 'done').length
    
    // 逾期任務
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const overdueTasks = userTasks.filter(task => {
      if (!task.endDateTime || task.statusId === 'done') return false
      const dueDate = new Date(task.endDateTime)
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
      return dueDateOnly < today
    }).length

    const completionRate = assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0

    // 過去30天的工作量
    const workload: { date: string; taskCount: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const tasksOnDate = userTasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]
        return createdDate === dateStr
      }).length

      workload.push({
        date: dateStr,
        taskCount: tasksOnDate
      })
    }

    return {
      assignedTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      workload
    }
  }

  /**
   * 獲取時間軸資料 (過去30天)
   */
  async getTimelineData(projectId?: string): Promise<TimelineData[]> {
    let tasks: Task[]
    
    if (projectId && projectId !== 'all') {
      tasks = await this.taskRepo.findByProject(projectId)
    } else {
      tasks = await this.taskRepo.findAll()
    }

    const timeline: TimelineData[] = []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      // 當天創建的任務
      const created = tasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]
        return createdDate === dateStr
      }).length

      // 當天完成的任務
      const completed = tasks.filter(task => {
        if (task.statusId !== 'done') return false
        const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]
        return completedDate === dateStr
      }).length

      // 當天活躍的任務 (創建但未完成)
      const active = tasks.filter(task => {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0]
        const isCreatedByDate = createdDate <= dateStr
        
        if (!isCreatedByDate) return false
        if (task.statusId === 'done') {
          const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]
          return completedDate > dateStr
        }
        return task.statusId !== 'done'
      }).length

      timeline.push({
        date: dateStr,
        created,
        completed,
        active
      })
    }

    return timeline
  }

  /**
   * 獲取專案進度報告
   */
  async getProjectProgressReport(projectId: string) {
    const project = await this.projectRepo.findById(projectId)
    if (!project) return null

    const tasks = await this.taskRepo.findByProject(projectId)
    const taskStats = await this.getTaskStatistics(projectId)

    // 里程碑統計 (根據任務層級)
    const milestones = tasks.filter(task => task.level === 0) // 頂級任務作為里程碑
    const completedMilestones = milestones.filter(task => task.statusId === 'done').length

    // 近期活動
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentActivity = tasks.filter(task => {
      return new Date(task.updatedAt) >= oneWeekAgo
    }).length

    // 風險評估 (逾期任務比例)
    const riskLevel = taskStats.overdue / tasks.length > 0.2 ? 'high' : 
                     taskStats.overdue / tasks.length > 0.1 ? 'medium' : 'low'

    return {
      project,
      taskStats,
      milestones: {
        total: milestones.length,
        completed: completedMilestones,
        rate: milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0
      },
      recentActivity,
      riskLevel,
      estimatedCompletion: this.calculateEstimatedCompletion(tasks)
    }
  }

  /**
   * 計算預估完成時間 (簡化算法)
   */
  private calculateEstimatedCompletion(tasks: Task[]): string | null {
    const incompleteTasks = tasks.filter(task => task.statusId !== 'done')
    if (incompleteTasks.length === 0) return null

    // 簡化：假設每個任務需要1天，根據過去完成速度調整
    const completedTasks = tasks.filter(task => task.statusId === 'done')
    if (completedTasks.length === 0) return null

    // 計算平均完成速度 (任務數/天)
    const now = new Date()
    const projectStart = new Date(Math.min(...tasks.map(t => new Date(t.createdAt).getTime())))
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)))
    const completionRate = completedTasks.length / daysElapsed

    if (completionRate <= 0) return null

    const estimatedDays = Math.ceil(incompleteTasks.length / completionRate)
    const estimatedDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000)
    
    return estimatedDate.toISOString().split('T')[0]
  }
}

// 導出單例實例
export const statisticsService = new StatisticsService()