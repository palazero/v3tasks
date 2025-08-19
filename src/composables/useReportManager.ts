/**
 * 報表管理組合式函數 (Composable)
 * @description 提供報表相關操作的響應式介面，遵循 Vue 3 Composition API 規範
 */

import { ref, readonly, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { ReportService } from '@/services/domain/report.service'
import type {
  ReportConfig,
  ReportTemplate,
  ReportQuery,
  CreateReportRequest,
  UpdateReportRequest,
  REPORT_EVENTS
} from '@/types/report'
import type { IReportService } from '@/services/domain/interfaces/IReportService'

/**
 * 報表管理器選項
 */
export interface UseReportManagerOptions {
  /**
   * 專案 ID，預設為 'all'
   */
  projectId?: string
  
  /**
   * 是否自動載入報表
   */
  autoLoad?: boolean
  
  /**
   * 自訂報表服務實例
   */
  reportService?: IReportService
  
  /**
   * 啟用快取
   */
  enableCache?: boolean
  
  /**
   * 快取有效期（毫秒）
   */
  cacheTimeout?: number
}

/**
 * 報表管理器返回類型
 */
export interface ReportManagerReturn {
  // 響應式狀態
  reports: Readonly<Ref<ReportConfig[]>>
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  
  // 計算屬性
  hasReports: ComputedRef<boolean>
  reportCount: ComputedRef<number>
  reportsByType: ComputedRef<Record<string, ReportConfig[]>>
  
  // 報表操作方法
  loadReports: (query?: ReportQuery) => Promise<void>
  createReport: (request: CreateReportRequest) => Promise<ReportConfig>
  updateReport: (id: string, updates: UpdateReportRequest) => Promise<ReportConfig>
  deleteReport: (id: string) => Promise<void>
  duplicateReport: (id: string, newName: string) => Promise<ReportConfig>
  
  // 範本操作方法
  loadTemplates: () => Promise<ReportTemplate[]>
  createFromTemplate: (templateId: string, customization: CreateReportRequest) => Promise<ReportConfig>
  
  // 批量操作方法
  batchDelete: (ids: string[]) => Promise<void>
  
  // 匯入匯出方法
  exportReport: (id: string) => Promise<string>
  importReport: (configJson: string) => Promise<ReportConfig>
  
  // 工具方法
  getReportById: (id: string) => ReportConfig | undefined
  refreshReports: () => Promise<void>
  clearCache: () => void
  reset: () => void
}

/**
 * 報表管理組合式函數
 */
export function useReportManager(options: UseReportManagerOptions = {}): ReportManagerReturn {
  const {
    projectId = 'all',
    autoLoad = true,
    reportService = new ReportService(),
    enableCache = true,
    cacheTimeout = 5 * 60 * 1000 // 5 分鐘
  } = options

  const $q = useQuasar()

  // ========== 響應式狀態 ==========
  
  const reports = ref<ReportConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const templates = ref<ReportTemplate[]>([])
  
  // 快取相關
  const lastLoadTime = ref<number>(0)
  const cacheKey = `reports_${projectId}`

  // ========== 計算屬性 ==========
  
  const hasReports = computed(() => reports.value.length > 0)
  
  const reportCount = computed(() => reports.value.length)
  
  const reportsByType = computed(() => {
    const grouped: Record<string, ReportConfig[]> = {}
    reports.value.forEach(report => {
      const type = report.chartType
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(report)
    })
    return grouped
  })

  // ========== 報表操作方法 ==========
  
  /**
   * 載入報表列表
   */
  async function loadReports(query?: ReportQuery): Promise<void> {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      // 檢查快取
      if (enableCache && shouldUseCache()) {
        const cachedReports = getCachedReports()
        if (cachedReports) {
          reports.value = cachedReports
          loading.value = false
          return
        }
      }

      // 從服務載入
      const queryToUse: ReportQuery = {
        projectId,
        ...query
      }

      const loadedReports = await reportService.getReports(queryToUse)
      reports.value = loadedReports
      
      // 更新快取
      if (enableCache) {
        setCachedReports(loadedReports)
        lastLoadTime.value = Date.now()
      }

      // 發送載入完成事件
      emitEvent('reports-loaded', { reports: loadedReports, projectId })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })

      // 發送錯誤事件
      emitEvent('reports-error', { error: errorMessage, projectId })
    } finally {
      loading.value = false
    }
  }

  /**
   * 建立新報表
   */
  async function createReport(request: CreateReportRequest): Promise<ReportConfig> {
    loading.value = true
    error.value = null

    try {
      // 確保 projectId 一致
      const requestWithProject: CreateReportRequest = {
        ...request,
        projectId: request.projectId || projectId
      }

      const newReport = await reportService.createReport(requestWithProject)
      
      // 更新本地狀態
      reports.value.push(newReport)
      clearCache()

      // 發送建立成功事件
      emitEvent('report-created', { report: newReport })

      $q.notify({
        type: 'positive',
        message: '報表建立成功',
        position: 'top'
      })

      return newReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '建立報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新報表
   */
  async function updateReport(id: string, updates: UpdateReportRequest): Promise<ReportConfig> {
    loading.value = true
    error.value = null

    try {
      const updatedReport = await reportService.updateReport(id, updates)
      
      // 更新本地狀態
      const index = reports.value.findIndex(r => r.id === id)
      if (index > -1) {
        reports.value[index] = updatedReport
      }
      clearCache()

      // 發送更新成功事件
      emitEvent('report-updated', { report: updatedReport })

      $q.notify({
        type: 'positive',
        message: '報表更新成功',
        position: 'top'
      })

      return updatedReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 刪除報表
   */
  async function deleteReport(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await reportService.deleteReport(id)
      
      // 更新本地狀態
      const index = reports.value.findIndex(r => r.id === id)
      if (index > -1) {
        reports.value.splice(index, 1)
      }
      clearCache()

      // 發送刪除成功事件
      emitEvent('report-deleted', { reportId: id })

      $q.notify({
        type: 'positive',
        message: '報表刪除成功',
        position: 'top'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 複製報表
   */
  async function duplicateReport(id: string, newName: string): Promise<ReportConfig> {
    loading.value = true
    error.value = null

    try {
      const duplicatedReport = await reportService.duplicateReport(id, newName, projectId)
      
      // 更新本地狀態
      reports.value.push(duplicatedReport)
      clearCache()

      // 發送複製成功事件
      emitEvent('report-duplicated', { report: duplicatedReport, originalId: id })

      $q.notify({
        type: 'positive',
        message: '報表複製成功',
        position: 'top'
      })

      return duplicatedReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '複製報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== 範本操作方法 ==========
  
  /**
   * 載入報表範本
   */
  async function loadTemplates(): Promise<ReportTemplate[]> {
    try {
      const loadedTemplates = await reportService.getReportTemplates()
      templates.value = loadedTemplates
      return loadedTemplates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入範本失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    }
  }

  /**
   * 從範本建立報表
   */
  async function createFromTemplate(templateId: string, customization: CreateReportRequest): Promise<ReportConfig> {
    loading.value = true
    error.value = null

    try {
      const customizationWithProject: CreateReportRequest = {
        ...customization,
        projectId: customization.projectId || projectId
      }

      const newReport = await reportService.createReportFromTemplate(templateId, customizationWithProject)
      
      // 更新本地狀態
      reports.value.push(newReport)
      clearCache()

      // 發送範本建立成功事件
      emitEvent('report-created', { report: newReport, fromTemplate: templateId })

      $q.notify({
        type: 'positive',
        message: '從範本建立報表成功',
        position: 'top'
      })

      return newReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '從範本建立報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== 批量操作方法 ==========
  
  /**
   * 批量刪除報表
   */
  async function batchDelete(ids: string[]): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await reportService.batchDeleteReports(ids)
      
      // 更新本地狀態
      reports.value = reports.value.filter(r => !ids.includes(r.id))
      clearCache()

      // 發送批量刪除成功事件
      emitEvent('reports-batch-deleted', { reportIds: ids })

      $q.notify({
        type: 'positive',
        message: `成功刪除 ${ids.length} 個報表`,
        position: 'top'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量刪除報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== 匯入匯出方法 ==========
  
  /**
   * 匯出報表配置
   */
  async function exportReport(id: string): Promise<string> {
    try {
      const configJson = await reportService.exportReportConfig(id)
      
      // 發送匯出成功事件
      emitEvent('report-exported', { reportId: id })

      $q.notify({
        type: 'positive',
        message: '報表配置匯出成功',
        position: 'top'
      })

      return configJson
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '匯出報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    }
  }

  /**
   * 匯入報表配置
   */
  async function importReport(configJson: string): Promise<ReportConfig> {
    loading.value = true
    error.value = null

    try {
      const importedReport = await reportService.importReportConfig(configJson, projectId)
      
      // 更新本地狀態
      reports.value.push(importedReport)
      clearCache()

      // 發送匯入成功事件
      emitEvent('report-imported', { report: importedReport })

      $q.notify({
        type: 'positive',
        message: '報表配置匯入成功',
        position: 'top'
      })

      return importedReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '匯入報表失敗'
      error.value = errorMessage
      
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== 工具方法 ==========
  
  /**
   * 根據 ID 取得報表
   */
  function getReportById(id: string): ReportConfig | undefined {
    return reports.value.find(r => r.id === id)
  }

  /**
   * 重新整理報表
   */
  async function refreshReports(): Promise<void> {
    clearCache()
    await loadReports()
  }

  /**
   * 清除快取
   */
  function clearCache(): void {
    if (enableCache) {
      localStorage.removeItem(cacheKey)
      lastLoadTime.value = 0
    }
  }

  /**
   * 重設所有狀態
   */
  function reset(): void {
    reports.value = []
    templates.value = []
    loading.value = false
    error.value = null
    clearCache()
  }

  // ========== 私有方法 ==========
  
  /**
   * 檢查是否應該使用快取
   */
  function shouldUseCache(): boolean {
    if (!enableCache) return false
    const now = Date.now()
    return (now - lastLoadTime.value) < cacheTimeout
  }

  /**
   * 取得快取的報表
   */
  function getCachedReports(): ReportConfig[] | null {
    try {
      const cached = localStorage.getItem(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  /**
   * 設定快取的報表
   */
  function setCachedReports(reportsToCache: ReportConfig[]): void {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(reportsToCache))
    } catch {
      // 忽略快取錯誤
    }
  }

  /**
   * 發送事件
   */
  function emitEvent(eventName: string, data: unknown): void {
    // 實際環境中可以整合事件匯流排
    console.debug(`ReportManager Event: ${eventName}`, data)
  }

  // ========== 生命週期 ==========
  
  // 監聽 projectId 變化
  watch(() => projectId, () => {
    if (autoLoad) {
      void loadReports()
    }
  })

  // 組件掛載時自動載入
  onMounted(() => {
    if (autoLoad) {
      void loadReports()
    }
  })

  // 組件卸載時清理
  onUnmounted(() => {
    // 清理訂閱等
  })

  // ========== 返回介面 ==========
  
  return {
    // 響應式狀態 (readonly)
    reports: readonly(reports),
    loading: readonly(loading),
    error: readonly(error),
    
    // 計算屬性
    hasReports,
    reportCount,
    reportsByType,
    
    // 報表操作方法
    loadReports,
    createReport,
    updateReport,
    deleteReport,
    duplicateReport,
    
    // 範本操作方法
    loadTemplates,
    createFromTemplate,
    
    // 批量操作方法
    batchDelete,
    
    // 匯入匯出方法
    exportReport,
    importReport,
    
    // 工具方法
    getReportById,
    refreshReports,
    clearCache,
    reset
  }
}