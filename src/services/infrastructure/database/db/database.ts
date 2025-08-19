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
  ViewConfiguration,
  ViewPreset,
} from '@/types';
import type { ReportEntity } from '@/types/report';

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
  viewConfigurations!: Table<ViewConfiguration>;
  viewPresets!: Table<ViewPreset>;
  reports!: Table<ReportEntity>;

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
        'fieldId, projectId, type, displayOrder, isRequired, isSystem, isVisible, [projectId+displayOrder]',

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

    // 版本 3 - 新增報表表格
    this.version(3)
      .stores({
        // 報表表格 - 新增自訂報表儲存
        reports: 'id, projectId, createdBy, name, chartType, dimension, isTemplate, isActive, order, createdAt, updatedAt, [projectId+createdBy], [projectId+isTemplate]',
      })
      .upgrade(async (tx) => {
        // 遷移現有 localStorage 報表資料到 IndexedDB
        try {
          const existingReports = localStorage.getItem('customReports');
          if (existingReports) {
            const reports = JSON.parse(existingReports) as ReportEntity[];
            
            if (Array.isArray(reports) && reports.length > 0) {
              // 批量插入到新的 reports 表格
              await tx.table('reports').bulkAdd(reports.map(report => ({
                ...report,
                // 確保必要欄位存在
                id: report.id || `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: report.createdAt || new Date(),
                updatedAt: report.updatedAt || new Date(),
                isActive: report.isActive ?? true,
                order: report.order ?? 0,
                isTemplate: report.isTemplate ?? false,
                isPublic: report.isPublic ?? false
              })));
              
              // 成功遷移後，備份 localStorage 資料然後清除
              localStorage.setItem('customReports_backup', existingReports);
              localStorage.removeItem('customReports');
              
              console.log(`已成功遷移 ${reports.length} 個報表從 localStorage 到 IndexedDB`);
            }
          }
        } catch (error) {
          console.warn('報表資料遷移過程中發生錯誤:', error);
          // 遷移失敗不應該阻止資料庫升級
        }
      });

    // 映射到類別屬性
    this.users = this.table('users');
    this.projects = this.table('projects');
    this.tasks = this.table('tasks');
    this.views = this.table('views');
    this.customFields = this.table('customFields');
    this.viewConfigurations = this.table('viewConfigurations');
    this.viewPresets = this.table('viewPresets');
    this.reports = this.table('reports');
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
        this.viewConfigurations,
        this.viewPresets,
        this.reports,
      ],
      async () => {
        await Promise.all([
          this.users.clear(),
          this.projects.clear(),
          this.tasks.clear(),
          this.views.clear(),
          this.customFields.clear(),
          this.viewConfigurations.clear(),
          this.viewPresets.clear(),
          this.reports.clear(),
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
    viewConfigurations: number;
    viewPresets: number;
    reports: number;
  }> {
    const [
      users,
      projects,
      tasks,
      views,
      customFields,
      viewConfigurations,
      viewPresets,
      reports,
    ] = await Promise.all([
      this.users.count(),
      this.projects.count(),
      this.tasks.count(),
      this.views.count(),
      this.customFields.count(),
      this.viewConfigurations.count(),
      this.viewPresets.count(),
      this.reports.count(),
    ]);

    return {
      users,
      projects,
      tasks,
      views,
      customFields,
      viewConfigurations,
      viewPresets,
      reports,
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
