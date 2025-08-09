/**
 * 巢狀任務管理 Composable
 * 處理任務層級結構、排序、縮排等操作
 */

// removed unused imports: computed, ref
import type { Task } from '@/types'
import { nanoid } from 'nanoid'

export function useNestedTasks() {
  // 最大巢狀層級
  const MAX_LEVEL = 3

  /**
   * 將扁平化任務列表轉換為樹狀結構
   */
  function buildTaskTree(tasks: Task[]): Task[] {
    const taskMap = new Map<string, Task>()
    const rootTasks: Task[] = []

    // 建立任務映射並初始化子任務陣列
    tasks.forEach(task => {
      taskMap.set(task.taskId, { ...task, children: [] })
    })

    // 建立父子關係
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.taskId)!
      
      if (task.parentTaskId) {
        const parent = taskMap.get(task.parentTaskId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(taskWithChildren)
        }
      } else {
        rootTasks.push(taskWithChildren)
      }
    })

    // 按 order 排序
    const sortTasks = (tasks: Task[]): Task[] => {
      tasks.sort((a, b) => a.order - b.order)
      tasks.forEach(task => {
        if (task.children && task.children.length > 0) {
          task.children = sortTasks(task.children)
        }
      })
      return tasks
    }

    return sortTasks(rootTasks)
  }

  /**
   * 將樹狀結構轉換為扁平化列表
   */
  function flattenTaskTree(tasks: Task[]): Task[] {
    const flattened: Task[] = []
    
    function traverse(tasks: Task[], level = 0) {
      tasks.forEach(task => {
        const flatTask = { ...task, level }
        delete flatTask.children // 移除 children 避免序列化問題
        flattened.push(flatTask)
        
        if (task.children && task.children.length > 0) {
          traverse(task.children, level + 1)
        }
      })
    }
    
    traverse(tasks)
    return flattened
  }

  /**
   * 新增子任務
   */
  function createSubtask(parentTask: Task, title: string): Partial<Task> {
    const newOrder = getNextOrder(parentTask.children || [])
    
    return {
      taskId: nanoid(12),
      projectId: parentTask.projectId,
      title,
      description: {
        type: 'doc',
        content: []
      },
      statusId: 'todo',
      priorityId: 'medium',
      parentTaskId: parentTask.taskId,
      order: newOrder,
      level: parentTask.level + 1,
      isExpanded: false,
      creatorId: parentTask.creatorId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * 增加任務縮排（成為上一個同級任務的子任務）
   */
  function indentTask(task: Task, allTasks: Task[]): { taskId: string; updates: Partial<Task> } | null {
    if (task.level >= MAX_LEVEL) return null

    const siblings = getSiblings(task, allTasks)
    const taskIndex = siblings.findIndex(t => t.taskId === task.taskId)
    
    if (taskIndex <= 0) return null // 沒有前一個兄弟任務

    const previousSibling = siblings[taskIndex - 1]
    const newOrder = getNextOrder(previousSibling.children || [])

    return {
      taskId: task.taskId,
      updates: {
        parentTaskId: previousSibling.taskId,
        level: previousSibling.level + 1,
        order: newOrder
      }
    }
  }

  /**
   * 減少任務縮排（提升到父任務的同級）
   */
  function outdentTask(task: Task, allTasks: Task[]): { taskId: string; updates: Partial<Task> } | null {
    if (task.level <= 0 || !task.parentTaskId) return null

    const parent = allTasks.find(t => t.taskId === task.parentTaskId)
    if (!parent) return null

    const parentSiblings = getSiblings(parent, allTasks)
    const newOrder = getNextOrder(parentSiblings)

    return {
      taskId: task.taskId,
      updates: {
        parentTaskId: parent.parentTaskId || null,
        level: parent.level,
        order: newOrder
      }
    }
  }

  /**
   * 切換任務展開/收合狀態
   */
  function toggleTaskExpanded(task: Task): { taskId: string; updates: Partial<Task> } {
    return {
      taskId: task.taskId,
      updates: {
        isExpanded: !task.isExpanded
      }
    }
  }

  /**
   * 重新排序任務
   */
  function reorderTasks(
    draggedTask: Task, 
    targetTask: Task, 
    position: 'before' | 'after' | 'child',
    allTasks: Task[]
  ): Array<{ taskId: string; updates: Partial<Task> }> {
    const updates: Array<{ taskId: string; updates: Partial<Task> }> = []

    // 使用 if-else 替代 switch，避免 lexical declaration 問題且邏輯更清晰
    if (position === 'before') {
      const siblings = getSiblings(targetTask, allTasks)
      // targetIndex not used but findIndex called for potential future use
      
      updates.push({
        taskId: draggedTask.taskId,
        updates: {
          parentTaskId: targetTask.parentTaskId || null,
          level: targetTask.level,
          order: targetTask.order - 0.5
        }
      })
    } else if (position === 'after') {
      const siblings = getSiblings(targetTask, allTasks)
      const targetIndex = siblings.findIndex(t => t.taskId === targetTask.taskId)
      
      updates.push({
        taskId: draggedTask.taskId,
        updates: {
          parentTaskId: targetTask.parentTaskId || null,
          level: targetTask.level,
          order: targetTask.order + 0.5
        }
      })
    } else if (position === 'child') {
      if (targetTask.level < MAX_LEVEL) {
        const newOrder = getNextOrder(targetTask.children || [])
        
        updates.push({
          taskId: draggedTask.taskId,
          updates: {
            parentTaskId: targetTask.taskId,
            level: targetTask.level + 1,
            order: newOrder
          }
        })
      }
    }

    return updates
  }

  /**
   * 取得兄弟任務列表
   */
  function getSiblings(task: Task, allTasks: Task[]): Task[] {
    return allTasks.filter(t => t.parentTaskId === task.parentTaskId)
  }

  /**
   * 取得下一個排序數字
   */
  function getNextOrder(tasks: Task[]): number {
    if (tasks.length === 0) return 1000
    const maxOrder = Math.max(...tasks.map(t => t.order))
    return maxOrder + 1000
  }

  /**
   * 正規化任務順序（重新分配連續的整數順序）
   */
  function normalizeTaskOrder(tasks: Task[]): Array<{ taskId: string; updates: Partial<Task> }> {
    const updates: Array<{ taskId: string; updates: Partial<Task> }> = []
    
    function processLevel(tasks: Task[], startOrder = 1000) {
      tasks.sort((a, b) => a.order - b.order)
      
      tasks.forEach((task, index) => {
        const newOrder = startOrder + (index * 1000)
        if (task.order !== newOrder) {
          updates.push({
            taskId: task.taskId,
            updates: { order: newOrder }
          })
        }
        
        if (task.children && task.children.length > 0) {
          processLevel(task.children, startOrder)
        }
      })
    }
    
    const rootTasks = tasks.filter(t => !t.parentTaskId)
    processLevel(rootTasks)
    
    return updates
  }

  return {
    MAX_LEVEL,
    buildTaskTree,
    flattenTaskTree,
    createSubtask,
    indentTask,
    outdentTask,
    toggleTaskExpanded,
    reorderTasks,
    getSiblings,
    normalizeTaskOrder
  }
}