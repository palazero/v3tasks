import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/projects/all'
      },
      {
        path: 'projects/all',
        name: 'AllTasks',
        component: () => import('pages/ProjectView.vue'),
        props: { projectId: 'all' },
        meta: {
          title: '所有任務',
          requiresAuth: true
        }
      },
      {
        path: 'projects/:projectId',
        name: 'ProjectView',
        component: () => import('pages/ProjectView.vue'),
        props: true,
        meta: {
          title: '專案詳情',
          requiresAuth: true,
          requiresProjectAccess: true
        }
      },
      {
        path: 'projects/:projectId/settings',
        name: 'ProjectSettings',
        component: () => import('pages/ProjectSettingsView.vue'),
        props: true,
        meta: {
          title: '專案設定',
          requiresAuth: true,
          requiresProjectOwner: true
        }
      },
      {
        path: 'api-test',
        name: 'ApiTest',
        component: () => import('pages/ApiTestView.vue'),
        meta: {
          title: 'API 測試',
          requiresAuth: false
        }
      },
      {
        path: 'env-test',
        name: 'EnvTest',
        component: () => import('pages/EnvTestView.vue'),
        meta: {
          title: '環境變數檢查',
          requiresAuth: false
        }
      },
      {
        path: 'db-test',
        name: 'DbTest',
        component: () => import('pages/DatabaseTestView.vue'),
        meta: {
          title: '資料庫測試',
          requiresAuth: false
        }
      },
      // 重定向舊的 URL 格式
      {
        path: 'project/:projectId',
        redirect: to => ({
          name: 'ProjectView',
          params: { projectId: to.params.projectId }
        })
      },
      {
        path: 'project/:projectId/settings',
        redirect: to => ({
          name: 'ProjectSettings',
          params: { projectId: to.params.projectId }
        })
      }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  }
]

export default routes
