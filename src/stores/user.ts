/**
 * 用戶狀態管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, PermissionAction, PermissionCheck } from '@/types'
import { getUserRepository, getProjectRepository } from '@/services/repositories'
import { getMockUsers, initMockData } from '@/services/mockData'

export const useUserStore = defineStore('user', () => {
  // 狀態
  const currentUser = ref<User | null>(null)
  const availableUsers = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Repository
  const userRepo = getUserRepository()
  const projectRepo = getProjectRepository()

  // 計算屬性
  const isLoggedIn = computed(() => currentUser.value !== null)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const currentUserId = computed(() => currentUser.value?.userId || '')
  const currentUserName = computed(() => currentUser.value?.name || '')
  const currentUserRole = computed(() => currentUser.value?.role || 'user')

  // 初始化用戶系統
  async function initializeUsers(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // 初始化模擬資料
      await initMockData()

      // 載入所有可用用戶
      const users = await userRepo.findAll()
      availableUsers.value = users

      // 預設選擇第一個用戶（管理員）
      if (users.length > 0 && !currentUser.value) {
        await switchUser(users[0]!.userId)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化用戶失敗'
      console.error('Failed to initialize users:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 切換用戶
  async function switchUser(userId: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const user = await userRepo.findById(userId)
      if (!user) {
        throw new Error('用戶不存在')
      }

      currentUser.value = user
      
      // 儲存到 localStorage 以便下次自動登入
      localStorage.setItem('currentUserId', userId)
      
      console.log(`Switched to user: ${user.name} (${user.role})`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '切換用戶失敗'
      console.error('Failed to switch user:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 從 localStorage 恢復用戶
  async function restoreUser(): Promise<void> {
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) {
      await switchUser(savedUserId)
    }
  }

  // 權限檢查
  async function checkPermission(
    action: PermissionAction,
    resourceId?: string
  ): Promise<PermissionCheck> {
    if (!currentUser.value) {
      return { allowed: false, reason: '未登入' }
    }

    // 管理員擁有所有權限
    if (isAdmin.value) {
      return { allowed: true }
    }

    // 根據不同的操作進行權限檢查 - 使用 if-else 提高可讀性
    if (action === 'createProject') {
      return { allowed: true } // 所有用戶都可以建立專案
    }

    if (action === 'editProject' || action === 'deleteProject' || action === 'manageMembers') {
      if (!resourceId) {
        return { allowed: false, reason: '缺少資源 ID' }
      }
      const isOwner = await projectRepo.isOwner(resourceId, currentUserId.value)
      return isOwner 
        ? { allowed: true } 
        : { allowed: false, reason: '只有專案擁有者可以執行此操作' }
    }

    if (action === 'createTask' || action === 'editTask' || action === 'assignTask') {
      if (!resourceId) {
        return { allowed: true } // 如果沒有指定專案，假設可以建立
      }
      const isMember = await projectRepo.isMember(resourceId, currentUserId.value)
      return isMember 
        ? { allowed: true } 
        : { allowed: false, reason: '只有專案成員可以執行此操作' }
    }

    if (action === 'deleteTask') {
      if (!resourceId) {
        return { allowed: false, reason: '缺少資源 ID' }
      }
      // 任務刪除需要是專案擁有者或任務建立者
      // 這裡簡化為專案成員都可以刪除
      const canDelete = await projectRepo.isMember(resourceId, currentUserId.value)
      return canDelete 
        ? { allowed: true } 
        : { allowed: false, reason: '沒有權限刪除此任務' }
    }

    if (action === 'createView' || action === 'editView' || action === 'deleteView') {
      // 視圖操作權限依據視圖類型和建立者
      return { allowed: true } // 簡化處理
    }

    if (action === 'createCustomField' || action === 'editCustomField' || action === 'deleteCustomField') {
      if (!resourceId) {
        return { allowed: false, reason: '缺少資源 ID' }
      }
      const isFieldOwner = await projectRepo.isOwner(resourceId, currentUserId.value)
      return isFieldOwner 
        ? { allowed: true } 
        : { allowed: false, reason: '只有專案擁有者可以管理自訂欄位' }
    }

    if (action === 'manageUsers' || action === 'viewAllProjects') {
      return {
        allowed: false,
        reason: '需要管理員權限'
      }
    }

    // 預設情況
    return { allowed: false, reason: '未知的操作' }
  }

  // 快速權限檢查（同步版本，用於 UI 顯示）
  function hasPermission(action: PermissionAction): boolean {
    if (!currentUser.value) return false
    if (isAdmin.value) return true

    // 簡單權限可以直接判斷
    switch (action) {
      case 'createProject':
      case 'createTask':
      case 'createView':
        return true
      case 'manageUsers':
      case 'viewAllProjects':
        return false
      default:
        return false
    }
  }

  // 取得用戶顯示名稱
  function getUserDisplayName(userId?: string): string {
    if (!userId) return '未指派'
    const user = availableUsers.value.find(u => u.userId === userId)
    return user?.name || '未知用戶'
  }

  // 取得用戶頭像
  function getUserAvatar(userId?: string): string {
    if (!userId) return ''
    const user = availableUsers.value.find(u => u.userId === userId)
    return user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
  }

  // 登出（切換到訪客模式）
  function logout(): void {
    currentUser.value = null
    localStorage.removeItem('currentUserId')
  }

  return {
    // 狀態
    currentUser,
    availableUsers,
    isLoading,
    error,
    
    // 計算屬性
    isLoggedIn,
    isAdmin,
    currentUserId,
    currentUserName,
    currentUserRole,
    
    // 方法
    initializeUsers,
    switchUser,
    restoreUser,
    checkPermission,
    hasPermission,
    getUserDisplayName,
    getUserAvatar,
    logout
  }
})