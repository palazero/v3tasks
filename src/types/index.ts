/**
 * 核心類型定義
 * 禁用 any 類型，所有類型必須明確定義
 */

// ============= 列舉類型 =============

/**
 * 用戶角色
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * 視圖類型
 */
export enum ViewType {
  LIST = 'list',
  TABLE = 'table',
  BOARD = 'board',
  GANTT = 'gantt',
  DASHBOARD = 'dashboard',
}

/**
 * 自訂欄位類型
 */
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multiSelect',
  USER = 'user',
  CHECKBOX = 'checkbox',
}

/**
 * 任務狀態
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'inProgress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/**
 * 任務優先級
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============= 核心實體 =============

/**
 * 用戶
 */
export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 專案設定
 */
export interface ProjectSettings {
  defaultViewId?: string;
  allowMemberInvite: boolean;
  taskNumberPrefix?: string;
  theme?: string;
}

/**
 * 專案
 */
export interface Project {
  projectId: string;
  name: string;
  description: string;
  icon?: string;
  iconColor?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ProjectSettings;
  isArchived?: boolean;
}

/**
 * 專案成員 (用於 UI 顯示)
 */
export interface ProjectMember {
  userId: string;
  role: 'owner' | 'member' | 'admin';
}

/**
 * 任務
 */
export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  description: RichTextContent;
  statusId: string;
  assigneeId?: string;
  priorityId: string;
  startDateTime?: Date | null;
  endDateTime?: Date | null;

  // 巢狀結構
  parentTaskId?: string | null;
  children?: Task[];
  order: number;
  level: number;
  isExpanded?: boolean;

  // 任務依賴
  dependencyIds?: string[]; // 前置任務 IDs
  blockedByIds?: string[]; // 被哪些任務阻擋

  // 系統欄位
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;

  // 自訂欄位值
  customFields: CustomFieldValue[];

  // 其他
  tags?: string[];
  attachments?: Attachment[];
  progress?: number;
}

/**
 * 富文本內容
 */
export interface RichTextContent {
  type: 'doc';
  content: RichTextNode[];
}

/**
 * 富文本節點
 */
export interface RichTextNode {
  type: string;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
}

/**
 * 富文本標記
 */
export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * 附件
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

/**
 * 自訂欄位值
 */
export interface CustomFieldValue {
  fieldId: string;
  value: string | number | boolean | Date | string[] | null;
}

/**
 * 篩選配置
 */
export interface FilterConfig {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string | number | boolean | Date | string[] | null;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * 篩選運算符
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  IN = 'in',
  NOT_IN = 'notIn',
}

/**
 * 排序配置
 */
export interface SortConfig {
  fieldId: string;
  direction: 'asc' | 'desc';
}

/**
 * 視圖配置
 */
export interface ViewConfig {
  filters: FilterConfig[];
  sorts: SortConfig[];
  groupBy?: string;
  visibleFields: string[];
  viewSpecificSettings?: ViewSpecificSettings;
}

/**
 * 視圖特定設定
 */
export interface ViewSpecificSettings {
  // 看板視圖
  boardColumns?: string[];
  swimlanes?: string;

  // 甘特圖
  timeScale?: 'day' | 'week' | 'month';
  showDependencies?: boolean;

  // 表格視圖
  columnWidths?: Record<string, number>;
  rowHeight?: number;

  // 儀表板
  widgets?: DashboardWidget[];
}

/**
 * 儀表板小工具
 */
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'list' | 'calendar';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * 視圖
 */
export interface View {
  viewId: string;
  projectId: string;
  name: string;
  type: ViewType;
  isDeletable: boolean;
  isPersonal: boolean;
  creatorId: string;
  config: ViewConfig;
  order: number; // 視圖排序順序
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 自訂欄位定義
 */
export interface CustomFieldDefinition {
  fieldId: string;
  projectId: string;
  name: string;
  type: FieldType;
  options?: FieldOption[];
  defaultValue?: string | number | boolean | Date | string[] | null;
  isRequired: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 欄位選項
 */
export interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

// ============= 輔助類型 =============

/**
 * 權限動作
 */
export enum PermissionAction {
  // 專案
  CREATE_PROJECT = 'createProject',
  EDIT_PROJECT = 'editProject',
  DELETE_PROJECT = 'deleteProject',
  MANAGE_MEMBERS = 'manageMembers',

  // 任務
  CREATE_TASK = 'createTask',
  EDIT_TASK = 'editTask',
  DELETE_TASK = 'deleteTask',
  ASSIGN_TASK = 'assignTask',

  // 視圖
  CREATE_VIEW = 'createView',
  EDIT_VIEW = 'editView',
  DELETE_VIEW = 'deleteView',

  // 自訂欄位
  CREATE_CUSTOM_FIELD = 'createCustomField',
  EDIT_CUSTOM_FIELD = 'editCustomField',
  DELETE_CUSTOM_FIELD = 'deleteCustomField',

  // 系統
  MANAGE_USERS = 'manageUsers',
  VIEW_ALL_PROJECTS = 'viewAllProjects',
}

/**
 * 權限檢查結果
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * 分頁參數
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * 分頁結果
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API 回應
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 載入狀態
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/**
 * 錯誤狀態
 */
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============= 系統狀態 =============

/**
 * 預設狀態列表
 */
export const DEFAULT_STATUSES: Array<{ id: string; label: string; color: string }> = [
  { id: 'todo', label: '待處理', color: 'grey' },
  { id: 'inProgress', label: '進行中', color: 'blue' },
  { id: 'done', label: '已完成', color: 'green' },
  { id: 'cancelled', label: '已取消', color: 'red' },
];

/**
 * 預設優先級列表
 */
export const DEFAULT_PRIORITIES: Array<{ id: string; label: string; color: string; icon: string }> =
  [
    { id: 'low', label: '低', color: 'grey', icon: 'arrow_downward' },
    { id: 'medium', label: '中', color: 'blue', icon: 'remove' },
    { id: 'high', label: '高', color: 'orange', icon: 'arrow_upward' },
    { id: 'urgent', label: '緊急', color: 'red', icon: 'priority_high' },
  ];

/**
 * 系統欄位定義
 */
export const SYSTEM_FIELDS = {
  TITLE: { id: 'title', label: '標題', type: FieldType.TEXT },
  STATUS: { id: 'status', label: '狀態', type: FieldType.SELECT },
  ASSIGNEE: { id: 'assignee', label: '指派對象', type: FieldType.USER },
  PRIORITY: { id: 'priority', label: '優先級', type: FieldType.SELECT },
  START_DATE: { id: 'startDateTime', label: '開始時間', type: FieldType.DATE },
  END_DATE: { id: 'endDateTime', label: '結束時間', type: FieldType.DATE },
  CREATOR: { id: 'creator', label: '建立者', type: FieldType.USER },
  CREATED_AT: { id: 'createdAt', label: '建立時間', type: FieldType.DATE },
  UPDATED_AT: { id: 'updatedAt', label: '更新時間', type: FieldType.DATE },
};

// ============= 工具類型 =============

/**
 * 深度部分類型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 可為空類型
 */
export type Nullable<T> = T | null;

/**
 * 可選類型
 */
export type Optional<T> = T | undefined;

/**
 * ID 類型
 */
export type ID = string;

/**
 * 時間戳類型
 */
export type Timestamp = Date;

// ============= 視圖配置 =============

/**
 * 篩選條件
 */
export interface FilterCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greater' | 'less' | 'between';
  value: string | number | Date | Array<string | number>;
}

/**
 * 欄位配置
 */
export interface ColumnConfig {
  key: string;
  label: string;
  description?: string;
  width?: number;
  visible: boolean;
  sortable?: boolean;
  resizable?: boolean;
}

/**
 * 視圖配置
 */
export interface ViewConfiguration {
  viewType: ViewType | string;
  visibleColumns?: ColumnConfig[];
  filters?: FilterCondition[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
  hideCompleted?: boolean;
  compactMode?: boolean;
  showSubtasks?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 視圖預設配置
 */
export interface ViewPreset {
  presetId: string;
  name: string;
  description?: string;
  configuration: ViewConfiguration;
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用戶視圖配置（資料庫儲存格式）
 */
export interface UserViewConfiguration {
  configId: string;
  userId: string;
  projectId: string;
  viewType: string;
  configuration: ViewConfiguration;
  createdAt: Date;
  updatedAt: Date;
}

// ============= 自訂欄位 =============

/**
 * 自訂欄位定義
 */
export interface CustomField {
  fieldId: string;
  projectId: string;
  name: string;
  description?: string;
  type: FieldType;
  isRequired: boolean;
  isSystem: boolean;
  options?: FieldOption[];
  defaultValue?: string | number | boolean | Date | string[] | null;
  validation?: FieldValidation;
  displayOrder: number;
  isVisible: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 欄位驗證規則
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
  errorMessage?: string;
  placeholder?: string;
  helpText?: string;
}

/**
 * 自訂欄位值
 */
export interface CustomFieldValue {
  fieldId: string;
  value: string | number | boolean | Date | string[] | null;
  displayValue?: string;
}

/**
 * 欄位設定
 */
export interface FieldSettings {
  width?: number;
  placeholder?: string;
  helpText?: string;
  displayFormat?: string;
  allowMultiple?: boolean;
  maxItems?: number;
}
