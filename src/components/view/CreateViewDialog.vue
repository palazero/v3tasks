<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 500px; max-width: 600px;" class="create-view-dialog">
      <!-- 標題區域 -->
      <q-card-section class="dialog-header">
        <div class="row items-center q-gutter-md">
          <q-avatar color="primary" text-color="white" size="40px">
            <q-icon name="view_module" />
          </q-avatar>
          <div>
            <div class="text-h6 text-weight-medium">建立新視圖</div>
            <div class="text-caption text-grey-6">為您的專案建立自訂視圖</div>
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
            @keyup.enter="createView"
            class="view-name-input"
          >
            <template v-slot:prepend>
              <q-icon name="label" color="grey-6" />
            </template>
          </q-input>
        </div>

        <!-- 視圖類型選擇 -->
        <div class="form-group">
          <div class="text-body2 text-weight-medium text-grey-8 q-mb-sm">選擇視圖類型</div>
          <div class="view-type-grid">
            <q-card
              v-for="option in viewTypeOptions"
              :key="option.value"
              flat
              bordered
              :class="[
                'view-type-card cursor-pointer',
                { 'selected': viewType === option.value }
              ]"
              @click="viewType = option.value"
            >
              <q-card-section class="text-center q-pa-md">
                <q-icon 
                  :name="option.icon" 
                  size="2.5em" 
                  :color="viewType === option.value ? 'primary' : 'grey-5'"
                  class="q-mb-sm"
                />
                <div 
                  class="text-body2 text-weight-medium"
                  :class="viewType === option.value ? 'text-primary' : 'text-grey-8'"
                >
                  {{ option.label }}
                </div>
                <div 
                  class="text-caption q-mt-xs"
                  :class="viewType === option.value ? 'text-primary' : 'text-grey-6'"
                >
                  {{ option.description }}
                </div>
              </q-card-section>

              <!-- 選中指示器 -->
              <q-icon
                v-if="viewType === option.value"
                name="check_circle"
                color="primary"
                size="md"
                class="selection-indicator"
              />
            </q-card>
          </div>
        </div>

        <!-- 預覽區域 -->
        <div v-if="selectedViewType" class="preview-section">
          <q-separator class="q-mb-md" />
          <div class="text-body2 text-weight-medium text-grey-8 q-mb-sm">
            <q-icon name="preview" size="sm" class="q-mr-xs" />
            視圖預覽
          </div>
          <q-card flat bordered class="preview-card">
            <q-card-section class="q-pa-md text-center">
              <q-icon 
                :name="selectedViewType.icon" 
                size="3em" 
                color="grey-4" 
                class="q-mb-sm"
              />
              <div class="text-body2 text-grey-6">
                {{ selectedViewType.label }}視圖將以{{ selectedViewType.description }}方式顯示任務
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>

      <!-- 操作按鈕 -->
      <q-card-actions class="dialog-actions">
        <q-btn 
          flat 
          label="取消" 
          v-close-popup 
          class="cancel-btn"
        />
        <q-btn 
          unelevated
          color="primary" 
          label="建立視圖" 
          :disabled="!viewName.trim()"
          @click="createView"
          class="create-btn"
        >
          <q-icon name="add" class="q-mr-xs" />
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { View, ViewType } from '@/types'
import { ViewType as VT } from '@/types'
import { nanoid } from 'nanoid'

// Props
const props = defineProps<{
  modelValue: boolean
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'view-created': [view: View]
}>()

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const viewName = ref('')
const viewType = ref<ViewType>(VT.LIST)

const viewTypeOptions = [
  { 
    label: '列表視圖', 
    value: VT.LIST,
    icon: 'list',
    description: '樹狀結構'
  },
  { 
    label: '儀表板', 
    value: VT.DASHBOARD,
    icon: 'dashboard',
    description: '統計圖表'
  },
  { 
    label: '表格視圖', 
    value: VT.TABLE,
    icon: 'table_view',
    description: '表格形式'
  },
  { 
    label: '看板視圖', 
    value: VT.BOARD,
    icon: 'view_column',
    description: '拖拽卡片'
  },
  { 
    label: '甘特圖', 
    value: VT.GANTT,
    icon: 'timeline',
    description: '時間軸'
  }
]

const selectedViewType = computed(() => {
  return viewTypeOptions.find(option => option.value === viewType.value)
})

function createView(): void {
  if (!viewName.value) return

  const newView: View = {
    viewId: nanoid(),
    name: viewName.value,
    type: viewType.value,
    projectId: props.projectId,
    isDeletable: true,
    isPersonal: true,
    creatorId: 'current-user', // This should be populated from current user
    config: {
      filters: [],
      sorts: [],
      ...(props.projectId === 'all' ? { groupBy: 'projectId' } : {}),
      visibleFields: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  emit('view-created', newView)
  
  // 重置表單
  viewName.value = ''
  viewType.value = VT.LIST
  dialogModel.value = false
}
</script>

<style scoped lang="scss">
.create-view-dialog {
  .dialog-header {
    position: relative;
    padding: 20px 24px 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    
    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
    }
  }

  .form-content {
    padding: 24px;
  }

  .form-group {
    margin-bottom: 24px;

    .view-name-input {
      .q-field__control {
        height: 56px;
      }
    }
  }

  .view-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 12px;

    .view-type-card {
      position: relative;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      border-radius: 12px;
      overflow: hidden;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.selected {
        border-color: #1976d2;
        background-color: #e3f2fd;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
      }

      .q-card__section {
        position: relative;
      }

      .selection-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        background: white;
        border-radius: 50%;
      }
    }
  }

  .preview-section {
    margin-top: 24px;

    .preview-card {
      border: 1px dashed #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }
  }

  .dialog-actions {
    padding: 16px 24px 24px;
    background-color: #fafafa;
    
    .cancel-btn {
      margin-right: 8px;
    }

    .create-btn {
      min-width: 120px;
      height: 40px;
      border-radius: 8px;
      font-weight: 600;
    }
  }
}

// 響應式設計
@media (max-width: 599px) {
  .create-view-dialog {
    .view-type-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;

      .view-type-card {
        .q-card__section {
          padding: 16px 8px;
        }

        .q-icon {
          font-size: 2em !important;
        }
      }
    }

    .dialog-header {
      padding: 16px 20px 12px;

      .q-avatar {
        width: 32px !important;
        height: 32px !important;
      }

      .text-h6 {
        font-size: 1.1rem;
      }
    }

    .form-content {
      padding: 16px 20px;
    }

    .dialog-actions {
      padding: 12px 20px 20px;
    }
  }
}
</style>