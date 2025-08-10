/**
 * 事件匯流排服務
 * 用於元件間的事件通信
 */

type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * 訂閱事件
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  /**
   * 取消訂閱事件
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 觸發事件
   */
  emit(event: string, ...args: unknown[]): void {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event)!;
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * 清除所有事件
   */
  clear(): void {
    this.events.clear();
  }
}

// 創建全域事件匯流排實例
export const eventBus = new EventBus();

// 定義常用的事件名稱
export const EVENTS = {
  PROJECT_UPDATED: 'project:updated',
  PROJECT_CREATED: 'project:created',
  PROJECT_DELETED: 'project:deleted',
  USER_UPDATED: 'user:updated',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
