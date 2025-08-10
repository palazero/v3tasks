<template>
  <q-page class="project-settings-page">
    <!-- 標題列 -->
    <div class="settings-header q-pa-xs bg-white">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-md">
          <q-btn
            flat
            round
            dense
            icon="arrow_back"
            @click="goBack"
          />
          <div>
            <h4 class="text-h4 q-my-none">專案設定</h4>
            <div class="text-caption text-grey-6" v-if="project">
              {{ project.name }}
            </div>
          </div>
        </div>

        <!-- 儲存按鈕 -->
        <q-btn
          v-if="hasUnsavedChanges"
          color="primary"
          icon="save"
          label="儲存變更"
          @click="saveAllChanges"
          :loading="isSaving"
        />
      </div>
    </div>

    <q-separator />

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="2em" />
      <div class="q-mt-md">載入專案資料中...</div>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="text-center q-pa-xl">
      <q-icon name="error" size="3em" color="negative" />
      <div class="q-mt-md text-negative">{{ error }}</div>
      <q-btn
        flat
        color="primary"
        label="重新載入"
        @click="loadProjectData"
        class="q-mt-md"
      />
    </div>

    <!-- 設定內容 -->
    <div v-else class="settings-content">
      <!-- 側邊導航 -->
      <div class="settings-sidebar bg-grey-1">
        <q-list class="settings-nav">
          <q-item
            v-for="section in settingSections"
            :key="section.key"
            clickable
            :active="activeSection === section.key"
            @click="activeSection = section.key"
            class="nav-item"
          >
            <q-item-section avatar>
              <q-icon :name="section.icon" :color="activeSection === section.key ? 'primary' : 'grey-6'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ section.title }}</q-item-label>
              <q-item-label caption>{{ section.description }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- 主要內容區 -->
      <div class="settings-main">
        <!-- 基本資訊設定 -->
        <div v-if="activeSection === 'general'" class="settings-section">
          <ProjectGeneralSettings
            v-model:project="project"
            @change="markAsChanged"
          />
        </div>

        <!-- 成員管理 -->
        <div v-else-if="activeSection === 'members'" class="settings-section">
          <ProjectMembersSettings
            v-model:project="project"
            @change="markAsChanged"
          />
        </div>

        <!-- 自訂欄位 -->
        <div v-else-if="activeSection === 'fields'" class="settings-section">
          <ProjectCustomFieldsSettings
            :project-id="projectId"
            @change="markAsChanged"
          />
        </div>

        <!-- 視圖設定 -->
        <div v-else-if="activeSection === 'views'" class="settings-section">
          <ProjectViewsSettings
            :project-id="projectId"
            @change="markAsChanged"
          />
        </div>

        <!-- 權限設定 -->
        <div v-else-if="activeSection === 'permissions'" class="settings-section">
          <ProjectPermissionsSettings
            v-model:project="project"
            @change="markAsChanged"
          />
        </div>

        <!-- 危險操作 -->
        <div v-else-if="activeSection === 'danger'" class="settings-section">
          <ProjectDangerSettings
            :project="project!"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { Project } from '@/types'
import { getProjectRepository } from '@/services/repositories'
import { usePermission } from '@/composables/usePermission'
import { useCurrentUser } from '@/composables/useCurrentUser'

// 動態導入設定元件
const ProjectGeneralSettings = defineAsyncComponent(() => import('@/components/settings/ProjectGeneralSettings.vue'))
const ProjectMembersSettings = defineAsyncComponent(() => import('@/components/settings/ProjectMembersSettings.vue'))
const ProjectCustomFieldsSettings = defineAsyncComponent(() => import('@/components/settings/ProjectCustomFieldsSettings.vue'))
const ProjectViewsSettings = defineAsyncComponent(() => import('@/components/settings/ProjectViewsSettings.vue'))
const ProjectPermissionsSettings = defineAsyncComponent(() => import('@/components/settings/ProjectPermissionsSettings.vue'))
const ProjectDangerSettings = defineAsyncComponent(() => import('@/components/settings/ProjectDangerSettings.vue'))

// Props
const props = defineProps<{
  projectId: string
}>()

const router = useRouter()
const $q = useQuasar()
const { isProjectOwner } = usePermission()
const { userId } = useCurrentUser()
const projectRepo = getProjectRepository()

// 狀態
const project = ref<Project | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)
const activeSection = ref('general')
const hasUnsavedChanges = ref(false)

// 設定區塊
const settingSections = computed(() => {
  const sections = [
    {
      key: 'general',
      title: '基本資訊',
      description: '專案名稱、描述等基本設定',
      icon: 'info'
    },
    {
      key: 'members',
      title: '成員管理',
      description: '管理專案成員和權限',
      icon: 'people'
    },
    {
      key: 'fields',
      title: '自訂欄位',
      description: '設定任務的自訂欄位',
      icon: 'dynamic_form'
    },
    {
      key: 'views',
      title: '視圖設定',
      description: '管理專案視圖配置',
      icon: 'view_module'
    }
  ]

  // 只有專案擁有者才能看到權限設定和危險操作
  if (project.value && isProjectOwner(project.value.ownerId)) {
    sections.push(
      {
        key: 'permissions',
        title: '權限設定',
        description: '設定成員權限和存取控制',
        icon: 'security'
      },
      {
        key: 'danger',
        title: '危險操作',
        description: '刪除專案等不可逆操作',
        icon: 'warning'
      }
    )
  }

  return sections
})

// 載入專案資料
async function loadProjectData(): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    const projectData = await projectRepo.findById(props.projectId)
    if (!projectData) {
      throw new Error('專案不存在')
    }

    // 檢查權限
    if (!projectData.memberIds.includes(userId.value) && projectData.ownerId !== userId.value) {
      throw new Error('您沒有權限查看此專案設定')
    }

    project.value = projectData
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入專案資料失敗'
    console.error('Failed to load project:', err)
  } finally {
    isLoading.value = false
  }
}

// 標記變更
function markAsChanged(): void {
  hasUnsavedChanges.value = true
}

// 儲存所有變更
async function saveAllChanges(): Promise<void> {
  if (!project.value || !hasUnsavedChanges.value) return

  isSaving.value = true
  try {
    await projectRepo.update(project.value)
    hasUnsavedChanges.value = false

    $q.notify({
      type: 'positive',
      message: '專案設定已儲存',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to save project settings:', error)
    $q.notify({
      type: 'negative',
      message: '儲存設定失敗',
      position: 'top'
    })
  } finally {
    isSaving.value = false
  }
}

// 返回專案頁面
function goBack(): void {
  if (hasUnsavedChanges.value) {
    $q.dialog({
      title: '未儲存的變更',
      message: '您有未儲存的變更，確定要離開嗎？',
      cancel: true,
      persistent: false
    }).onOk(() => {
      void router.push(`/projects/${props.projectId}`)
    })
  } else {
    void router.push(`/projects/${props.projectId}`)
  }
}

// 初始化
onMounted(() => {
  void loadProjectData()
})
</script>

<style scoped lang="scss">
.project-settings-page {
  background-color: #f5f5f5;
  min-height: 100vh;

  .settings-header {
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .settings-content {
    display: flex;
    min-height: calc(100vh - 80px);

    .settings-sidebar {
      width: 280px;
      border-right: 1px solid #e0e0e0;

      .settings-nav {
        padding: 16px 0;

        .nav-item {
          margin: 0 8px 4px;
          border-radius: 8px;

          &.q-item--active {
            background-color: rgba(25, 118, 210, 0.1);
            color: #1976d2;
          }

          &:hover:not(.q-item--active) {
            background-color: rgba(0, 0, 0, 0.04);
          }
        }
      }
    }

    .settings-main {
      flex: 1;
      background-color: white;

      .settings-section {
        padding: 24px;
        max-width: 800px;
        margin: 0 auto;
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .project-settings-page {
    .settings-content {
      flex-direction: column;

      .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;

        .settings-nav {
          display: flex;
          overflow-x: auto;
          padding: 8px 16px;

          .nav-item {
            min-width: 120px;
            margin: 0 4px;
          }
        }
      }

      .settings-main {
        .settings-section {
          padding: 16px;
        }
      }
    }
  }
}
</style>
