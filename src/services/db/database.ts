/**
 * IndexedDB 資料庫設定
 * 使用 Dexie.js 作為 IndexedDB 的封裝
 */

import Dexie, { type Table } from 'dexie';
import type {
  User,
  Project,
  Task,
  View,
  CustomField,
  CustomFieldGroup,
  ViewConfiguration,
  ViewPreset,
} from '@/types';

/**
 * 資料庫類別
 */
export class AppDatabase extends Dexie {
  // 資料表定義
  users!: Table<User>;
  projects!: Table<Project>;
  tasks!: Table<Task>;
  views!: Table<View>;
  customFields!: Table<CustomField>;
  customFieldGroups!: Table<CustomFieldGroup>;
  viewConfigurations!: Table<ViewConfiguration>;
  viewPresets!: Table<ViewPreset>;

  constructor() {
    super('TaskManagementDB');

    // 定義資料庫結構
    // 版本 1 - 初始版本
    this.version(1).stores({
      // 用戶表
      users: 'userId, email, role, name',

      // 專案表
      projects: 'projectId, name, ownerId, *memberIds, isArchived',

      // 任務表
      tasks:
        'taskId, projectId, parentTaskId, assigneeId, statusId, priorityId, creatorId, [projectId+parentTaskId], order',

      // 視圖表
      views: 'viewId, projectId, type, creatorId, isDeletable, isPersonal, [projectId+type]',

      // 自訂欄位表
      customFields:
        'fieldId, projectId, type, displayOrder, isRequired, isSystem, isVisible, groupId, [projectId+displayOrder]',

      // 自訂欄位群組表
      customFieldGroups: 'groupId, projectId, name, displayOrder, [projectId+displayOrder]',

      // 視圖配置表
      viewConfigurations: 'configId, userId, projectId, viewType, [userId+projectId+viewType]',

      // 視圖預設表
      viewPresets: 'presetId, name, viewType, isSystem, isGlobal, createdBy',
    });

    // 版本 2 - 增加專案icon欄位
    this.version(2)
      .stores({
        // 專案表 - 增加icon欄位
        projects: 'projectId, name, description, icon, ownerId, *memberIds, isArchived',
      })
      .upgrade((tx) => {
        // 遷移現有專案資料，為沒有icon的專案設定預設值
        return tx
          .table('projects')
          .toCollection()
          .modify((project) => {
            if (!Object.hasOwn(project, 'icon')) {
              project.icon = '📁'; // 預設專案圖示
            }
            if (!Object.hasOwn(project, 'description')) {
              project.description = ''; // 確保description欄位存在
            }
          });
      });

    // 映射到類別屬性
    this.users = this.table('users');
    this.projects = this.table('projects');
    this.tasks = this.table('tasks');
    this.views = this.table('views');
    this.customFields = this.table('customFields');
    this.customFieldGroups = this.table('customFieldGroups');
    this.viewConfigurations = this.table('viewConfigurations');
    this.viewPresets = this.table('viewPresets');
  }

  /**
   * 清空所有資料（用於開發測試）
   */
  async clearAllData(): Promise<void> {
    await this.transaction(
      'rw',
      [
        this.users,
        this.projects,
        this.tasks,
        this.views,
        this.customFields,
        this.customFieldGroups,
        this.viewConfigurations,
        this.viewPresets,
      ],
      async () => {
        await Promise.all([
          this.users.clear(),
          this.projects.clear(),
          this.tasks.clear(),
          this.views.clear(),
          this.customFields.clear(),
          this.customFieldGroups.clear(),
          this.viewConfigurations.clear(),
          this.viewPresets.clear(),
        ]);
      },
    );
  }

  /**
   * 檢查資料庫是否已初始化
   */
  async isInitialized(): Promise<boolean> {
    const userCount = await this.users.count();
    return userCount > 0;
  }

  /**
   * 取得資料庫統計資訊
   */
  async getStats(): Promise<{
    users: number;
    projects: number;
    tasks: number;
    views: number;
    customFields: number;
    customFieldGroups: number;
    viewConfigurations: number;
    viewPresets: number;
  }> {
    const [
      users,
      projects,
      tasks,
      views,
      customFields,
      customFieldGroups,
      viewConfigurations,
      viewPresets,
    ] = await Promise.all([
      this.users.count(),
      this.projects.count(),
      this.tasks.count(),
      this.views.count(),
      this.customFields.count(),
      this.customFieldGroups.count(),
      this.viewConfigurations.count(),
      this.viewPresets.count(),
    ]);

    return {
      users,
      projects,
      tasks,
      views,
      customFields,
      customFieldGroups,
      viewConfigurations,
      viewPresets,
    };
  }
}

// 建立資料庫實例（單例模式）
let dbInstance: AppDatabase | null = null;

/**
 * 取得資料庫實例
 */
export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}

/**
 * 主要資料庫實例 (alias for getDatabase())
 */
export const db = getDatabase();

/**
 * 關閉資料庫連線
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
