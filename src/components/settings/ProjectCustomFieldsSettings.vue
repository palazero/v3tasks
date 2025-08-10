<template>
  <div class="project-custom-fields-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm">自訂欄位</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        為專案任務建立自訂欄位，以滿足特定的專案管理需求。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <!-- 自訂欄位管理器 -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1 text-weight-medium">專案欄位設定</div>
            <q-btn
              color="primary"
              icon="add"
              label="新增欄位"
              size="sm"
              @click="showCreateFieldDialog"
            />
          </div>

          <!-- 欄位列表 -->
          <div v-if="fields && fields.length > 0" class="fields-list">
            <q-expansion-item
              v-for="field in fields"
              :key="field.fieldId"
              :label="field.name"
              :caption="`類型: ${getFieldTypeLabel(field.type)} | ${field.isRequired ? '必填' : '選填'}`"
              :icon="getFieldTypeIcon(field.type)"
              class="field-item"
            >
              <q-card flat class="q-mt-sm">
                <q-card-section class="q-pt-none">
                  <div class="row q-col-gutter-md">
                    <!-- 基本設定 -->
                    <div class="col-12 col-md-6">
                      <div class="text-subtitle2 q-mb-sm">基本設定</div>

                      <q-input
                        v-model="field.name"
                        label="欄位名稱"
                        outlined
                        dense
                        @update:model-value="updateField(field)"
                        class="q-mb-sm"
                      />

                      <q-input
                        v-model="field.description"
                        label="欄位描述"
                        outlined
                        dense
                        type="textarea"
                        rows="2"
                        @update:model-value="updateField(field)"
                        class="q-mb-sm"
                      />

                      <div class="row q-gutter-sm">
                        <q-checkbox
                          v-model="field.isRequired"
                          label="必填欄位"
                          @update:model-value="updateField(field)"
                        />

                        <q-checkbox
                          v-model="field.showInTable"
                          label="在表格中顯示"
                          @update:model-value="updateField(field)"
                        />
                      </div>
                    </div>

                    <!-- 欄位選項 -->
                    <div class="col-12 col-md-6" v-if="hasOptions(field.type)">
                      <div class="text-subtitle2 q-mb-sm">選項設定</div>

                      <div v-if="field.options" class="options-list">
                        <div
                          v-for="(option, index) in field.options"
                          :key="index"
                          class="row items-center q-gutter-sm q-mb-sm"
                        >
                          <q-input
                            v-model="option.label"
                            outlined
                            dense
                            placeholder="選項名稱"
                            @update:model-value="updateField(field)"
                            class="col"
                          />

                          <q-input
                            v-model="option.value"
                            outlined
                            dense
                            placeholder="選項值"
                            @update:model-value="updateField(field)"
                            class="col"
                          />

                          <q-btn
                            flat
                            dense
                            round
                            icon="delete"
                            color="negative"
                            size="sm"
                            @click="removeOption(field, index)"
                          />
                        </div>

                        <q-btn
                          flat
                          dense
                          icon="add"
                          label="新增選項"
                          color="primary"
                          size="sm"
                          @click="addOption(field)"
                        />
                      </div>
                    </div>

                    <!-- 預覽區 -->
                    <div class="col-12">
                      <q-separator class="q-my-md" />
                      <div class="text-subtitle2 q-mb-sm">欄位預覽</div>
                      <div class="field-preview bg-grey-1 q-pa-xs rounded-borders">
                        <CustomFieldRenderer
                          :field="field"
                          :value="getPreviewValue(field)"
                          :readonly="false"
                          :show-label="true"
                          :show-help="true"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- 操作按鈕 -->
                  <div class="row justify-end q-gutter-sm q-mt-md">
                    <q-btn
                      flat
                      label="刪除欄位"
                      color="negative"
                      icon="delete"
                      size="sm"
                      @click="deleteField(field)"
                    />

                    <q-btn
                      label="儲存變更"
                      color="primary"
                      icon="save"
                      size="sm"
                      @click="saveField(field)"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>

          <!-- 無欄位狀態 -->
          <div v-else class="text-center q-pa-lg text-grey-6">
            <q-icon name="dynamic_form" size="3em" />
            <div class="q-mt-sm">尚未建立自訂欄位</div>
            <div class="text-caption">點擊「新增欄位」建立第一個自訂欄位</div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 欄位統計 -->
    <div class="row q-col-gutter-md q-mt-md" v-if="fields && fields.length > 0">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">欄位統計</div>

          <div class="row q-col-gutter-md">
            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-primary">{{ fields?.length || 0 }}</div>
                <div class="text-caption">總欄位數</div>
              </div>
            </div>

            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-orange">{{ requiredFieldsCount }}</div>
                <div class="text-caption">必填欄位</div>
              </div>
            </div>

            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-green">{{ visibleFieldsCount }}</div>
                <div class="text-caption">表格顯示</div>
              </div>
            </div>

            <div class="col-6 col-sm-3">
              <div class="stat-item text-center">
                <div class="text-h4 text-purple">{{ fieldTypesCount }}</div>
                <div class="text-caption">欄位類型</div>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { CustomField } from '@/types'
import { useCustomFields } from '@/composables/useCustomFields'
import CustomFieldRenderer from '@/components/fields/CustomFieldRenderer.vue'

// Props
const props = defineProps<{
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  'change': []
}>()

const $q = useQuasar()
const { customFields: fields, updateField: updateFieldService, deleteField: deleteFieldService } = useCustomFields(props.projectId)

// 欄位類型對應
const fieldTypeLabels: Record<string, string> = {
  text: '文字',
  textarea: '多行文字',
  number: '數字',
  date: '日期',
  datetime: '日期時間',
  select: '下拉選單',
  multiselect: '多選下拉',
  checkbox: '核取方塊',
  radio: '單選按鈕',
  url: '網址',
  email: '電子郵件',
  phone: '電話號碼'
}

const fieldTypeIcons: Record<string, string> = {
  text: 'text_fields',
  textarea: 'notes',
  number: 'numbers',
  date: 'event',
  datetime: 'schedule',
  select: 'arrow_drop_down_circle',
  multiselect: 'checklist',
  checkbox: 'check_box',
  radio: 'radio_button_checked',
  url: 'link',
  email: 'email',
  phone: 'phone'
}

// 計算屬性
const requiredFieldsCount = computed(() =>
  fields.value?.filter(field => field.isRequired).length || 0
)

const visibleFieldsCount = computed(() =>
  fields.value?.filter(field => field.showInTable).length || 0
)

const fieldTypesCount = computed(() => {
  if (!fields.value) return 0
  const types = new Set(fields.value.map(field => field.type))
  return types.size
})

// 取得欄位類型標籤
function getFieldTypeLabel(type: string): string {
  return fieldTypeLabels[type] || type
}

// 取得欄位類型圖示
function getFieldTypeIcon(type: string): string {
  return fieldTypeIcons[type] || 'help'
}

// 檢查是否有選項
function hasOptions(type: string): boolean {
  return ['select', 'multiselect', 'radio', 'checkbox'].includes(type)
}

// 取得預覽值
function getPreviewValue(field: CustomField): unknown {
  if (field.type === 'text' || field.type === 'textarea') return '範例文字'
  if (field.type === 'number') return 123
  if (field.type === 'date') return new Date()
  if (field.type === 'datetime') return new Date()
  if (field.type === 'select' && field.options?.[0]) return field.options[0].value
  if (field.type === 'checkbox') return true
  if (field.type === 'url') return 'https://example.com'
  if (field.type === 'email') return 'example@email.com'
  if (field.type === 'phone') return '0912345678'
  return null
}

// 新增選項
function addOption(field: CustomField): void {
  if (!field.options) {
    field.options = []
  }
  field.options.push({ label: '', value: '' })
  void updateField(field)
}

// 移除選項
function removeOption(field: CustomField, index: number): void {
  if (field.options) {
    field.options.splice(index, 1)
    void updateField(field)
  }
}

// 更新欄位
async function updateField(field: CustomField): Promise<void> {
  try {
    await updateFieldService(field.fieldId, field)
    emit('change')
  } catch (error) {
    console.error('Failed to update field:', error)
    $q.notify({
      type: 'negative',
      message: '更新欄位失敗',
      position: 'top'
    })
  }
}

// 儲存欄位
async function saveField(field: CustomField): Promise<void> {
  try {
    await updateFieldService(field.fieldId, field)
    emit('change')

    $q.notify({
      type: 'positive',
      message: '欄位已儲存',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to save field:', error)
    $q.notify({
      type: 'negative',
      message: '儲存欄位失敗',
      position: 'top'
    })
  }
}

// 刪除欄位
async function deleteField(field: CustomField): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '刪除欄位',
      message: `確定要刪除欄位「${field.name}」嗎？此操作無法復原，且會刪除所有任務中此欄位的資料。`,
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })

  if (!confirmed) return

  try {
    await deleteFieldService(field.fieldId)
    emit('change')

    $q.notify({
      type: 'positive',
      message: `已刪除欄位「${field.name}」`,
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to delete field:', error)
    $q.notify({
      type: 'negative',
      message: '刪除欄位失敗',
      position: 'top'
    })
  }
}

// 顯示建立欄位對話框
function showCreateFieldDialog(): void {
  // 這裡可以使用現有的 CustomFieldManager 或創建新的對話框
  $q.notify({
    type: 'info',
    message: '請使用現有的自訂欄位管理器來建立新欄位',
    position: 'top'
  })
}

// 初始化
onMounted(() => {
  // 欄位已通過 composable 自動載入
})
</script>

<style scoped lang="scss">
.project-custom-fields-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .fields-list {
    .field-item {
      margin-bottom: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;

      &:hover {
        background-color: #fafafa;
      }
    }
  }

  .options-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .field-preview {
    min-height: 60px;
  }

  .stat-item {
    padding: 16px;
    border-radius: 8px;
    background-color: #fafafa;
  }
}
</style>
