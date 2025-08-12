/**
 * 事件匯流排服務實作
 * 用於元件間的事件通信
 */

import type { IEventBus } from '../interfaces/IEventBus'

type EventCallback<T = unknown> = (data?: T) => void

class EventBusService implements IEventBus {
  private events: Map<string, EventCallback[]> = new Map()

  /**
   * 發布事件
   */
  emit<T = unknown>(eventName: string, data?: T): void {
    const callbacks = this.events.get(eventName)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`事件處理器錯誤 [${eventName}]:`, error)
        }
      })
    }
  }

  /**
   * 訂閱事件
   */
  on<T = unknown>(eventName: string, callback: (data?: T) => void): () => void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, [])
    }
    
    const callbacks = this.events.get(eventName)!
    callbacks.push(callback as EventCallback)

    // 返回取消訂閱函數
    return () => {
      const index = callbacks.indexOf(callback as EventCallback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 訂閱事件（僅一次）
   */
  once<T = unknown>(eventName: string, callback: (data?: T) => void): void {
    const onceCallback = (data?: T) => {
      callback(data)
      this.off(eventName, onceCallback)
    }
    this.on(eventName, onceCallback)
  }

  /**
   * 取消事件訂閱
   */
  off(eventName: string, callback?: (data?: unknown) => void): void {
    if (!callback) {
      // 移除事件的所有監聽器
      this.events.delete(eventName)
      return
    }

    const callbacks = this.events.get(eventName)
    if (callbacks) {
      const index = callbacks.indexOf(callback as EventCallback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }

      // 如果沒有剩餘的監聽器，刪除整個事件
      if (callbacks.length === 0) {
        this.events.delete(eventName)
      }
    }
  }

  /**
   * 清除所有事件監聽器
   */
  clear(): void {
    this.events.clear()
  }

  /**
   * 取得事件監聽器數量
   */
  listenerCount(eventName: string): number {
    const callbacks = this.events.get(eventName)
    return callbacks ? callbacks.length : 0
  }

  /**
   * 取得所有事件名稱
   */
  getEventNames(): string[] {
    return Array.from(this.events.keys())
  }

  /**
   * 檢查是否有指定事件的監聽器
   */
  hasListeners(eventName: string): boolean {
    return this.listenerCount(eventName) > 0
  }
}

// 建立單例實例
export const eventBus = new EventBusService()

// 事件常數定義
export const EVENTS = {
  // 任務相關事件
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_STATUS_CHANGED: 'task:status-changed',
  
  // 專案相關事件
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_MEMBER_ADDED: 'project:member-added',
  PROJECT_MEMBER_REMOVED: 'project:member-removed',
  
  // 視圖相關事件
  VIEW_CHANGED: 'view:changed',
  VIEW_CONFIG_UPDATED: 'view:config-updated',
  VIEW_FILTER_APPLIED: 'view:filter-applied',
  
  // 用戶相關事件
  USER_SWITCHED: 'user:switched',
  USER_PREFERENCES_UPDATED: 'user:preferences-updated',
  
  // 系統相關事件
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info'
} as const

// 向後兼容導出
export { eventBus as default }

// 類型導出
export type { IEventBus } from '../interfaces/IEventBus'