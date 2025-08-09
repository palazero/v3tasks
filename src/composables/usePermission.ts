/**
 * 權限檢查 Composable
 * 提供統一的權限驗證邏輯
 */

import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import type { PermissionAction, PermissionCheck } from '@/types'

export function usePermission() {
  const userStore = useUserStore()

  // 是否為管理員
  const isAdmin = computed(() => userStore.isAdmin)

  // 是否已登入
  const isLoggedIn = computed(() => userStore.isLoggedIn)

  // 當前用戶 ID
  const currentUserId = computed(() => userStore.currentUserId)

  /**
   * 檢查權限（非同步版本，會查詢資料庫）
   */
  async function checkPermission(
    action: PermissionAction,
    resourceId?: string
  ): Promise<PermissionCheck> {
    return await userStore.checkPermission(action, resourceId)
  }

  /**
   * 快速權限檢查（同步版本，用於 UI 顯示）
   */
  function hasPermission(action: PermissionAction): boolean {
    return userStore.hasPermission(action)
  }

  /**
   * 檢查是否可以編輯資源
   * @param ownerId 資源擁有者 ID
   */
  function canEdit(ownerId: string): boolean {
    return isAdmin.value || currentUserId.value === ownerId
  }

  /**
   * 檢查是否可以刪除資源
   * @param ownerId 資源擁有者 ID
   */
  function canDelete(ownerId: string): boolean {
    return isAdmin.value || currentUserId.value === ownerId
  }

  /**
   * 檢查是否可以查看資源
   * @param ownerId 資源擁有者 ID
   * @param memberIds 成員 ID 列表
   */
  function canView(ownerId: string, memberIds: string[] = []): boolean {
    if (isAdmin.value) return true
    if (currentUserId.value === ownerId) return true
    return memberIds.includes(currentUserId.value)
  }

  /**
   * 檢查是否為專案擁有者
   * @param ownerId 專案擁有者 ID
   */
  function isProjectOwner(ownerId: string): boolean {
    return currentUserId.value === ownerId
  }

  /**
   * 檢查是否為專案成員
   * @param ownerId 專案擁有者 ID
   * @param memberIds 成員 ID 列表
   */
  function isProjectMember(ownerId: string, memberIds: string[] = []): boolean {
    if (isAdmin.value) return true
    if (currentUserId.value === ownerId) return true
    return memberIds.includes(currentUserId.value)
  }

  /**
   * 檢查是否為資源建立者
   * @param creatorId 建立者 ID
   */
  function isCreator(creatorId: string): boolean {
    return currentUserId.value === creatorId
  }

  /**
   * 取得權限等級
   * @returns 0: 無權限, 1: 成員, 2: 擁有者, 3: 管理員
   */
  function getPermissionLevel(ownerId: string, memberIds: string[] = []): number {
    if (!isLoggedIn.value) return 0
    if (isAdmin.value) return 3
    if (currentUserId.value === ownerId) return 2
    if (memberIds.includes(currentUserId.value)) return 1
    return 0
  }

  /**
   * 權限守衛（用於路由或操作前檢查）
   */
  async function requirePermission(
    action: PermissionAction,
    resourceId?: string,
    errorMessage?: string
  ): Promise<void> {
    const result = await checkPermission(action, resourceId)
    if (!result.allowed) {
      throw new Error(errorMessage || result.reason || '權限不足')
    }
  }

  /**
   * 批次檢查權限
   */
  async function checkMultiplePermissions(
    checks: Array<{ action: PermissionAction; resourceId?: string }>
  ): Promise<Map<string, PermissionCheck>> {
    const results = new Map<string, PermissionCheck>()
    
    for (const check of checks) {
      const key = `${check.action}:${check.resourceId || 'global'}`
      const result = await checkPermission(check.action, check.resourceId)
      results.set(key, result)
    }
    
    return results
  }

  return {
    // 計算屬性
    isAdmin,
    isLoggedIn,
    currentUserId,
    
    // 方法
    checkPermission,
    hasPermission,
    canEdit,
    canDelete,
    canView,
    isProjectOwner,
    isProjectMember,
    isCreator,
    getPermissionLevel,
    requirePermission,
    checkMultiplePermissions
  }
}