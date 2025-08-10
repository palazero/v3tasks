/**
 * IndexedDB 資料庫設定
 * 使用 Dexie.js 作為 IndexedDB 的封裝
 */

import Dexie, { type Table } from 'dexie';
import type { User, Project, Task, View, CustomFieldDefinition } from '@/types';

/**
 * 資料庫類別
 */
export class AppDatabase extends Dexie {
  // 資料表定義
  users!: Table<User>;
  projects!: Table<Project>;
  tasks!: Table<Task>;
  views!: Table<View>;
  customFields!: Table<CustomFieldDefinition>;

  constructor() {
    super('TaskManagementDB');

    // 定義資料庫結構
    // 版本 1
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
      customFields: 'fieldId, projectId, type, order, [projectId+order]',
    });

    // 映射到類別屬性
    this.users = this.table('users');
    this.projects = this.table('projects');
    this.tasks = this.table('tasks');
    this.views = this.table('views');
    this.customFields = this.table('customFields');
  }

  /**
   * 清空所有資料（用於開發測試）
   */
  async clearAllData(): Promise<void> {
    await this.transaction(
      'rw',
      [this.users, this.projects, this.tasks, this.views, this.customFields],
      async () => {
        await Promise.all([
          this.users.clear(),
          this.projects.clear(),
          this.tasks.clear(),
          this.views.clear(),
          this.customFields.clear(),
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
  }> {
    const [users, projects, tasks, views, customFields] = await Promise.all([
      this.users.count(),
      this.projects.count(),
      this.tasks.count(),
      this.views.count(),
      this.customFields.count(),
    ]);

    return {
      users,
      projects,
      tasks,
      views,
      customFields,
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
 * 關閉資料庫連線
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// 導出預設實例
export const db = getDatabase();
