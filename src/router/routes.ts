import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'AllTasks',
        component: () => import('pages/AllTasksView.vue'),
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
