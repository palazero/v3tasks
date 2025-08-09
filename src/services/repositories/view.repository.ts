/**
 * 視圖 Repository
 * 處理視圖相關的資料存取
 */

import { BaseRepository } from './base.repository'
import { db } from '../db/database'
import type { View, ViewType } from '@/types'

export class ViewRepository extends BaseRepository<View> {
  constructor() {
    super(db.views)
  }

  /**
   * 取得專案的所有視圖
   */
  async findByProject(projectId: string): Promise<View[]> {
    return await this.table.where('projectId').equals(projectId).toArray()
  }

  /**
   * 取得用戶建立的視圖
   */
  async findByCreator(creatorId: string): Promise<View[]> {
    return await this.table.where('creatorId').equals(creatorId).toArray()
  }

  /**
   * 取得專案的特定類型視圖
   */
  async findByProjectAndType(projectId: string, type: ViewType): Promise<View[]> {
    return await this.table
      .where('[projectId+type]')
      .equals([projectId, type])
      .toArray()
  }

  /**
   * 取得個人視圖
   */
  async findPersonalViews(projectId: string, userId: string): Promise<View[]> {
    return await this.table
      .where('projectId').equals(projectId)
      .and(view => view.isPersonal && view.creatorId === userId)
      .toArray()
  }

  /**
   * 取得團隊視圖
   */
  async findTeamViews(projectId: string): Promise<View[]> {
    return await this.table
      .where('projectId').equals(projectId)
      .and(view => !view.isPersonal)
      .toArray()
  }

  /**
   * 取得可刪除的視圖
   */
  async findDeletableViews(projectId: string): Promise<View[]> {
    return await this.table
      .where('projectId').equals(projectId)
      .and(view => view.isDeletable)
      .toArray()
  }

  /**
   * 取得預設視圖（不可刪除的視圖）
   */
  async findDefaultViews(projectId: string): Promise<View[]> {
    return await this.table
      .where('projectId').equals(projectId)
      .and(view => !view.isDeletable)
      .toArray()
  }

  /**
   * 取得 All Tasks 視圖
   */
  async findAllTasksViews(): Promise<View[]> {
    return await this.table.where('projectId').equals('all').toArray()
  }

  /**
   * 複製視圖
   */
  async duplicate(viewId: string, newName: string, creatorId: string): Promise<string> {
    const view = await this.findById(viewId)
    if (!view) {
      throw new Error('View not found')
    }

    const newView: View = {
      ...view,
      viewId: '', // 將由資料庫自動生成
      name: newName,
      creatorId,
      isDeletable: true, // 複製的視圖都可刪除
      isPersonal: true, // 複製的視圖預設為個人視圖
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // @ts-ignore - viewId will be generated
    delete newView.viewId
    
    const newId = await this.create(newView as View)
    return String(newId)
  }

  /**
   * 更新視圖配置
   */
  async updateConfig(viewId: string, config: Partial<View['config']>): Promise<void> {
    const view = await this.findById(viewId)
    if (!view) return

    const updatedConfig = {
      ...view.config,
      ...config
    }

    await this.update(viewId, { 
      config: updatedConfig,
      updatedAt: new Date()
    })
  }

  /**
   * 切換視圖的個人/團隊屬性
   */
  async togglePersonal(viewId: string): Promise<void> {
    const view = await this.findById(viewId)
    if (!view) return

    await this.update(viewId, {
      isPersonal: !view.isPersonal,
      updatedAt: new Date()
    })
  }

  /**
   * 取得視圖統計資訊
   */
  async getProjectStats(projectId: string): Promise<{
    total: number
    personal: number
    team: number
    byType: Record<ViewType, number>
  }> {
    const views = await this.findByProject(projectId)
    
    const byType: Record<ViewType, number> = {
      list: 0,
      table: 0,
      board: 0,
      gantt: 0,
      dashboard: 0
    }

    views.forEach(view => {
      byType[view.type]++
    })

    return {
      total: views.length,
      personal: views.filter(v => v.isPersonal).length,
      team: views.filter(v => !v.isPersonal).length,
      byType
    }
  }

  /**
   * 檢查視圖名稱是否已存在
   */
  async isNameExists(projectId: string, name: string, excludeId?: string): Promise<boolean> {
    const views = await this.findByProject(projectId)
    return views.some(view => 
      view.name === name && view.viewId !== excludeId
    )
  }

  /**
   * 根據類型取得預設視圖配置
   */
  getDefaultConfig(type: ViewType): View['config'] {
    const baseConfig: View['config'] = {
      filters: [],
      sorts: [],
      visibleFields: [
        'title',
        'status',
        'assignee',
        'priority',
        'startDateTime',
        'endDateTime'
      ]
    }

    switch (type) {
      case 'board':
        return {
          ...baseConfig,
          groupBy: 'status',
          viewSpecificSettings: {
            boardColumns: ['todo', 'inProgress', 'done']
          }
        }

      case 'gantt':
        return {
          ...baseConfig,
          viewSpecificSettings: {
            timeScale: 'week',
            showDependencies: true
          }
        }

      case 'table':
        return {
          ...baseConfig,
          viewSpecificSettings: {
            columnWidths: {},
            rowHeight: 40
          }
        }

      case 'dashboard':
        return {
          ...baseConfig,
          visibleFields: [],
          viewSpecificSettings: {
            widgets: []
          }
        }

      default:
        return baseConfig
    }
  }
}

// 建立單例實例
let viewRepositoryInstance: ViewRepository | null = null

/**
 * 取得 ViewRepository 實例
 */
export function getViewRepository(): ViewRepository {
  if (!viewRepositoryInstance) {
    viewRepositoryInstance = new ViewRepository()
  }
  return viewRepositoryInstance
}