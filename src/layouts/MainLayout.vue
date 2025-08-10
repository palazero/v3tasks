<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="flex items-center q-gutter-sm">
          <q-icon name="task_alt" size="28px" />
          <span>任務管理系統</span>
        </q-toolbar-title>

        <!-- 右側用戶切換器 -->
        <UserSwitcher />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="280"
      class="bg-grey-1"
    >
      <div class="full-height">
        <!-- All Tasks 特殊項目 -->
        <q-list padding>
          <q-item-label header class="text-weight-bold text-primary">
            <q-icon name="dashboard" class="q-mr-sm" />
            總覽
          </q-item-label>

          <q-item
            clickable
            v-ripple
            :active="isAllTasksActive"
            active-class="bg-primary text-white"
            @click="navigateToAllTasks"
          >
            <q-item-section avatar>
              <q-icon name="list_alt" />
            </q-item-section>
            <q-item-section>
              <q-item-label>所有任務</q-item-label>
              <q-item-label caption>查看全部任務</q-item-label>
            </q-item-section>
            <q-item-section side v-if="totalTasksCount > 0">
              <q-badge color="grey" :label="totalTasksCount" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator />

        <!-- 專案列表 -->
        <q-list padding>
          <q-item-label header class="flex items-center justify-between">
            <span class="text-weight-bold text-primary">
              <q-icon name="folder" class="q-mr-sm" />
              我的專案
            </span>
            <q-btn
              dense
              flat
              round
              icon="add"
              size="sm"
              color="primary"
              @click="showCreateProject"
              :disable="!userStore.isLoggedIn"
            >
              <q-tooltip>建立新專案</q-tooltip>
            </q-btn>
          </q-item-label>

          <!-- 專案載入中 -->
          <div v-if="isProjectsLoading" class="q-pa-md text-center">
            <q-spinner color="primary" size="2em" />
            <div class="text-caption q-mt-sm">載入專案中...</div>
          </div>

          <!-- 專案列表 -->
          <template v-else>
            <q-item
              v-for="project in userProjects"
              :key="project.projectId"
              clickable
              v-ripple
              :active="currentProjectId === project.projectId"
              active-class="bg-primary text-white"
              @click="navigateToProject(project.projectId)"
            >
              <q-item-section avatar>
                <q-icon :name="getProjectIcon(project)" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ project.name }}</q-item-label>
                <q-item-label caption class="ellipsis">
                  {{ project.description || '無描述' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="column items-end">
                  <q-badge
                    v-if="isProjectOwner(project)"
                    color="orange"
                    label="Owner"
                    dense
                    class="q-mb-xs"
                  />
                  <q-badge
                    color="grey"
                    :label="getProjectTaskCount(project.projectId)"
                    dense
                  />
                </div>
              </q-item-section>
            </q-item>

            <!-- 無專案提示 -->
            <div v-if="userProjects.length === 0" class="q-pa-md text-center text-grey-6">
              <q-icon name="folder_off" size="2em" class="q-mb-sm" />
              <div>尚無專案</div>
              <div class="text-caption">點擊上方 + 建立第一個專案</div>
            </div>
          </template>
        </q-list>

        <!-- 底部用戶資訊 -->
        <div class="absolute-bottom q-pa-sm bg-grey-2">
          <div v-if="userStore.currentUser" class="text-center">
            <div class="text-caption text-grey-7">
              目前用戶: {{ userStore.currentUser.name }}
            </div>
            <div class="text-caption text-grey-5">
              {{ userStore.isAdmin ? '管理員' : '一般用戶' }}
            </div>
          </div>
          <div v-else class="text-center text-caption text-grey-7">
            請選擇用戶
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- 建立專案對話框 -->
    <q-dialog v-model="showCreateProjectDialog">
      <q-card style="width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">建立新專案</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit="handleCreateProject">
          <q-card-section>
            <q-input
              v-model="newProject.name"
              label="專案名稱"
              filled
              autofocus
              :rules="[val => !!val || '請輸入專案名稱']"
              class="q-mb-md"
            />

            <q-input
              v-model="newProject.description"
              label="專案描述"
              filled
              type="textarea"
              rows="3"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="取消" v-close-popup />
            <q-btn
              type="submit"
              color="primary"
              label="建立"
              :loading="isCreating"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { nanoid } from 'nanoid'

import UserSwitcher from '@/components/layout/UserSwitcher.vue'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/composables/usePermission'
import { getProjectRepository, getTaskRepository } from '@/services/repositories'
import type { Project } from '@/types'
import { PermissionAction } from '@/types'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { hasPermission, isProjectOwner: checkIsProjectOwner } = usePermission()

// Repository
const projectRepo = getProjectRepository()
const taskRepo = getTaskRepository()

// 狀態
const leftDrawerOpen = ref(false)
const userProjects = ref<Project[]>([])
const isProjectsLoading = ref(false)
const totalTasksCount = ref(0)

// 建立專案對話框
const showCreateProjectDialog = ref(false)
const isCreating = ref(false)
const newProject = ref({
  name: '',
  description: ''
})

// 計算屬性
const currentProjectId = computed(() => {
  const projectId = route.params.projectId as string
  return projectId || null
})

const isAllTasksActive = computed(() => {
  return route.name === 'AllTasks' || route.path === '/'
})

// 載入用戶專案
async function loadUserProjects(): Promise<void> {
  if (!userStore.currentUser) return

  isProjectsLoading.value = true
  try {
    const projects = await projectRepo.findByMember(userStore.currentUserId)
    userProjects.value = projects.filter(p => !p.isArchived)

    // 更新任務總數
    await updateTasksCount()
  } catch (error) {
    console.error('Failed to load projects:', error)
    $q.notify({
      type: 'negative',
      message: '載入專案失敗',
      position: 'top'
    })
  } finally {
    isProjectsLoading.value = false
  }
}

// 更新任務總數
async function updateTasksCount(): Promise<void> {
  if (!userStore.currentUser) return

  try {
    // 計算用戶可存取的所有任務
    let total = 0
    for (const project of userProjects.value) {
      const tasks = await taskRepo.findByProject(project.projectId)
      total += tasks.length
    }
    totalTasksCount.value = total
  } catch (error) {
    console.error('Failed to update tasks count:', error)
  }
}

// 取得專案圖示
function getProjectIcon(project: Project): string {
  if (checkIsProjectOwner(project.ownerId)) {
    return 'folder_special'
  }
  return 'folder'
}

// 檢查是否為專案擁有者
function isProjectOwner(project: Project): boolean {
  return checkIsProjectOwner(project.ownerId)
}

// 取得專案任務數量
function getProjectTaskCount(_projectId: string): string {
  // 這裡可以實作快取機制
  // 暫時返回佔位符
  return '...'
}

// 導航
function navigateToAllTasks(): void {
  void router.push({ name: 'AllTasks' })
}

function navigateToProject(projectId: string): void {
  void router.push({ name: 'ProjectView', params: { projectId } })
}

// 顯示建立專案對話框
function showCreateProject(): void {
  if (!hasPermission(PermissionAction.CREATE_PROJECT)) {
    $q.notify({
      type: 'negative',
      message: '無權限建立專案',
      position: 'top'
    })
    return
  }

  newProject.value = { name: '', description: '' }
  showCreateProjectDialog.value = true
}

// 處理建立專案
async function handleCreateProject(): Promise<void> {
  if (!newProject.value.name.trim()) {
    return
  }

  isCreating.value = true
  try {
    const project: Project = {
      projectId: nanoid(8),
      name: newProject.value.name.trim(),
      description: newProject.value.description.trim(),
      ownerId: userStore.currentUserId,
      memberIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      settings: {
        allowMemberInvite: true
      }
    }

    await projectRepo.create(project)
    await loadUserProjects()

    showCreateProjectDialog.value = false

    $q.notify({
      type: 'positive',
      message: `專案「${project.name}」建立成功`,
      position: 'top'
    })

    // 導航到新專案
    navigateToProject(project.projectId)

  } catch (error) {
    console.error('Failed to create project:', error)
    $q.notify({
      type: 'negative',
      message: '建立專案失敗',
      caption: error instanceof Error ? error.message : '未知錯誤',
      position: 'top'
    })
  } finally {
    isCreating.value = false
  }
}

// 側邊欄切換
function toggleLeftDrawer(): void {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// 監聽用戶變更
userStore.$subscribe(() => {
  void loadUserProjects()
})

// 初始化
onMounted(async () => {
  // 初始化用戶系統
  await userStore.initializeUsers()

  // 載入專案
  await loadUserProjects()
})
</script>
