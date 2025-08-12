/**
 * 事件匯流排介面
 * 定義事件發布訂閱的標準操作
 */

export interface IEventBus {
  /**
   * 發布事件
   */
  emit<T = unknown>(eventName: string, data?: T): void

  /**
   * 訂閱事件
   */
  on<T = unknown>(eventName: string, callback: (data?: T) => void): () => void

  /**
   * 訂閱事件（僅一次）
   */
  once<T = unknown>(eventName: string, callback: (data?: T) => void): void

  /**
   * 取消事件訂閱
   */
  off(eventName: string, callback?: (data?: unknown) => void): void

  /**
   * 清除所有事件監聽器
   */
  clear(): void

  /**
   * 取得事件監聽器數量
   */
  listenerCount(eventName: string): number
}