/**
 * 企業級事件命名規範
 * 
 * 統一的事件類型定義，確保整個應用程式中事件命名的一致性
 */

import type { Task, View, Project, User } from './index'

/**
 * 任務相關事件
 * 使用資源導向命名：task-{動作}
 */
export interface TaskEvents {
  // UI 層級事件（用戶界面動作）
  'task-add': [statusId?: string]                    // 請求新增任務（開啟新增對話框）
  'task-edit': [taskId: string]                      // 請求編輯任務（開啟編輯對話框）
  'task-view': [taskId: string]                      // 請求查看任務（開啟詳情）
  'task-duplicate': [taskId: string]                 // 請求複製任務
  'task-click': [task: Task]                         // 任務被點擊
  'task-select': [task: Task]                        // 任務被選擇
  
  // 數據層級事件（實際數據操作）
  'task-create': [data: Partial<Task>]               // 執行創建任務（提交數據）
  'task-update': [taskId: string, updates: Partial<Task>] // 執行更新任務（提交數據）
  'task-delete': [taskId: string]                    // 執行刪除任務
  'task-move': [taskId: string, newStatus: string]   // 移動任務（拖拉）
  
  // 完成狀態事件（操作結果）
  'task-created': [task: Task]                       // 任務創建成功
  'task-updated': [task: Task]                       // 任務更新成功
  'task-deleted': [taskId: string]                   // 任務刪除成功
  'task-moved': [task: Task]                         // 任務移動成功
  
  // 批量操作事件
  'tasks-reorder': [updates: Array<{ taskId: string; updates: Partial<Task> }>] // 任務重新排序
}

/**
 * 子任務相關事件
 * 使用資源導向命名：subtask-{動作}
 */
export interface SubtaskEvents {
  'subtask-add': [parentTaskId: string]              // 新增子任務
  'subtask-remove': [parentTaskId: string, childId: string] // 移除子任務
  'subtask-update': [taskId: string, updates: Partial<Task>] // 更新子任務
  'subtask-reorder': [parentTaskId: string, childIds: string[]] // 子任務重新排序
}

/**
 * 表單與輸入事件
 * 使用 Vue 3 v-model 規範：update:{屬性名}
 */
export interface FormEvents {
  'update:modelValue': [value: unknown]              // v-model 預設
  'update:search': [query: string]                   // 搜尋輸入
  'update:timeRange': [range: string]                // 時間範圍
  'update:showAssignee': [show: boolean]             // 顯示指派人
  'update:showDueDate': [show: boolean]              // 顯示到期日
  'update:cardSize': [size: 'small' | 'medium' | 'large'] // 卡片大小
}

/**
 * UI 交互事件
 * 使用動作導向命名：{動作}-{目標}
 */
export interface UIEvents {
  // 顯示/隱藏
  'show-dialog': [dialogType: string]                // 顯示對話框
  'hide-panel': [panelType: string]                  // 隱藏面板
  'toggle-sidebar': []                               // 切換側邊欄
  'show-settings': []                                // 顯示設定
  'show-filter': []                                  // 顯示篩選
  'show-sort': []                                    // 顯示排序
  
  // 操作動作
  'refresh': []                                      // 重新整理
  'export': [format: 'pdf' | 'excel' | 'image']     // 導出
  'import': [file: File]                             // 導入
  'toggle-fullscreen': []                            // 切換全螢幕
}

/**
 * 狀態變更事件
 * 使用狀態導向命名：{狀態}-changed
 */
export interface StateEvents {
  'status-changed': [newStatus: string, oldStatus: string] // 狀態已變更
  'selection-changed': [selectedIds: string[]]        // 選擇已變更
  'filter-changed': [filters: Record<string, unknown>] // 篩選已變更
  'sort-changed': [sortBy: string, order: 'asc' | 'desc'] // 排序已變更
  'view-changed': [view: View]                        // 視圖已變更
}

/**
 * 專案相關事件
 */
export interface ProjectEvents {
  'project-create': [data: Partial<Project>]
  'project-update': [projectId: string, updates: Partial<Project>]
  'project-delete': [projectId: string]
  'project-select': [project: Project]
}

/**
 * 用戶相關事件
 */
export interface UserEvents {
  'user-login': [user: User]
  'user-logout': []
  'user-select': [user: User]
  'user-switch': [userId: string]
}

/**
 * 配置相關事件
 */
export interface ConfigEvents {
  'config-change': [config: Record<string, unknown>]
  'configuration-update': [updates: Record<string, unknown>]
}

/**
 * 所有事件的聯合類型
 * 用於類型檢查和 IDE 自動補全
 */
export type AllEvents = TaskEvents & 
                       SubtaskEvents & 
                       FormEvents & 
                       UIEvents & 
                       StateEvents & 
                       ProjectEvents & 
                       UserEvents & 
                       ConfigEvents

/**
 * 事件名稱常數
 * 用於避免字符串拼寫錯誤
 */
export const EVENT_NAMES = {
  // 任務事件
  TASK_ADD: 'task-add',
  TASK_EDIT: 'task-edit',
  TASK_DELETE: 'task-delete',
  TASK_DUPLICATE: 'task-duplicate',
  TASK_CLICK: 'task-click',
  TASK_UPDATE: 'task-update',
  TASK_CREATE: 'task-create',
  TASK_CREATED: 'task-created',
  
  // 子任務事件
  SUBTASK_ADD: 'subtask-add',
  SUBTASK_REMOVE: 'subtask-remove',
  
  // UI 事件
  SHOW_DIALOG: 'show-dialog',
  SHOW_SETTINGS: 'show-settings',
  REFRESH: 'refresh',
  
  // 更新事件
  UPDATE_SEARCH: 'update:search',
  UPDATE_MODEL_VALUE: 'update:modelValue',
} as const

/**
 * 事件命名驗證
 * 檢查事件名稱是否符合規範
 */
export function validateEventName(eventName: string): boolean {
  const patterns = [
    /^task-(add|edit|delete|duplicate|click|update|create|created|moved)$/,
    /^subtask-(add|remove|update|reorder)$/,
    /^update:[a-zA-Z][a-zA-Z0-9]*$/,
    /^(show|hide|toggle)-[a-zA-Z][a-zA-Z0-9-]*$/,
    /^[a-zA-Z][a-zA-Z0-9]*-(changed|completed)$/,
  ]
  
  return patterns.some(pattern => pattern.test(eventName))
}

/**
 * 建議的事件名稱
 * 根據舊的命名提供新的建議
 */
export const EVENT_MIGRATIONS = {
  'add-task': 'task-add',
  'edit-task': 'task-edit',
  'delete-task': 'task-delete',
  'duplicate-task': 'task-duplicate',
  'add-subtask': 'subtask-add',
  'remove-subtask': 'subtask-remove',
} as const