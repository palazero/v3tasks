<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 500px; max-width: 600px;" class="edit-view-dialog">
      <!-- 標題區域 -->
      <q-card-section class="dialog-header">
        <div class="row items-center q-gutter-md">
          <q-avatar color="primary" text-color="white" size="40px">
            <q-icon name="edit" />
          </q-avatar>
          <div>
            <div class="text-h6 text-weight-medium">編輯視圖</div>
            <div class="text-caption text-grey-6">修改視圖名稱和設定</div>
          </div>
        </div>
        <q-btn 
          flat 
          round 
          dense 
          icon="close" 
          v-close-popup 
          class="close-btn"
        />
      </q-card-section>

      <q-separator />

      <!-- 表單內容 -->
      <q-card-section class="form-content">
        <!-- 視圖名稱 -->
        <div class="form-group">
          <q-input
            v-model="viewName"
            label="視圖名稱"
            outlined
            :rules="[val => !!val || '請輸入視圖名稱']"
            autofocus
            @keyup.enter="saveView"
            class="view-name-input"
          >
            <template v-slot:prepend>
              <q-icon name="label" color="grey-6" />
            </template>
          </q-input>
        </div>

        <!-- 視圖類型顯示（不可編輯） -->
        <div class="form-group">
          <div class="text-body2 text-weight-medium text-grey-8 q-mb-sm">視圖類型</div>
          <q-card
            flat
            bordered
            class="view-type-display cursor-not-allowed"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center q-gutter-md">
                <q-avatar size="40px" :color="viewTypeInfo.color" text-color="white">
                  <q-icon :name="viewTypeInfo.icon" />
                </q-avatar>
                <div>
                  <div class="text-body1 text-weight-medium">{{ viewTypeInfo.label }}</div>
                  <div class="text-caption text-grey-6">{{ viewTypeInfo.description }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- 視圖設定預覽 -->
        <div class="form-group">
          <div class="text-body2 text-weight-medium text-grey-8 q-mb-sm">當前設定</div>
          <q-card flat bordered class="settings-preview">
            <q-card-section class="q-pa-md">
              <div class="row q-gutter-md">
                <div class="col">
                  <div class="text-caption text-grey-6">篩選條件</div>
                  <div class="text-body2">
                    {{ view?.config.filters.length || 0 }} 個條件
                  </div>
                </div>
                <div class="col">
                  <div class="text-caption text-grey-6">排序規則</div>
                  <div class="text-body2">
                    {{ view?.config.sorts.length || 0 }} 個規則
                  </div>
                </div>
                <div class="col">
                  <div class="text-caption text-grey-6">群組依據</div>
                  <div class="text-body2">
                    {{ view?.config.groupBy || '無' }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>

      <q-separator />

      <!-- 操作按鈕 -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="取消"
          color="grey"
          v-close-popup
          :disable="loading"
        />
        <q-btn
          :loading="loading"
          label="儲存變更"
          color="primary"
          @click="saveView"
          :disable="!viewName.trim()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { View, ViewType } from '@/types'
import { useViewStore } from '@/stores/view'

// Props
interface Props {
  modelValue: boolean
  view?: View
}

const props = withDefaults(defineProps<Props>(), {
  view: undefined
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'view-updated': [view: View]
}>()

const $q = useQuasar()
const viewStore = useViewStore()

// 狀態
const viewName = ref('')
const loading = ref(false)

// 計算屬性
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const viewTypeInfo = computed(() => {
  if (!props.view) return { label: '', description: '', icon: 'view_list', color: 'grey' }
  
  const typeInfoMap: Record<ViewType, { label: string; description: string; icon: string; color: string }> = {
    list: { label: '清單視圖', description: '以條列方式顯示任務', icon: 'list', color: 'blue' },
    table: { label: '表格視圖', description: '以表格形式顯示任務詳細資訊', icon: 'table_view', color: 'green' },
    board: { label: '看板視圖', description: '以看板方式管理任務狀態', icon: 'view_kanban', color: 'purple' },
    gantt: { label: '甘特圖', description: '顯示任務時間軸和依賴關係', icon: 'timeline', color: 'orange' },
    dashboard: { label: '儀表板', description: '顯示專案統計和概覽資訊', icon: 'dashboard', color: 'teal' }
  }
  
  return typeInfoMap[props.view.type] || typeInfoMap.list
})

// 監聽 props.view 變化，更新表單資料
watch(() => props.view, (newView) => {
  if (newView) {
    viewName.value = newView.name
  }
}, { immediate: true })

// 儲存視圖變更
async function saveView(): Promise<void> {
  if (!props.view || !viewName.value.trim()) return

  loading.value = true
  try {
    const success = await viewStore.updateView(props.view.viewId, {
      name: viewName.value.trim()
    })

    if (success) {
      $q.notify({
        type: 'positive',
        message: '視圖已更新',
        position: 'top'
      })
      
      // 取得更新後的視圖資料
      const updatedView = viewStore.getViewById(props.view.viewId)
      if (updatedView) {
        emit('view-updated', updatedView)
      }
      
      emit('update:modelValue', false)
    } else {
      throw new Error('更新視圖失敗')
    }
  } catch (error) {
    console.error('Failed to update view:', error)
    $q.notify({
      type: 'negative',
      message: '更新視圖失敗',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// 重置表單
function resetForm(): void {
  if (props.view) {
    viewName.value = props.view.name
  }
}

// 監聽對話框關閉，重置表單
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})
</script>

<style scoped lang="scss">
.edit-view-dialog {
  .dialog-header {
    position: relative;
    
    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }

  .form-content {
    max-height: 60vh;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 24px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  .view-name-input {
    .q-field__control {
      height: 56px;
    }
  }

  .view-type-display {
    background-color: #fafafa;
    opacity: 0.8;
    
    &.cursor-not-allowed {
      cursor: not-allowed;
    }
  }

  .settings-preview {
    background-color: #f8f9fa;
    
    .text-caption {
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}
</style>