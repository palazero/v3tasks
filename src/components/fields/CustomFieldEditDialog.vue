<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
    max-width="600px"
    transition-show="slide-up"
    transition-hide="slide-down"
    class="field-dialog-wrapper"
  >
    <q-card class="custom-field-edit-dialog">
      <!-- Enhanced Header -->
      <q-card-section class="dialog-header">
        <div class="row items-center no-wrap">
          <q-icon
            :name="isEditing ? 'edit' : 'add_box'"
            size="24px"
            :color="isEditing ? 'orange' : 'primary'"
            class="q-mr-sm"
          />
          <div>
            <div class="text-subtitle1 text-weight-medium">
              {{ isEditing ? '編輯自訂欄位' : '新增自訂欄位' }}
            </div>
            <div v-if="isEditing && field" class="text-caption text-grey-6 q-mt-xs" style="font-size: 10px;">
              欄位ID: {{ field.fieldId }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup class="close-btn" />
        </div>
      </q-card-section>

      <!-- Progress Indicator -->
      <q-linear-progress
        v-if="isSubmitting"
        indeterminate
        color="primary"
        class="loading-bar"
      />

      <q-card-section class="dialog-content">
        <q-form @submit="onSubmit" class="form-container">
          <!-- 基本資訊 -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="info" color="primary" size="20px" />
              <span class="section-title">基本資訊</span>
            </div>
            <div class="section-content">

              <q-input
                v-model="form.name"
                label="欄位名稱"
                outlined
                dense
                :rules="[val => !!val || '請輸入欄位名稱']"
                maxlength="50"
                counter
                class="compact-input"
                hide-bottom-space
                autofocus
              >
                <template v-slot:prepend>
                  <q-icon name="title" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="form.description"
                label="描述"
                outlined
                dense
                type="textarea"
                rows="2"
                maxlength="200"
                counter
                class="compact-input description-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="description" color="grey-6" />
                </template>
              </q-input>

              <div class="row q-col-gutter-sm">
                <div class="col">
                  <q-select
                    v-model="form.type"
                    :options="fieldTypeOptions"
                    label="欄位類型"
                    outlined
                    dense
                    emit-value
                    map-options
                    :rules="[val => !!val || '請選擇欄位類型']"
                    @update:model-value="onTypeChange"
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="category" color="grey-6" />
                    </template>
                  </q-select>
                </div>
                <div class="col">
                  <q-select
                    v-model="form.groupId"
                    :options="groupOptions"
                    label="所屬群組"
                    outlined
                    dense
                    emit-value
                    map-options
                    clearable
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="folder" color="grey-6" />
                    </template>
                  </q-select>
                </div>
              </div>
            </div>
          </div>

          <!-- 欄位選項 (select/multiSelect) -->
          <div v-if="needsOptions" class="form-section">
            <div class="section-header">
              <q-icon name="list" color="primary" size="20px" />
              <span class="section-title">選項設定</span>
            </div>
            <div class="section-content">

              <div class="options-list">
                <div 
                  v-for="(option, index) in form.options"
                  :key="index"
                  class="option-item"
                >
                  <div class="row items-center q-col-gutter-xs">
                    <div class="col-5">
                      <q-input
                        v-model="option.label"
                        label="顯示文字"
                        dense
                        outlined
                        class="compact-input"
                        hide-bottom-space
                      />
                    </div>

                    <div class="col-4">
                      <q-input
                        v-model="option.value"
                        label="值"
                        dense
                        outlined
                        class="compact-input"
                        hide-bottom-space
                      />
                    </div>

                    <div class="col-2">
                      <q-select
                        v-model="option.color"
                        :options="colorOptions"
                        label="顏色"
                        dense
                        outlined
                        clearable
                        emit-value
                        map-options
                        class="compact-input"
                        hide-bottom-space
                      >
                        <template v-slot:selected>
                          <div v-if="option.color" class="row items-center no-wrap">
                            <q-icon name="circle" :color="option.color" size="xs" />
                          </div>
                        </template>
                      </q-select>
                    </div>

                    <div class="col-1">
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        size="sm"
                        color="negative"
                        @click="removeOption(index)"
                        class="option-delete-btn"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <q-btn
                flat
                icon="add"
                label="新增選項"
                color="primary"
                size="sm"
                @click="addOption"
                class="add-option-btn"
              />
            </div>
          </div>

          <!-- 驗證規則 -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="rule" color="primary" size="20px" />
              <span class="section-title">驗證規則</span>
            </div>
            <div class="section-content">

              <!-- 文字欄位驗證 -->
              <div v-if="form.type === 'text'" class="row q-col-gutter-sm">
                <div class="col">
                  <q-input
                    v-model.number="form.validation.minLength"
                    label="最小長度"
                    type="number"
                    outlined
                    dense
                    min="0"
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="short_text" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <div class="col">
                  <q-input
                    v-model.number="form.validation.maxLength"
                    label="最大長度"
                    type="number"
                    outlined
                    dense
                    min="1"
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="subject" color="grey-6" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- 數字欄位驗證 -->
              <div v-if="form.type === 'number'" class="row q-col-gutter-sm">
                <div class="col">
                  <q-input
                    v-model.number="form.validation.min"
                    label="最小值"
                    type="number"
                    outlined
                    dense
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="trending_down" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <div class="col">
                  <q-input
                    v-model.number="form.validation.max"
                    label="最大值"
                    type="number"
                    outlined
                    dense
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="trending_up" color="grey-6" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- 通用驗證 -->
              <q-input
                v-model="form.validation.pattern"
                label="正則表達式"
                outlined
                dense
                placeholder="例：^[A-Za-z0-9]+$"
                class="compact-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="code" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="form.validation.errorMessage"
                label="自訂錯誤訊息"
                outlined
                dense
                placeholder="驗證失敗時顯示的訊息"
                class="compact-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="error" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="form.validation.helpText"
                label="說明文字"
                outlined
                dense
                placeholder="協助用戶填寫的說明"
                class="compact-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="help" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- 預設值 -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="settings" color="primary" size="20px" />
              <span class="section-title">預設值</span>
            </div>
            <div class="section-content">
              <CustomFieldRenderer
                :field="previewField"
                v-model:value="form.defaultValue"
                :show-label="false"
                :show-help="false"
                dense
              />
            </div>
          </div>

          <!-- 欄位設定 -->
          <div class="form-section">
            <div class="section-header">
              <q-icon name="tune" color="primary" size="20px" />
              <span class="section-title">欄位設定</span>
            </div>
            <div class="section-content">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <q-input
                    v-model.number="form.displayOrder"
                    label="顯示順序"
                    type="number"
                    outlined
                    dense
                    min="0"
                    class="compact-input"
                    hide-bottom-space
                  >
                    <template v-slot:prepend>
                      <q-icon name="reorder" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <div class="col-6 toggle-container">
                  <q-toggle
                    v-model="form.isRequired"
                    label="必填欄位"
                    color="red"
                    class="field-toggle"
                  />
                  <q-toggle
                    v-model="form.isVisible"
                    label="顯示欄位"
                    color="green"
                    class="field-toggle"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <!-- Enhanced Actions -->
      <q-card-actions class="dialog-actions">
        <div class="actions-left">
          <!-- Empty for now -->
        </div>

        <div class="actions-right">
          <q-btn
            flat
            icon="close"
            label="取消"
            v-close-popup
            class="cancel-btn"
            :disable="isSubmitting"
          />
          <q-btn
            unelevated
            :icon="isEditing ? 'save' : 'add'"
            :label="isEditing ? '更新欄位' : '建立欄位'"
            color="primary"
            @click="onSubmit"
            :loading="isSubmitting"
            class="submit-btn"
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useQuasar } from 'quasar'
import type { CustomField, CustomFieldGroup, FieldType, FieldOption, FieldValidation } from '@/types'
import { useCustomFields } from '@/composables/useCustomFields'
import CustomFieldRenderer from './CustomFieldRenderer.vue'

// Props
const props = defineProps<{
  modelValue: boolean
  field?: CustomField | null
  groups: CustomFieldGroup[]
  projectId?: string
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': []
}>()

const $q = useQuasar()
const customFields = props.projectId ? useCustomFields(props.projectId) : null

// 狀態
const isSubmitting = ref(false)
const isEditing = computed(() => !!props.field)

// 表單資料
const form = ref({
  name: '',
  description: '',
  type: 'text' as FieldType,
  groupId: '',
  isRequired: false,
  isVisible: true,
  options: [] as FieldOption[],
  validation: {} as FieldValidation,
  defaultValue: null as unknown,
  displayOrder: 1000
})

// 欄位類型選項
const fieldTypeOptions = [
  { label: '文字', value: 'text' },
  { label: '數字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '單選', value: 'select' },
  { label: '多選', value: 'multiSelect' },
  { label: '用戶', value: 'user' },
  { label: '核取方塊', value: 'checkbox' }
]

// 群組選項
const groupOptions = computed(() => [
  { label: '無群組', value: '' },
  ...props.groups.map(group => ({
    label: group.name,
    value: group.groupId
  }))
])

// 顏色選項
const colorOptions = [
  { label: '紅色', value: 'red' },
  { label: '橙色', value: 'orange' },
  { label: '黃色', value: 'amber' },
  { label: '綠色', value: 'green' },
  { label: '藍色', value: 'blue' },
  { label: '紫色', value: 'purple' },
  { label: '粉色', value: 'pink' },
  { label: '灰色', value: 'grey' }
]

// 是否需要選項
const needsOptions = computed(() => {
  return form.value.type === 'select' || form.value.type === 'multiSelect'
})

// 預覽欄位（用於預設值設定）
const previewField = computed((): CustomField => ({
  fieldId: 'preview',
  projectId: props.projectId || '',
  name: form.value.name || '預覽欄位',
  description: form.value.description,
  type: form.value.type,
  isRequired: false, // 預設值設定時不強制必填
  isSystem: false,
  options: form.value.options,
  defaultValue: form.value.defaultValue as string | number | boolean | string[] | Date | null,
  validation: form.value.validation,
  displayOrder: form.value.displayOrder,
  isVisible: form.value.isVisible,
  groupId: form.value.groupId || '',
  createdBy: '',
  createdAt: new Date(),
  updatedAt: new Date()
}))

// 初始化表單
function initializeForm(): void {
  if (props.field) {
    // 編輯模式
    form.value = {
      name: props.field.name,
      description: props.field.description || '',
      type: props.field.type,
      groupId: props.field.groupId || '',
      isRequired: props.field.isRequired,
      isVisible: props.field.isVisible,
      options: props.field.options ? [...props.field.options] : [],
      validation: props.field.validation ? { ...props.field.validation } : {},
      defaultValue: props.field.defaultValue,
      displayOrder: props.field.displayOrder
    }
  } else {
    // 新增模式
    form.value = {
      name: '',
      description: '',
      type: 'text' as FieldType,
      groupId: '',
      isRequired: false,
      isVisible: true,
      options: [],
      validation: {},
      defaultValue: null,
      displayOrder: 1000
    }
  }
}

// 監聽 field 變化
watch(() => props.field, () => {
  if (props.modelValue) {
    initializeForm()
  }
}, { immediate: true })

// 監聽對話框開關
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initializeForm()
  }
})

// 欄位類型變化處理
function onTypeChange(newType: FieldType): void {
  // 清除不相關的驗證規則
  form.value.validation = {}

  // 重設選項
  if (newType !== 'select' && newType !== 'multiSelect') {
    form.value.options = []
  }

  // 重設預設值
  form.value.defaultValue = getTypeDefaultValue(newType)
}

// 取得類型預設值
function getTypeDefaultValue(type: FieldType): unknown {
  if (type === 'text') return ''
  if (type === 'number') return 0
  if (type === 'date') return null
  if (type === 'select') return null
  if (type === 'multiSelect') return []
  if (type === 'checkbox') return false
  if (type === 'user') return null
  return null
}

// 選項操作
function addOption(): void {
  form.value.options.push({
    label: `選項 ${form.value.options.length + 1}`,
    value: `option_${form.value.options.length + 1}`,
    color: ''
  })
}

function removeOption(index: number): void {
  form.value.options.splice(index, 1)
}

// 取得顏色標籤
function getColorLabel(color: string): string {
  const colorOption = colorOptions.find(opt => opt.value === color)
  return colorOption?.label || color
}

// 提交表單
async function onSubmit(): Promise<void> {
  // 基本驗證
  if (!form.value.name.trim()) {
    $q.notify({
      type: 'negative',
      message: '請輸入欄位名稱'
    })
    return
  }

  if (needsOptions.value && form.value.options.length === 0) {
    $q.notify({
      type: 'negative',
      message: '請至少新增一個選項'
    })
    return
  }

  if (!customFields) {
    $q.notify({
      type: 'negative',
      message: '自訂欄位服務未初始化'
    })
    return
  }

  try {
    isSubmitting.value = true

    const fieldData = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      type: form.value.type,
      groupId: form.value.groupId || '',
      isRequired: form.value.isRequired,
      isVisible: form.value.isVisible,
      options: needsOptions.value ? form.value.options : [],
      validation: form.value.validation,
      defaultValue: form.value.defaultValue as string | number | boolean | string[] | Date | null,
      displayOrder: form.value.displayOrder,
      isSystem: false
    }

    if (isEditing.value && props.field) {
      // 更新現有欄位
      await customFields.updateCustomField(props.field.fieldId, fieldData)
      $q.notify({
        type: 'positive',
        message: '自訂欄位已更新'
      })
    } else {
      // 建立新欄位
      await customFields.createCustomField(fieldData)
      $q.notify({
        type: 'positive',
        message: '自訂欄位已建立'
      })
    }

    emit('save')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '操作失敗：' + (error as Error).message
    })
  } finally {
    isSubmitting.value = false
  }
}

// 組件掛載時初始化
onMounted(() => {
  if (props.modelValue) {
    initializeForm()
  }
})
</script>

<style scoped>
/* Dialog Container */
.field-dialog-wrapper {
  backdrop-filter: blur(4px);
}

.custom-field-edit-dialog {
  width: 100%;
  max-width: 600px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* Header Styling */
.dialog-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-bottom: 1px solid #e1e5e9;
  padding: 12px 16px;
}

.close-btn {
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.1);
}

/* Loading Bar */
.loading-bar {
  height: 3px;
}

/* Content Area */
.dialog-content {
  max-height: 65vh;
  overflow-y: auto;
  padding: 8px;
  background: #fafbfc;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Form Sections */
.form-section {
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  overflow: hidden;
  transition: all 0.2s ease;
}

.form-section:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.section-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 12px;
}

.section-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Input Enhancements */
.compact-input :deep(.q-field__control) {
  min-height: 36px;
}

.compact-input :deep(.q-field__label) {
  font-size: 12px;
}

.compact-input :deep(.q-field__native) {
  font-size: 13px;
  padding: 4px 8px;
}

.description-input :deep(.q-field__control) {
  min-height: 60px;
}

/* Options Section */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: #1976d2;
  background: white;
}

.option-delete-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
}

.add-option-btn {
  margin-top: 4px;
  border-radius: 6px;
  padding: 8px 16px;
}

/* Toggle Container */
.toggle-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.field-toggle {
  font-size: 12px;
}

.field-toggle :deep(.q-toggle__label) {
  font-size: 12px;
}

/* Actions Section */
.dialog-actions {
  background: white;
  border-top: 1px solid #e1e5e9;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions-left {
  flex: 1;
}

.actions-right {
  display: flex;
  gap: 6px;
}

.cancel-btn {
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.submit-btn {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3);
}

/* Custom Scrollbar */
.dialog-content::-webkit-scrollbar {
  width: 6px;
}

.dialog-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation for sections */
.form-section {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .custom-field-edit-dialog {
    margin: 4px;
    max-width: calc(100vw - 8px);
    border-radius: 6px;
  }

  .dialog-header {
    padding: 10px 12px;
  }

  .dialog-content {
    padding: 12px;
    max-height: 70vh;
  }

  .form-container {
    gap: 4px;
  }

  .section-content {
    padding: 8px;
    gap: 4px;
  }

  .dialog-actions {
    padding: 8px 12px;
    flex-direction: column;
    gap: 4px;
  }

  .actions-left,
  .actions-right {
    width: 100%;
    justify-content: center;
  }

  .actions-right {
    flex-direction: row-reverse;
  }

  .toggle-container {
    flex-direction: row;
    gap: 16px;
  }
}
</style>
