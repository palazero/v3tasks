/**
 * 視圖配置服務
 * 處理視圖配置的持久化儲存
 */

import { getDatabase } from './db/database';
import type { ViewConfiguration, ViewPreset, UserViewConfiguration } from '@/types';
import { nanoid } from 'nanoid';

export class ViewConfigurationService {
  private readonly tableName = 'viewConfigurations';
  private readonly presetsTableName = 'viewPresets';

  constructor() {
    void this.initializeTables();
  }

  /**
   * 清理資料，移除不可序列化的屬性
   */
  private sanitizeData<T>(data: T): T {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // 移除函數、Symbol、undefined 和循環引用
    const cleanObject = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (obj instanceof Date) return obj;
      if (Array.isArray(obj)) return obj.map(item => cleanObject(item));
      
      if (typeof obj === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'function') continue;
          if (typeof value === 'symbol') continue;
          if (value === undefined) continue;
          if (key === 'children') continue;
          
          cleaned[key] = cleanObject(value);
        }
        return cleaned;
      }
      
      return obj;
    };
    
    return cleanObject(sanitized) as T;
  }

  /**
   * 初始化資料表
   */
  private async initializeTables(): Promise<void> {
    // 資料表在 database.ts 中已經定義，這裡不需要額外初始化
    // 如果需要預設資料，可以在這裡初始化預設視圖配置
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
    const db = getDatabase();

    // 檢查是否已存在配置
    const existing = await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .first() as UserViewConfiguration | undefined;

    const now = new Date();

    if (existing) {
      // 更新現有配置
      const updates: Partial<UserViewConfiguration> = {
        configuration,
        updatedAt: now,
      };
      await db.viewConfigurations.update(existing.configId, this.sanitizeData(updates));
    } else {
      // 建立新配置
      const newConfig: UserViewConfiguration = {
        configId: nanoid(),
        userId,
        projectId,
        viewType,
        configuration,
        createdAt: now,
        updatedAt: now,
      };
      await db.viewConfigurations.add(this.sanitizeData(newConfig));
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
    const db = getDatabase();

    const config = await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .first() as UserViewConfiguration | undefined;

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
    const db = getDatabase();

    await db.viewConfigurations
      .where(['userId', 'projectId', 'viewType'])
      .equals([userId, projectId, viewType])
      .delete();
  }

  /**
   * 取得用戶所有視圖配置
   */
  async getUserViewConfigurations(userId: string): Promise<UserViewConfiguration[]> {
    const db = getDatabase();

    return await db.viewConfigurations.where('userId').equals(userId).toArray() as UserViewConfiguration[];
  }

  /**
   * 儲存視圖預設配置
   */
  async saveViewPreset(
    preset: Omit<ViewPreset, 'presetId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const db = getDatabase();

    const now = new Date();
    const presetId = nanoid();
    const newPreset: ViewPreset = {
      ...preset,
      presetId,
      createdAt: now,
      updatedAt: now,
    };
    await db.viewPresets.add(this.sanitizeData(newPreset));

    return presetId;
  }

  /**
   * 更新視圖預設配置
   */
  async updateViewPreset(presetId: string, updates: Partial<Omit<ViewPreset, 'presetId'>>): Promise<void> {
    const db = getDatabase();

    const updateData: Partial<ViewPreset> = {
      ...updates,
      updatedAt: new Date(),
    };
    await db.viewPresets.update(presetId, this.sanitizeData(updateData));
  }

  /**
   * 刪除視圖預設配置
   */
  async deleteViewPreset(presetId: string): Promise<void> {
    const db = getDatabase();

    await db.viewPresets.delete(presetId);
  }

  /**
   * 取得所有視圖預設配置
   */
  async getViewPresets(includeSystem = true): Promise<ViewPreset[]> {
    const db = getDatabase();

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
    const db = getDatabase();

    const preset = await db.viewPresets.get(presetId);
    return preset || null;
  }

  /**
   * 初始化系統預設配置
   */
  async initializeSystemPresets(): Promise<void> {
    const db = getDatabase();

    // 檢查是否已有系統預設
    const allPresets = await db.viewPresets.toArray();
    const existingSystemPresets = allPresets.filter((preset: ViewPreset) => preset.isSystem).length;

    if (existingSystemPresets > 0) {
      return; // 系統預設已存在
    }

    const systemPresets: Array<Omit<ViewPreset, 'presetId' | 'createdAt' | 'updatedAt'>> = [
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
