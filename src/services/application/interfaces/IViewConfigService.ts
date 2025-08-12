/**
 * 視圖配置應用服務介面
 * 協調視圖配置的業務邏輯
 */

import type { ViewConfiguration, ViewType, ColumnConfig } from '@/types'

export interface IViewConfigService {
  /**
   * 取得視圖配置
   */
  getViewConfiguration(
    viewType: ViewType,
    projectId: string,
    userId: string
  ): Promise<ViewConfiguration>

  /**
   * 儲存視圖配置
   */
  saveViewConfiguration(
    viewType: ViewType,
    projectId: string,
    userId: string,
    config: ViewConfiguration
  ): Promise<void>

  /**
   * 重置視圖配置為預設值
   */
  resetToDefault(
    viewType: ViewType,
    projectId: string,
    userId: string
  ): Promise<ViewConfiguration>

  /**
   * 取得預設視圖配置
   */
  getDefaultConfiguration(
    viewType: ViewType,
    projectId: string
  ): Promise<ViewConfiguration>

  /**
   * 複製視圖配置
   */
  copyConfiguration(
    sourceViewType: ViewType,
    targetViewType: ViewType,
    projectId: string,
    userId: string
  ): Promise<void>

  /**
   * 匯出視圖配置
   */
  exportConfiguration(
    viewType: ViewType,
    projectId: string,
    userId: string
  ): Promise<string>

  /**
   * 匯入視圖配置
   */
  importConfiguration(
    viewType: ViewType,
    projectId: string,
    userId: string,
    configData: string
  ): Promise<ViewConfiguration>
}