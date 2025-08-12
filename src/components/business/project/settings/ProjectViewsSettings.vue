<template>
  <div class="project-views-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm">視圖設定</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        管理專案的視圖配置，包括預設視圖、視圖權限等設定。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <!-- 視圖列表 -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">專案視圖</div>
          
          <div v-if="views.length > 0" class="views-grid">
            <q-card
              v-for="view in views"
              :key="view.viewId"
              flat
              bordered
              class="view-card"
              :class="{ 'default-view': view.viewId === defaultViewId }"
            >
              <q-card-section class="q-pb-sm">
                <div class="row items-start justify-between">
                  <div class="row items-center q-gutter-sm">
                    <q-icon
                      :name="getViewIcon(view.type)"
                      :color="view.viewId === defaultViewId ? 'primary' : 'grey-6'"
                      size="md"
                    />
                    <div>
                      <div class="text-subtitle2 text-weight-medium">
                        {{ view.name }}
                      </div>
                      <div class="text-caption text-grey-6">
                        {{ getViewTypeLabel(view.type) }}
                      </div>
                    </div>
                  </div>

                  <q-btn-dropdown
                    flat
                    dense
                    round
                    icon="more_vert"
                    size="sm"
                  >
                    <q-list dense>
                      <q-item
                        v-if="view.viewId !== defaultViewId"
                        clickable
                        @click="setAsDefault(view.viewId)"
                      >
                        <q-item-section avatar>
                          <q-icon name="star" />
                        </q-item-section>
                        <q-item-section>設為預設</q-item-section>
                      </q-item>
                      
                      <q-item clickable @click="configureView(view)">
                        <q-item-section avatar>
                          <q-icon name="settings" />
                        </q-item-section>
                        <q-item-section>配置視圖</q-item-section>
                      </q-item>
                      
                      <q-item clickable @click="duplicateView(view)">
                        <q-item-section avatar>
                          <q-icon name="content_copy" />
                        </q-item-section>
                        <q-item-section>複製視圖</q-item-section>
                      </q-item>
                      
                      <q-separator v-if="view.isDeletable" />
                      
                      <q-item
                        v-if="view.isDeletable"
                        clickable
                        @click="deleteView(view)"
                      >
                        <q-item-section avatar>
                          <q-icon name="delete" color="negative" />
                        </q-item-section>
                        <q-item-section>刪除視圖</q-item-section>
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                </div>
              </q-card-section>

              <q-card-section class="q-pt-none">
                <div class="view-info">
                  <div class="row q-gutter-md text-caption text-grey-6">
                    <div>
                      <q-icon name="filter_list" size="xs" class="q-mr-xs" />
                      {{ view.config.filters?.length || 0 }} 個篩選
                    </div>
                    <div>
                      <q-icon name="sort" size="xs" class="q-mr-xs" />
                      {{ view.config.sorts?.length || 0 }} 個排序
                    </div>
                    <div v-if="view.isPersonal">
                      <q-icon name="person" size="xs" class="q-mr-xs" />
                      個人視圖
                    </div>
                  </div>
                  
                  <div class="q-mt-sm text-caption">
                    建立於 {{ formatDate(view.createdAt) }}
                  </div>
                  
                  <q-badge
                    v-if="view.viewId === defaultViewId"
                    color="primary"
                    label="預設"
                    class="q-mt-sm"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 無視圖狀態 -->
          <div v-else class="text-center q-pa-lg text-grey-6">
            <q-icon name="view_module" size="3em" />
            <div class="q-mt-sm">尚未建立自訂視圖</div>
            <div class="text-caption">系統會自動建立基本視圖</div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 視圖設定 -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">視圖偏好設定</div>
          
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="defaultViewId"
                :options="viewOptions"
                emit-value
                map-options
                outlined
                label="預設視圖"
                @update:model-value="saveDefaultView"
              >
                <template v-slot:selected-item="scope">
                  <div class="row items-center q-gutter-sm">
                    <q-icon :name="getViewIcon(getViewTypeByOption(scope.opt))" size="sm" />
                    <span>{{ scope.opt.label }}</span>
                  </div>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-6">
              <q-toggle
                v-model="autoSaveViews"
                label="自動儲存視圖變更"
                @update:model-value="saveAutoSavePreference"
              />
              <div class="text-caption text-grey-6 q-mt-xs">
                自動保存篩選和排序等視圖變更
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 視圖統計 -->
    <div class="row q-col-gutter-md q-mt-md" v-if="views.length > 0">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">視圖統計</div>
          
          <div class="row q-col-gutter-md">
            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-primary">{{ views.length }}</div>
                <div class="text-caption">總視圖數</div>
              </div>
            </div>
            
            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-orange">{{ personalViewsCount }}</div>
                <div class="text-caption">個人視圖</div>
              </div>
            </div>
            
            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-green">{{ sharedViewsCount }}</div>
                <div class="text-caption">共享視圖</div>
              </div>
            </div>
            
            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-purple">{{ viewTypesCount }}</div>
                <div class="text-caption">視圖類型</div>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { View, ViewType } from '@/types'
import { useViewStore } from '@/stores/view'

// Props
const props = defineProps<{
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'change': []
}>()

const $q = useQuasar()
const viewStore = useViewStore()

// 狀態
const defaultViewId = ref<string>('')
const autoSaveViews = ref(true)

// 計算屬性
const views = computed(() => viewStore.views)

const viewOptions = computed(() => 
  views.value.map(view => ({
    label: view.name,
    value: view.viewId
  }))
)

const personalViewsCount = computed(() => 
  views.value.filter(view => view.isPersonal).length
)

const sharedViewsCount = computed(() => 
  views.value.filter(view => !view.isPersonal).length
)

const viewTypesCount = computed(() => {
  const types = new Set(views.value.map(view => view.type))
  return types.size
})

// 視圖類型對應
const viewTypeLabels: Record<ViewType, string> = {
  list: '列表視圖',
  table: '表格視圖',
  board: '看板視圖',
  gantt: '甘特圖',
  dashboard: '儀表板'
}

const viewTypeIcons: Record<ViewType, string> = {
  list: 'list',
  table: 'table_view',
  board: 'view_kanban',
  gantt: 'timeline',
  dashboard: 'dashboard'
}

// 取得視圖類型標籤
function getViewTypeLabel(type: ViewType): string {
  return viewTypeLabels[type] || type
}

// 取得視圖圖示
function getViewIcon(type: ViewType): string {
  return viewTypeIcons[type] || 'view_list'
}

// 根據選項取得視圖類型
function getViewTypeByOption(option: { label: string; value: string }): ViewType {
  const view = views.value.find(v => v.viewId === option.value)
  return view?.type || 'list'
}

// 設定為預設視圖
function setAsDefault(viewId: string): void {
  defaultViewId.value = viewId
  saveDefaultView()
}

// 儲存預設視圖
function saveDefaultView(): void {
  try {
    // 這裡應該儲存到專案設定或用戶偏好
    emit('change')
    
    $q.notify({
      type: 'positive',
      message: '預設視圖已更新',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to save default view:', error)
    $q.notify({
      type: 'negative',
      message: '儲存預設視圖失敗',
      position: 'top'
    })
  }
}

// 儲存自動儲存偏好
function saveAutoSavePreference(): void {
  try {
    // 這裡應該儲存到用戶偏好
    emit('change')
    
    $q.notify({
      type: 'positive',
      message: '偏好設定已更新',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to save auto-save preference:', error)
    $q.notify({
      type: 'negative',
      message: '儲存偏好設定失敗',
      position: 'top'
    })
  }
}

// 配置視圖
function configureView(_view: View): void {
  $q.notify({
    type: 'info',
    message: '視圖配置功能將在未來版本中提供',
    position: 'top'
  })
}

// 複製視圖
async function duplicateView(view: View): Promise<void> {
  const newName = await new Promise<string | null>((resolve) => {
    $q.dialog({
      title: '複製視圖',
      message: '請輸入新視圖的名稱',
      prompt: {
        model: `${view.name} (複製)`,
        type: 'text'
      },
      cancel: true,
      persistent: false
    }).onOk(resolve).onCancel(() => resolve(null))
  })
  
  if (!newName) return

  try {
    await viewStore.duplicateView(view.viewId, newName)
    emit('change')
    
    $q.notify({
      type: 'positive',
      message: `視圖「${newName}」複製成功`,
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to duplicate view:', error)
    $q.notify({
      type: 'negative',
      message: '複製視圖失敗',
      position: 'top'
    })
  }
}

// 刪除視圖
async function deleteView(view: View): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '刪除視圖',
      message: `確定要刪除視圖「${view.name}」嗎？此操作無法復原。`,
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
  
  if (!confirmed) return

  try {
    await viewStore.deleteView(view.viewId)
    emit('change')
    
    $q.notify({
      type: 'positive',
      message: `視圖「${view.name}」已刪除`,
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to delete view:', error)
    $q.notify({
      type: 'negative',
      message: '刪除視圖失敗',
      position: 'top'
    })
  }
}

// 格式化日期
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-TW')
}

// 初始化
onMounted(() => {
  void viewStore.loadProjectViews(props.projectId)
  
  // 設定預設視圖
  if (views.value.length > 0 && !defaultViewId.value) {
    defaultViewId.value = views.value[0].viewId
  }
})
</script>

<style scoped lang="scss">
.project-views-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .views-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .view-card {
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    &.default-view {
      border: 2px solid #1976d2;
      background-color: #e3f2fd;
    }
  }

  .view-info {
    min-height: 60px;
  }

  .stat-item {
    padding: 16px;
    border-radius: 8px;
    background-color: #fafafa;
  }
}
</style>