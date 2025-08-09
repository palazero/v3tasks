/**
 * 當前用戶 Composable
 * 提供便捷的用戶相關功能
 */

import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import type { User } from '@/types'

export function useCurrentUser() {
  const userStore = useUserStore()

  // 當前用戶
  const currentUser = computed(() => userStore.currentUser)

  // 用戶基本資訊
  const userId = computed(() => userStore.currentUserId)
  const userName = computed(() => userStore.currentUserName)
  const userRole = computed(() => userStore.currentUserRole)
  const userEmail = computed(() => userStore.currentUser?.email || '')
  const userAvatar = computed(() => userStore.currentUser?.avatar || '')

  // 用戶狀態
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const isAdmin = computed(() => userStore.isAdmin)
  const isLoading = computed(() => userStore.isLoading)
  const error = computed(() => userStore.error)

  // 所有可用用戶
  const availableUsers = computed(() => userStore.availableUsers)

  /**
   * 取得用戶顯示名稱
   */
  function getUserDisplayName(userId?: string): string {
    return userStore.getUserDisplayName(userId)
  }

  /**
   * 取得用戶頭像
   */
  function getUserAvatar(userId?: string): string {
    return userStore.getUserAvatar(userId)
  }

  /**
   * 取得用戶物件
   */
  function getUser(userId: string): User | undefined {
    return availableUsers.value.find(user => user.userId === userId)
  }

  /**
   * 切換用戶
   */
  async function switchUser(userId: string): Promise<void> {
    await userStore.switchUser(userId)
  }

  /**
   * 登出
   */
  function logout(): void {
    userStore.logout()
  }

  /**
   * 檢查是否為當前用戶
   */
  function isCurrentUser(userId: string): boolean {
    return userId === userStore.currentUserId
  }

  /**
   * 檢查用戶是否為管理員
   */
  function isUserAdmin(userId: string): boolean {
    const user = getUser(userId)
    return user?.role === 'admin'
  }

  /**
   * 格式化用戶資訊顯示
   */
  function formatUserInfo(userId?: string, options: {
    showEmail?: boolean
    showRole?: boolean
    showAvatar?: boolean
  } = {}): {
    name: string
    email?: string
    role?: string
    avatar?: string
    isAdmin: boolean
  } {
    const user = userId ? getUser(userId) : currentUser.value
    
    if (!user) {
      return {
        name: '未知用戶',
        isAdmin: false
      }
    }

    const result: any = {
      name: user.name,
      isAdmin: user.role === 'admin'
    }

    if (options.showEmail) {
      result.email = user.email
    }

    if (options.showRole) {
      result.role = user.role === 'admin' ? '管理員' : '一般用戶'
    }

    if (options.showAvatar) {
      result.avatar = user.avatar || getUserAvatar(user.userId)
    }

    return result
  }

  /**
   * 取得用戶選項列表（用於下拉選單等）
   */
  function getUserOptions(excludeIds: string[] = []): Array<{
    label: string
    value: string
    avatar?: string
    isAdmin: boolean
  }> {
    return availableUsers.value
      .filter(user => !excludeIds.includes(user.userId))
      .map(user => ({
        label: user.name,
        value: user.userId,
        avatar: user.avatar,
        isAdmin: user.role === 'admin'
      }))
  }

  /**
   * 搜尋用戶
   */
  function searchUsers(keyword: string): User[] {
    if (!keyword.trim()) {
      return availableUsers.value
    }

    const lowerKeyword = keyword.toLowerCase()
    return availableUsers.value.filter(user =>
      user.name.toLowerCase().includes(lowerKeyword) ||
      user.email.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 取得用戶統計
   */
  const userStats = computed(() => {
    const users = availableUsers.value
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length
    }
  })

  /**
   * 檢查用戶是否在線（模擬功能）
   */
  function isUserOnline(userId: string): boolean {
    // 在真實應用中，這會連接到即時系統
    // 這裡只是模擬：當前用戶和管理員總是在線
    return userId === userStore.currentUserId || isUserAdmin(userId)
  }

  /**
   * 取得用戶狀態指示器
   */
  function getUserStatusIndicator(userId: string): {
    color: string
    text: string
    icon: string
  } {
    if (isCurrentUser(userId)) {
      return { color: 'green', text: '目前用戶', icon: 'person' }
    }
    
    if (isUserOnline(userId)) {
      return { color: 'green', text: '在線', icon: 'circle' }
    }
    
    return { color: 'grey', text: '離線', icon: 'circle' }
  }

  return {
    // 狀態
    currentUser,
    userId,
    userName,
    userRole,
    userEmail,
    userAvatar,
    isLoggedIn,
    isAdmin,
    isLoading,
    error,
    availableUsers,
    userStats,

    // 方法
    getUserDisplayName,
    getUserAvatar,
    getUser,
    switchUser,
    logout,
    isCurrentUser,
    isUserAdmin,
    formatUserInfo,
    getUserOptions,
    searchUsers,
    isUserOnline,
    getUserStatusIndicator
  }
}