/**
 * 視圖配置服務
 * 處理視圖配置的持久化儲存
 */

import { databaseService } from './databaseService';
import type { ViewConfiguration, ViewPreset } from '@/types';

export class ViewConfigurationService {
  private readonly tableName = 'viewConfigurations';
  private readonly presetsTableName = 'viewPresets';

  constructor() {
    void this.initializeTables();
  }

  /**
   * 初始化資料表
   */
  private async initializeTables(): Promise<void> {
    const db = databaseService.getDatabase();

    // 確保視圖配置表存在
    if (!db.viewConfigurations) {
      await databaseService.addTable(
        'viewConfigurations',
        '++id, userId, projectId, viewType, configuration, createdAt, updatedAt',
      );
    }

    // 確保視圖預設表存在
    if (!db.viewPresets) {
      await databaseService.addTable(
        'viewPresets',
        '++id, name, description, configuration, isSystem, createdBy, createdAt, updatedAt',
      );
    }
  }

  /**
   * 儲存用戶視圖配置
   */
  async saveUserViewConfiguration(
    userId: string,
    projectId: string,
    viewType: string,
    configuration: ViewConfiguration,
  ): Promise<void> {
    const db = databaseService.getDatabase();

    // 檢查是否已存在配置
    const existing = await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .first();

    const now = new Date();

    if (existing) {
      // 更新現有配置
      await db.viewConfigurations.update(existing.id, {
        configuration,
        updatedAt: now,
      });
    } else {
      // 建立新配置
      await db.viewConfigurations.add({
        userId,
        projectId,
        viewType,
        configuration,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * 載入用戶視圖配置
   */
  async loadUserViewConfiguration(
    userId: string,
    projectId: string,
    viewType: string,
  ): Promise<ViewConfiguration | null> {
    const db = databaseService.getDatabase();

    const config = await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .first();

    return config?.configuration || null;
  }

  /**
   * 刪除用戶視圖配置
   */
  async deleteUserViewConfiguration(
    userId: string,
    projectId: string,
    viewType: string,
  ): Promise<void> {
    const db = databaseService.getDatabase();

    await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .delete();
  }

  /**
   * 取得用戶所有視圖配置
   */
  async getUserViewConfigurations(userId: string): Promise<
    Array<{
      projectId: string;
      viewType: string;
      configuration: ViewConfiguration;
      updatedAt: Date;
    }>
  > {
    const db = databaseService.getDatabase();

    return await db.viewConfigurations.where('userId').equals(userId).toArray();
  }

  /**
   * 儲存視圖預設配置
   */
  async saveViewPreset(
    preset: Omit<ViewPreset, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const db = databaseService.getDatabase();

    const now = new Date();
    const id = await db.viewPresets.add({
      ...preset,
      createdAt: now,
      updatedAt: now,
    });

    return String(id);
  }

  /**
   * 更新視圖預設配置
   */
  async updateViewPreset(presetId: string, updates: Partial<ViewPreset>): Promise<void> {
    const db = databaseService.getDatabase();

    await db.viewPresets.update(presetId, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * 刪除視圖預設配置
   */
  async deleteViewPreset(presetId: string): Promise<void> {
    const db = databaseService.getDatabase();

    await db.viewPresets.delete(presetId);
  }

  /**
   * 取得所有視圖預設配置
   */
  async getViewPresets(includeSystem = true): Promise<ViewPreset[]> {
    const db = databaseService.getDatabase();

    let query = db.viewPresets.orderBy('name');

    if (!includeSystem) {
      query = query.filter((preset: ViewPreset) => !preset.isSystem);
    }

    return await query.toArray();
  }

  /**
   * 取得特定視圖預設配置
   */
  async getViewPreset(presetId: string): Promise<ViewPreset | null> {
    const db = databaseService.getDatabase();

    const preset = await db.viewPresets.get(presetId);
    return preset || null;
  }

  /**
   * 初始化系統預設配置
   */
  async initializeSystemPresets(): Promise<void> {
    const db = databaseService.getDatabase();

    // 檢查是否已有系統預設
    const existingSystemPresets = await db.viewPresets.where('isSystem').equals(true).count();

    if (existingSystemPresets > 0) {
      return; // 系統預設已存在
    }

    const systemPresets: Array<Omit<ViewPreset, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: '預設視圖',
        description: '標準任務表格視圖',
        configuration: {
          viewType: 'table',
          visibleColumns: [
            { key: 'title', label: '任務標題', width: 300, visible: true },
            { key: 'status', label: '狀態', width: 120, visible: true },
            { key: 'assignee', label: '指派人員', width: 150, visible: true },
            { key: 'priority', label: '優先級', width: 120, visible: true },
            { key: 'deadline', label: '截止日期', width: 180, visible: true },
            { key: 'progress', label: '進度', width: 150, visible: true },
          ],
          filters: [],
          sortBy: 'order',
          sortOrder: 'asc',
        },
        isSystem: true,
      },
      {
        name: '簡潔視圖',
        description: '只顯示核心欄位的精簡視圖',
        configuration: {
          viewType: 'table',
          visibleColumns: [
            { key: 'title', label: '任務標題', width: 400, visible: true },
            { key: 'status', label: '狀態', width: 120, visible: true },
            { key: 'assignee', label: '指派人員', width: 150, visible: true },
          ],
          filters: [],
          sortBy: 'title',
          sortOrder: 'asc',
          compactMode: true,
        },
        isSystem: true,
      },
      {
        name: '詳細視圖',
        description: '顯示所有可用欄位的詳細視圖',
        configuration: {
          viewType: 'table',
          visibleColumns: [
            { key: 'title', label: '任務標題', width: 250, visible: true },
            { key: 'status', label: '狀態', width: 100, visible: true },
            { key: 'assignee', label: '指派人員', width: 120, visible: true },
            { key: 'priority', label: '優先級', width: 100, visible: true },
            { key: 'deadline', label: '截止日期', width: 140, visible: true },
            { key: 'progress', label: '進度', width: 100, visible: true },
            { key: 'creator', label: '建立者', width: 120, visible: true },
            { key: 'createdAt', label: '建立時間', width: 140, visible: true },
            { key: 'updatedAt', label: '更新時間', width: 140, visible: true },
          ],
          filters: [],
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        isSystem: true,
      },
      {
        name: '專案管理',
        description: '適合專案管理的甘特圖視圖',
        configuration: {
          viewType: 'gantt',
          visibleColumns: [
            { key: 'title', label: '任務標題', width: 250, visible: true },
            { key: 'assignee', label: '指派人員', width: 120, visible: true },
            { key: 'deadline', label: '截止日期', width: 140, visible: true },
            { key: 'progress', label: '進度', width: 100, visible: true },
          ],
          filters: [],
          sortBy: 'deadline',
          sortOrder: 'asc',
          showSubtasks: true,
        },
        isSystem: true,
      },
    ];

    // 批量新增系統預設
    for (const preset of systemPresets) {
      await this.saveViewPreset(preset);
    }
  }

  /**
   * 重設視圖配置為預設值
   */
  async resetToDefault(userId: string, projectId: string, viewType: string): Promise<void> {
    await this.deleteUserViewConfiguration(userId, projectId, viewType);
  }

  /**
   * 匯出視圖配置
   */
  async exportViewConfigurations(userId: string): Promise<string> {
    const configurations = await this.getUserViewConfigurations(userId);
    return JSON.stringify(configurations, null, 2);
  }

  /**
   * 匯入視圖配置
   */
  async importViewConfigurations(userId: string, configurationJson: string): Promise<number> {
    try {
      const configurations = JSON.parse(configurationJson);
      let importedCount = 0;

      for (const config of configurations) {
        if (config.projectId && config.viewType && config.configuration) {
          await this.saveUserViewConfiguration(
            userId,
            config.projectId,
            config.viewType,
            config.configuration,
          );
          importedCount++;
        }
      }

      return importedCount;
    } catch {
      throw new Error('視圖配置格式無效');
    }
  }
}

// 單例實例
export const viewConfigurationService = new ViewConfigurationService();
