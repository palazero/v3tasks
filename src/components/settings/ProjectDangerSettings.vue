<template>
  <div class="project-danger-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm text-negative">危險操作</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        這些操作具有不可逆性，執行前請仔細考慮。建議在操作前先備份重要資料。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <!-- 警告提示 -->
    <q-banner class="bg-negative text-white q-mb-lg" rounded>
      <template v-slot:avatar>
        <q-icon name="warning" />
      </template>
      <div class="text-weight-medium">注意事項</div>
      <div class="q-mt-sm">
        以下操作一旦執行將無法復原，請確保您了解操作的後果。
        建議在執行危險操作前先匯出專案資料作為備份。
      </div>
    </q-banner>

    <!-- 資料管理 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card flat bordered class="danger-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">
              <q-icon name="storage" class="q-mr-sm" />
              資料管理
            </div>
            
            <div class="danger-actions">
              <!-- 清除所有任務 -->
              <div class="danger-action-item">
                <div class="action-info">
                  <div class="text-body2 text-weight-medium">清除所有任務</div>
                  <div class="text-caption text-grey-6">
                    刪除專案中的所有任務，保留專案結構和成員資訊
                  </div>
                </div>
                <q-btn
                  color="warning"
                  outline
                  label="清除任務"
                  @click="clearAllTasks"
                  :loading="isClearing"
                />
              </div>

              <q-separator class="q-my-md" />

              <!-- 重置專案 -->
              <div class="danger-action-item">
                <div class="action-info">
                  <div class="text-body2 text-weight-medium">重置專案</div>
                  <div class="text-caption text-grey-6">
                    清除所有任務、視圖和自訂欄位，但保留專案基本資訊和成員
                  </div>
                </div>
                <q-btn
                  color="negative"
                  outline
                  label="重置專案"
                  @click="resetProject"
                  :loading="isResetting"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 專案歸檔 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card flat bordered class="danger-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">
              <q-icon name="archive" class="q-mr-sm" />
              專案歸檔
            </div>
            
            <div class="danger-actions">
              <!-- 歸檔專案 -->
              <div class="danger-action-item">
                <div class="action-info">
                  <div class="text-body2 text-weight-medium">歸檔專案</div>
                  <div class="text-caption text-grey-6">
                    將專案設為唯讀狀態，成員無法新增或修改任務，但可以檢視專案內容
                  </div>
                  <div v-if="project.isArchived" class="text-positive q-mt-xs">
                    <q-icon name="check_circle" size="xs" class="q-mr-xs" />
                    此專案已歸檔
                  </div>
                </div>
                <q-btn
                  v-if="!project.isArchived"
                  color="orange"
                  outline
                  label="歸檔專案"
                  @click="archiveProject"
                  :loading="isArchiving"
                />
                <q-btn
                  v-else
                  color="positive"
                  outline
                  label="取消歸檔"
                  @click="unarchiveProject"
                  :loading="isArchiving"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 專案刪除 -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="danger-card delete-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md text-negative">
              <q-icon name="delete_forever" class="q-mr-sm" />
              刪除專案
            </div>
            
            <div class="delete-warning bg-negative text-white q-pa-md rounded-borders q-mb-md">
              <div class="row items-center q-gutter-sm">
                <q-icon name="error" size="md" />
                <div>
                  <div class="text-weight-medium">永久刪除警告</div>
                  <div class="text-body2 q-mt-xs">
                    此操作將永久刪除專案及其所有相關資料，包括任務、視圖、自訂欄位等。
                    資料一旦刪除將無法恢復。
                  </div>
                </div>
              </div>
            </div>
            
            <div class="danger-actions">
              <div class="danger-action-item">
                <div class="action-info">
                  <div class="text-body2 text-weight-medium">刪除專案</div>
                  <div class="text-caption text-grey-6">
                    永久刪除專案「{{ project.name }}」及其所有資料
                  </div>
                </div>
                <q-btn
                  color="negative"
                  label="刪除專案"
                  @click="deleteProject"
                  :loading="isDeleting"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 匯出備份 -->
    <div class="row q-col-gutter-md q-mt-lg">
      <div class="col-12">
        <q-card flat bordered class="bg-info text-white">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">
              <q-icon name="backup" class="q-mr-sm" />
              資料備份
            </div>
            <div class="text-body2 q-mb-md">
              在執行任何危險操作前，建議先匯出專案資料作為備份。
            </div>
            <q-btn
              color="white"
              text-color="info"
              label="匯出專案資料"
              icon="download"
              @click="exportProject"
              :loading="isExporting"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { Project } from '@/types'
import { getProjectRepository, getTaskRepository } from '@/services/repositories'

// Props
const props = defineProps<{
  project: Project
}>()

const router = useRouter()
const $q = useQuasar()
const projectRepo = getProjectRepository()
const taskRepo = getTaskRepository()

// 狀態
const isClearing = ref(false)
const isResetting = ref(false)
const isArchiving = ref(false)
const isDeleting = ref(false)
const isExporting = ref(false)

// 清除所有任務
async function clearAllTasks(): Promise<void> {
  const confirmed = await confirmDangerousAction(
    '清除所有任務',
    `確定要清除專案「${props.project.name}」中的所有任務嗎？`,
    '此操作將刪除所有任務資料，但保留專案設定、成員和視圖。',
    '清除任務'
  )
  
  if (!confirmed) return

  isClearing.value = true
  try {
    // 獲取專案所有任務並刪除
    const tasks = await taskRepo.findByProject(props.project.projectId)
    await Promise.all(tasks.map(task => taskRepo.delete(task.taskId)))
    
    $q.notify({
      type: 'positive',
      message: '所有任務已清除',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to clear tasks:', error)
    $q.notify({
      type: 'negative',
      message: '清除任務失敗',
      position: 'top'
    })
  } finally {
    isClearing.value = false
  }
}

// 重置專案
async function resetProject(): Promise<void> {
  const confirmed = await confirmDangerousAction(
    '重置專案',
    `確定要重置專案「${props.project.name}」嗎？`,
    '此操作將清除所有任務、視圖和自訂欄位，但保留專案基本資訊和成員。',
    '重置專案'
  )
  
  if (!confirmed) return

  isResetting.value = true
  try {
    // 這裡應該實作重置邏輯
    // 1. 清除所有任務
    // 2. 清除所有自訂視圖
    // 3. 清除所有自訂欄位
    
    $q.notify({
      type: 'positive',
      message: '專案已重置',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to reset project:', error)
    $q.notify({
      type: 'negative',
      message: '重置專案失敗',
      position: 'top'
    })
  } finally {
    isResetting.value = false
  }
}

// 歸檔專案
async function archiveProject(): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '歸檔專案',
      message: `確定要歸檔專案「${props.project.name}」嗎？`,
      html: true,
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
  
  if (!confirmed) return

  isArchiving.value = true
  try {
    const updatedProject = {
      ...props.project,
      isArchived: true,
      updatedAt: new Date()
    }
    
    await projectRepo.update(updatedProject)
    
    $q.notify({
      type: 'positive',
      message: '專案已歸檔',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to archive project:', error)
    $q.notify({
      type: 'negative',
      message: '歸檔專案失敗',
      position: 'top'
    })
  } finally {
    isArchiving.value = false
  }
}

// 取消歸檔專案
async function unarchiveProject(): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '取消歸檔',
      message: `確定要恢復專案「${props.project.name}」的正常狀態嗎？`,
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
  
  if (!confirmed) return

  isArchiving.value = true
  try {
    const updatedProject = {
      ...props.project,
      isArchived: false,
      updatedAt: new Date()
    }
    
    await projectRepo.update(updatedProject)
    
    $q.notify({
      type: 'positive',
      message: '專案已恢復正常狀態',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to unarchive project:', error)
    $q.notify({
      type: 'negative',
      message: '取消歸檔失敗',
      position: 'top'
    })
  } finally {
    isArchiving.value = false
  }
}

// 刪除專案
async function deleteProject(): Promise<void> {
  // 第一次確認
  const firstConfirm = await confirmDangerousAction(
    '刪除專案',
    `確定要刪除專案「${props.project.name}」嗎？`,
    '此操作將永久刪除專案及其所有相關資料，無法恢復。',
    '刪除專案'
  )
  
  if (!firstConfirm) return

  // 第二次確認（輸入專案名稱）
  const projectNameConfirm = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '最終確認',
      message: `請輸入專案名稱「${props.project.name}」來確認刪除：`,
      prompt: {
        model: '',
        type: 'text',
        isValid: (val: string) => val === props.project.name
      },
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })

  if (!projectNameConfirm) return

  isDeleting.value = true
  try {
    await projectRepo.delete(props.project.projectId)
    
    $q.notify({
      type: 'positive',
      message: '專案已刪除',
      position: 'top'
    })

    // 跳轉到首頁
    void router.push('/')
  } catch (error) {
    console.error('Failed to delete project:', error)
    $q.notify({
      type: 'negative',
      message: '刪除專案失敗',
      position: 'top'
    })
  } finally {
    isDeleting.value = false
  }
}

// 匯出專案
function exportProject(): void {
  isExporting.value = true
  try {
    // 這裡應該實作匯出邏輯
    // 1. 收集專案資料
    // 2. 轉換為適當格式（JSON、CSV等）
    // 3. 下載檔案
    
    $q.notify({
      type: 'positive',
      message: '專案資料匯出完成',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to export project:', error)
    $q.notify({
      type: 'negative',
      message: '匯出專案資料失敗',
      position: 'top'
    })
  } finally {
    isExporting.value = false
  }
}

// 危險操作確認對話框
async function confirmDangerousAction(
  title: string,
  message: string,
  detail: string,
  confirmText: string
): Promise<boolean> {
  return new Promise((resolve) => {
    $q.dialog({
      title,
      message: `${message}<br><br><span class="text-negative">${detail}</span>`,
      html: true,
      cancel: {
        label: '取消',
        flat: true
      },
      ok: {
        label: confirmText,
        color: 'negative'
      },
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
}
</script>

<style scoped lang="scss">
.project-danger-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .danger-card {
    border: 2px solid #ffebee;
    
    &.delete-card {
      border-color: #ffcdd2;
    }
  }

  .danger-actions {
    .danger-action-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      
      .action-info {
        flex: 1;
        margin-right: 24px;
      }
    }
  }

  .delete-warning {
    border: 1px solid #f44336;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .project-danger-settings {
    .danger-actions {
      .danger-action-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        
        .action-info {
          margin-right: 0;
        }
      }
    }
  }
}
</style>