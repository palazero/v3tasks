/**
 * 視圖狀態管理 Store
 * 處理 AllTasks 和 ProjectView 的視圖切換
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { View, ViewType, ViewConfig } from '@/types'
import { ViewType as VT } from '@/types'
import { getViewRepository } from '@/services/repositories'
import { useUserStore } from './user'

export const useViewStore = defineStore('view', () => {
  // Repository
  const viewRepo = getViewRepository()
  
  // 狀態
  const views = ref<View[]>([])
  const currentViewId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性
  const currentView = computed(() => {
    if (!currentViewId.value) return null
    return views.value.find(v => v.viewId === currentViewId.value) || null
  })

  // 排序後的視圖
  const sortedViews = computed(() => {
    return [...views.value].sort((a, b) => (a.order || 0) - (b.order || 0))
  })

  // 取得 AllTasks 的視圖
  async function loadAllTasksViews(): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      const allTasksViews = await viewRepo.findAllTasksViews()
      views.value = allTasksViews
      
      // 如果沒有預設視圖，建立一個
      if (allTasksViews.length === 0) {
        await createDefaultAllTasksView()
      }
      
      // 恢復上次選中的視圖或設定預設視圖
      if (allTasksViews.length > 0) {
        restoreLastView('all')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入視圖失敗'
      console.error('Failed to load AllTasks views:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 取得專案的視圖
  async function loadProjectViews(projectId: string): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      const projectViews = await viewRepo.findByProject(projectId)
      views.value = projectViews
      
      // 如果沒有預設視圖，建立預設視圖
      if (projectViews.length === 0) {
        await createDefaultProjectViews(projectId)
      }
      
      // 恢復上次選中的視圖或設定預設視圖
      if (projectViews.length > 0) {
        restoreLastView(projectId)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入專案視圖失敗'
      console.error('Failed to load project views:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 建立 AllTasks 預設視圖
  async function createDefaultAllTasksView(): Promise<void> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return

    const defaultView: View = {
      viewId: nanoid(),
      projectId: 'all',
      name: '所有任務',
      type: VT.LIST,
      isDeletable: false,
      isPersonal: false,
      creatorId: userStore.currentUserId,
      config: {
        ...viewRepo.getDefaultConfig(VT.LIST, true), // isAllTasks = true
        sorts: [
          { fieldId: 'createdAt', direction: 'desc' }
        ],
        visibleFields: [
          'title',
          'statusId',
          'assigneeId',
          'priorityId',
          'endDateTime'
        ]
      },
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      await viewRepo.create(defaultView)
      views.value.push(defaultView)
      currentViewId.value = defaultView.viewId
    } catch (err) {
      console.error('Failed to create default AllTasks view:', err)
    }
  }

  // 建立專案預設視圖
  async function createDefaultProjectViews(projectId: string): Promise<void> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return

    const defaultViews: View[] = [
      // Dashboard View
      {
        viewId: nanoid(),
        projectId,
        name: '儀表板',
        type: VT.DASHBOARD,
        isDeletable: false,
        isPersonal: false,
        creatorId: userStore.currentUserId,
        config: viewRepo.getDefaultConfig(VT.DASHBOARD),
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // List View
      {
        viewId: nanoid(),
        projectId,
        name: '列表',
        type: VT.LIST,
        isDeletable: false,
        isPersonal: false,
        creatorId: userStore.currentUserId,
        config: {
          ...viewRepo.getDefaultConfig(VT.LIST),
          sorts: [
            { fieldId: 'order', direction: 'asc' },
            { fieldId: 'createdAt', direction: 'desc' }
          ]
        },
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    try {
      await viewRepo.createMany(defaultViews)
      views.value.push(...defaultViews)
      
      // 設定 Dashboard 為預設視圖
      currentViewId.value = defaultViews[0]!.viewId
    } catch (err) {
      console.error('Failed to create default project views:', err)
    }
  }

  // 切換視圖
  function switchView(viewId: string): void {
    const view = views.value.find(v => v.viewId === viewId)
    if (view) {
      currentViewId.value = viewId
      // 記住當前選中的視圖
      setLastViewId(view.projectId, viewId)
    }
  }

  // 清理當前專案狀態（用於專案切換）
  function clearCurrentProject(): void {
    views.value = []
    currentViewId.value = null
    error.value = null
  }

  // 建立新視圖
  async function createView(
    projectId: string,
    name: string,
    type: ViewType,
    config?: Partial<ViewConfig>
  ): Promise<View | null> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return null

    isLoading.value = true
    error.value = null

    try {
      // 計算新視圖的 order（最大 order + 1）
      const maxOrder = views.value.reduce((max, view) => Math.max(max, view.order || 0), 0)

      const newView: View = {
        viewId: nanoid(),
        projectId,
        name,
        type,
        isDeletable: true,
        isPersonal: true, // 用戶建立的視圖預設為個人視圖
        creatorId: userStore.currentUserId,
        config: {
          ...viewRepo.getDefaultConfig(type),
          ...config
        },
        order: maxOrder + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await viewRepo.create(newView)
      views.value.push(newView)
      
      return newView
    } catch (err) {
      error.value = err instanceof Error ? err.message : '建立視圖失敗'
      console.error('Failed to create view:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 更新視圖配置
  async function updateViewConfig(viewId: string, config: Partial<ViewConfig>): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await viewRepo.updateConfig(viewId, config)
      
      // 更新本地狀態
      const view = views.value.find(v => v.viewId === viewId)
      if (view) {
        view.config = { ...view.config, ...config }
        view.updatedAt = new Date()
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新視圖配置失敗'
      console.error('Failed to update view config:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 更新視圖
  async function updateView(viewId: string, updates: Partial<View>): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await viewRepo.update(viewId, updates)
      
      // 更新本地狀態
      const view = views.value.find(v => v.viewId === viewId)
      if (view) {
        Object.assign(view, updates)
        view.updatedAt = new Date()
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新視圖失敗'
      console.error('Failed to update view:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 根據 ID 取得視圖
  function getViewById(viewId: string): View | null {
    return views.value.find(v => v.viewId === viewId) || null
  }

  // 刪除視圖
  async function deleteView(viewId: string): Promise<boolean> {
    const view = views.value.find(v => v.viewId === viewId)
    if (!view || !view.isDeletable) {
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await viewRepo.delete(viewId)
      
      // 更新本地狀態
      views.value = views.value.filter(v => v.viewId !== viewId)
      
      // 如果刪除的是當前視圖，切換到第一個可用視圖
      if (currentViewId.value === viewId && views.value.length > 0) {
        currentViewId.value = views.value[0]!.viewId
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '刪除視圖失敗'
      console.error('Failed to delete view:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 複製視圖
  async function duplicateView(viewId: string, newName: string): Promise<View | null> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return null

    const sourceView = views.value.find(v => v.viewId === viewId)
    if (!sourceView) return null

    try {
      const duplicatedViewId = await viewRepo.duplicate(viewId, newName, userStore.currentUserId)
      
      // 重新載入視圖以取得完整資料
      if (sourceView.projectId === 'all') {
        await loadAllTasksViews()
      } else {
        await loadProjectViews(sourceView.projectId)
      }
      
      return views.value.find(v => v.viewId === duplicatedViewId) || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '複製視圖失敗'
      console.error('Failed to duplicate view:', err)
      return null
    }
  }

  // 取得視圖按類型分組
  const viewsByType = computed(() => {
    const grouped: Record<ViewType, View[]> = {
      list: [],
      table: [],
      board: [],
      gantt: [],
      dashboard: []
    }
    
    views.value.forEach(view => {
      grouped[view.type].push(view)
    })
    
    return grouped
  })

  // 取得可刪除的視圖
  const deletableViews = computed(() => {
    return views.value.filter(v => v.isDeletable)
  })

  // 視圖記憶功能
  const VIEW_MEMORY_KEY = 'viewMemory'

  function setLastViewId(projectId: string, viewId: string): void {
    const memory = JSON.parse(localStorage.getItem(VIEW_MEMORY_KEY) || '{}')
    memory[projectId] = viewId
    localStorage.setItem(VIEW_MEMORY_KEY, JSON.stringify(memory))
  }

  function getLastViewId(projectId: string): string | null {
    const memory = JSON.parse(localStorage.getItem(VIEW_MEMORY_KEY) || '{}')
    return memory[projectId] || null
  }

  function restoreLastView(projectId: string): void {
    const lastViewId = getLastViewId(projectId)
    
    if (lastViewId && views.value.find(v => v.viewId === lastViewId)) {
      currentViewId.value = lastViewId
    } else if (views.value.length > 0) {
      // 使用預設邏輯：Dashboard 優先，否則第一個
      const dashboardView = views.value.find(v => v.type === VT.DASHBOARD)
      currentViewId.value = dashboardView?.viewId || views.value[0]?.viewId || null
    }
  }

  // 視圖排序功能
  async function reorderViews(reorderData: Array<{ viewId: string; order: number }>): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // 批量更新視圖順序
      for (const { viewId, order } of reorderData) {
        await viewRepo.update(viewId, { order, updatedAt: new Date() })
        
        // 更新本地狀態
        const view = views.value.find(v => v.viewId === viewId)
        if (view) {
          view.order = order
          view.updatedAt = new Date()
        }
      }

      // 重新排序本地視圖
      views.value.sort((a, b) => (a.order || 0) - (b.order || 0))
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重新排序視圖失敗'
      console.error('Failed to reorder views:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 重置狀態
  function reset(): void {
    views.value = []
    currentViewId.value = null
    error.value = null
  }

  return {
    // 狀態
    views,
    currentViewId,
    isLoading,
    error,
    
    // 計算屬性
    currentView,
    sortedViews,
    viewsByType,
    deletableViews,
    
    // 動作
    loadAllTasksViews,
    loadProjectViews,
    switchView,
    createView,
    updateView,
    updateViewConfig,
    deleteView,
    duplicateView,
    getViewById,
    reorderViews,
    setLastViewId,
    getLastViewId,
    restoreLastView,
    clearCurrentProject,
    reset
  }
})