import { defineRouter } from '#q-app/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import routes from './routes'
import { useUserStore } from '@/stores/user'
import { getProjectRepository } from '@/services/repositories'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // 路由守衛
  Router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore()
    const projectRepo = getProjectRepository()

    // 檢查是否需要用戶驗證
    if (to.meta?.requiresAuth && !userStore.isLoggedIn) {
      console.warn('Route requires authentication, but user not logged in')
      // 在模擬用戶系統中，應該不會發生這種情況
      // 但如果發生，重定向到首頁
      next({ name: 'AllTasks' })
      return
    }

    // 檢查專案存取權限
    if (to.meta?.requiresProjectAccess && to.params.projectId) {
      const projectId = to.params.projectId as string
      try {
        const isMember = await projectRepo.isMember(projectId, userStore.currentUserId)
        if (!isMember && !userStore.isAdmin) {
          console.warn(`User ${userStore.currentUserId} has no access to project ${projectId}`)
          next({ name: 'AllTasks' })
          return
        }
      } catch (error) {
        console.error('Error checking project access:', error)
        next({ name: 'AllTasks' })
        return
      }
    }

    // 檢查專案擁有者權限
    if (to.meta?.requiresProjectOwner && to.params.projectId) {
      const projectId = to.params.projectId as string
      try {
        const isOwner = await projectRepo.isOwner(projectId, userStore.currentUserId)
        if (!isOwner && !userStore.isAdmin) {
          console.warn(`User ${userStore.currentUserId} is not owner of project ${projectId}`)
          // 重定向到專案詳情頁面
          next({ name: 'ProjectView', params: { projectId } })
          return
        }
      } catch (error) {
        console.error('Error checking project owner:', error)
        next({ name: 'AllTasks' })
        return
      }
    }

    next()
  })

  return Router
})
