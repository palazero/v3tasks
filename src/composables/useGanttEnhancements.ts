/**
 * 甘特圖進階功能 Composable
 * 提供甘特圖的進階操作和計算功能
 */

import { ref, type Ref } from 'vue'
import type { Task } from '@/types'

export interface GanttTask extends Task {
  ganttStartDate: Date
  ganttEndDate: Date
  ganttProgress: number
  ganttDependencies: string[]
  ganttCritical: boolean
}

export interface CriticalPath {
  taskIds: string[]
  totalDuration: number
  endDate: Date
}

export interface GanttSettings {
  timelineScale: 'day' | 'week' | 'month'
  showWeekends: boolean
  showDependencies: boolean
  showCriticalPath: boolean
  showProgress: boolean
  autoSchedule: boolean
}

export interface GanttEnhancementsUtils {
  settings: Ref<GanttSettings>;
  timelineScaleOptions: Array<{ label: string; value: 'day' | 'week' | 'month' }>;
  convertToGanttTasks: (tasks: Task[]) => GanttTask[];
  calculateCriticalPath: (ganttTasks: GanttTask[]) => CriticalPath;
  autoScheduleTasks: (ganttTasks: GanttTask[]) => GanttTask[];
  calculateSlack: (ganttTasks: GanttTask[]) => Map<string, number>;
  getTimelineRange: (ganttTasks: GanttTask[]) => { start: Date; end: Date };
  generateTimelineLabels: (start: Date, end: Date, scale: 'day' | 'week' | 'month') => string[];
}

export function useGanttEnhancements(): GanttEnhancementsUtils {
  // 甘特圖設定
  const settings = ref<GanttSettings>({
    timelineScale: 'day',
    showWeekends: true,
    showDependencies: true,
    showCriticalPath: false,
    showProgress: true,
    autoSchedule: false
  })

  // 時間軸縮放選項
  const timelineScaleOptions: Array<{ label: string; value: 'day' | 'week' | 'month' }> = [
    { label: '日', value: 'day' },
    { label: '週', value: 'week' },
    { label: '月', value: 'month' }
  ]

  /**
   * 將任務轉換為甘特圖任務
   */
  function convertToGanttTasks(tasks: Task[]): GanttTask[] {
    return tasks.map(task => {
      const startDate = task.startDateTime ? new Date(task.startDateTime) : new Date()
      let endDate = task.endDateTime ? new Date(task.endDateTime) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      // 確保結束日期不早於開始日期
      if (endDate < startDate) {
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      }

      // 計算進度 (基於任務狀態)
      let progress = 0
      switch (task.statusId) {
        case 'done':
          progress = 100
          break
        case 'in-progress':
          progress = 50 // 簡化處理，實際可根據更複雜的邏輯
          break
        case 'todo':
          progress = 0
          break
        default:
          progress = 0
      }

      return {
        ...task,
        ganttStartDate: startDate,
        ganttEndDate: endDate,
        ganttProgress: progress,
        ganttDependencies: task.dependencyIds || [],
        ganttCritical: false // 將由關鍵路徑計算設定
      }
    })
  }

  /**
   * 計算關鍵路徑
   * 使用簡化的 CPM (Critical Path Method) 算法
   */
  function calculateCriticalPath(ganttTasks: GanttTask[]): CriticalPath {
    // 建立任務映射
    const taskMap = new Map<string, GanttTask>()
    ganttTasks.forEach(task => taskMap.set(task.taskId, task))

    // 計算每個任務的最早開始時間和最晚開始時間
    const earlyStart = new Map<string, Date>()
    const earlyFinish = new Map<string, Date>()
    const lateStart = new Map<string, Date>()
    const lateFinish = new Map<string, Date>()

    // 前向計算 (Early Start/Finish)
    function calculateForward(taskId: string): void {
      const task = taskMap.get(taskId)
      if (!task || earlyStart.has(taskId)) return

      let maxPredecessorFinish = task.ganttStartDate

      // 檢查依賴任務
      for (const depId of task.ganttDependencies) {
        calculateForward(depId)
        const depFinish = earlyFinish.get(depId)
        if (depFinish && depFinish > maxPredecessorFinish) {
          maxPredecessorFinish = depFinish
        }
      }

      earlyStart.set(taskId, maxPredecessorFinish)
      earlyFinish.set(taskId, new Date(maxPredecessorFinish.getTime() + 
        (task.ganttEndDate.getTime() - task.ganttStartDate.getTime())))
    }

    // 計算所有任務的前向時間
    ganttTasks.forEach(task => calculateForward(task.taskId))

    // 找到專案結束時間 (最晚的完成時間)
    const projectEnd = new Date(Math.max(...Array.from(earlyFinish.values()).map(d => d.getTime())))

    // 後向計算 (Late Start/Finish)
    function calculateBackward(taskId: string): void {
      const task = taskMap.get(taskId)
      if (!task || lateFinish.has(taskId)) return

      // 找到所有依賴於此任務的後續任務
      const successors = ganttTasks.filter(t => t.ganttDependencies.includes(taskId))
      
      let minSuccessorStart = projectEnd
      
      if (successors.length === 0) {
        // 沒有後續任務，使用專案結束時間
        minSuccessorStart = projectEnd
      } else {
        // 計算所有後續任務的最早開始時間
        for (const successor of successors) {
          calculateBackward(successor.taskId)
          const succStart = lateStart.get(successor.taskId)
          if (succStart && succStart < minSuccessorStart) {
            minSuccessorStart = succStart
          }
        }
      }

      lateFinish.set(taskId, minSuccessorStart)
      lateStart.set(taskId, new Date(minSuccessorStart.getTime() - 
        (task.ganttEndDate.getTime() - task.ganttStartDate.getTime())))
    }

    // 計算所有任務的後向時間
    ganttTasks.forEach(task => calculateBackward(task.taskId))

    // 識別關鍵任務 (浮動時間為0的任務)
    const criticalTasks: string[] = []
    let totalDuration = 0

    ganttTasks.forEach(task => {
      const early = earlyStart.get(task.taskId)
      const late = lateStart.get(task.taskId)
      
      if (early && late && Math.abs(early.getTime() - late.getTime()) < 24 * 60 * 60 * 1000) {
        criticalTasks.push(task.taskId)
        task.ganttCritical = true
        
        // 計算任務持續時間
        const duration = task.ganttEndDate.getTime() - task.ganttStartDate.getTime()
        totalDuration += duration
      } else {
        task.ganttCritical = false
      }
    })

    return {
      taskIds: criticalTasks,
      totalDuration: totalDuration / (24 * 60 * 60 * 1000), // 轉換為天數
      endDate: projectEnd
    }
  }

  /**
   * 自動排程任務
   * 根據依賴關係自動調整任務時間
   */
  function autoScheduleTasks(ganttTasks: GanttTask[]): GanttTask[] {
    const taskMap = new Map<string, GanttTask>()
    const scheduled = new Set<string>()
    
    ganttTasks.forEach(task => taskMap.set(task.taskId, { ...task }))

    function scheduleTask(taskId: string): void {
      if (scheduled.has(taskId)) return
      
      const task = taskMap.get(taskId)
      if (!task) return

      // 先排程所有依賴任務
      let latestPredecessorEnd = task.ganttStartDate

      for (const depId of task.ganttDependencies) {
        scheduleTask(depId)
        const predecessor = taskMap.get(depId)
        if (predecessor && predecessor.ganttEndDate > latestPredecessorEnd) {
          latestPredecessorEnd = predecessor.ganttEndDate
        }
      }

      // 調整任務開始時間
      if (latestPredecessorEnd > task.ganttStartDate) {
        const duration = task.ganttEndDate.getTime() - task.ganttStartDate.getTime()
        task.ganttStartDate = latestPredecessorEnd
        task.ganttEndDate = new Date(task.ganttStartDate.getTime() + duration)
      }

      scheduled.add(taskId)
    }

    // 排程所有任務
    ganttTasks.forEach(task => scheduleTask(task.taskId))

    return Array.from(taskMap.values())
  }

  /**
   * 計算任務的浮動時間
   */
  function calculateSlack(ganttTasks: GanttTask[]): Map<string, number> {
    const taskMap = new Map<string, GanttTask>()
    ganttTasks.forEach(task => taskMap.set(task.taskId, task))

    const slack = new Map<string, number>()

    // 簡化計算：基於依賴關係計算基本浮動時間
    ganttTasks.forEach(task => {
      const successors = ganttTasks.filter(t => t.ganttDependencies.includes(task.taskId))
      
      if (successors.length === 0) {
        // 沒有後續任務，浮動時間為0
        slack.set(task.taskId, 0)
      } else {
        // 計算到最早後續任務的時間差
        const earliestSuccessor = successors.reduce((earliest, current) => 
          current.ganttStartDate < earliest.ganttStartDate ? current : earliest
        )
        
        const slackTime = (earliestSuccessor.ganttStartDate.getTime() - task.ganttEndDate.getTime()) / (24 * 60 * 60 * 1000)
        slack.set(task.taskId, Math.max(0, slackTime))
      }
    })

    return slack
  }

  /**
   * 獲取甘特圖顯示的時間範圍
   */
  function getTimelineRange(ganttTasks: GanttTask[]): { start: Date; end: Date } {
    if (ganttTasks.length === 0) {
      const now = new Date()
      return {
        start: now,
        end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    }

    const startDates = ganttTasks.map(task => task.ganttStartDate.getTime())
    const endDates = ganttTasks.map(task => task.ganttEndDate.getTime())

    const minStart = new Date(Math.min(...startDates))
    const maxEnd = new Date(Math.max(...endDates))

    // 添加一些邊距
    const margin = 7 * 24 * 60 * 60 * 1000 // 7天
    
    return {
      start: new Date(minStart.getTime() - margin),
      end: new Date(maxEnd.getTime() + margin)
    }
  }

  /**
   * 生成時間軸標籤
   */
  function generateTimelineLabels(start: Date, end: Date, scale: 'day' | 'week' | 'month'): string[] {
    const labels: string[] = []
    const current = new Date(start)

    while (current <= end) {
      switch (scale) {
        case 'day':
          labels.push(current.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }))
          current.setDate(current.getDate() + 1)
          break
        case 'week':
          labels.push(`第${Math.ceil(current.getDate() / 7)}週`)
          current.setDate(current.getDate() + 7)
          break
        case 'month':
          labels.push(current.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short' }))
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    return labels
  }

  return {
    settings,
    timelineScaleOptions,
    convertToGanttTasks,
    calculateCriticalPath,
    autoScheduleTasks,
    calculateSlack,
    getTimelineRange,
    generateTimelineLabels
  }
}