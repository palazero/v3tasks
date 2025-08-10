<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="right"
    :maximized="$q.screen.lt.md"
  >
    <q-card class="custom-field-edit-dialog" style="width: 500px; max-width: 90vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          {{ isEditing ? '編輯自訂欄位' : '新增自訂欄位' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-xs scroll" style="max-height: 70vh;">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- 基本資訊 -->
          <div class="section-title">基本資訊</div>

          <q-input
            v-model="form.name"
            label="欄位名稱 *"
            outlined
            dense
            :rules="[val => !!val || '請輸入欄位名稱']"
            maxlength="50"
            counter
          />

          <q-input
            v-model="form.description"
            label="描述"
            outlined
            dense
            type="textarea"
            rows="2"
            maxlength="200"
            counter
          />

          <div class="row q-gutter-md">
            <div class="col">
              <q-select
                v-model="form.type"
                :options="fieldTypeOptions"
                label="欄位類型 *"
                outlined
                dense
                emit-value
                map-options
                :rules="[val => !!val || '請選擇欄位類型']"
                @update:model-value="onTypeChange"
              />
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
              />
            </div>
          </div>

          <!-- 欄位選項 (select/multiSelect) -->
          <div v-if="needsOptions" class="field-options-section">
            <div class="section-title">選項設定</div>

            <div class="options-list">
              <VueDraggable
                v-model="form.options"
                :animation="200"
                handle=".option-handle"
                class="q-gutter-sm"
              >
                <template #item="{ element: option, index }">
                  <div class="option-item q-pa-sm bg-grey-1 rounded-borders">
                    <div class="row items-center q-gutter-sm">
                      <q-icon
                        name="drag_indicator"
                        class="option-handle cursor-pointer text-grey-6"
                      />

                      <q-input
                        v-model="option.label"
                        label="顯示文字"
                        dense
                        outlined
                        class="col"
                      />

                      <q-input
                        v-model="option.value"
                        label="值"
                        dense
                        outlined
                        class="col"
                      />

                      <q-select
                        v-model="option.color"
                        :options="colorOptions"
                        label="顏色"
                        dense
                        outlined
                        clearable
                        emit-value
                        map-options
                        style="width: 100px"
                      >
                        <template v-slot:selected>
                          <div v-if="option.color" class="row items-center q-gutter-xs">
                            <q-icon name="circle" :color="option.color" size="xs" />
                            <span>{{ getColorLabel(option.color) }}</span>
                          </div>
                        </template>
                      </q-select>

                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        size="sm"
                        color="negative"
                        @click="removeOption(index)"
                      />
                    </div>
                  </div>
                </template>
              </VueDraggable>
            </div>

            <q-btn
              flat
              icon="add"
              label="新增選項"
              color="primary"
              size="sm"
              @click="addOption"
              class="q-mt-sm"
            />
          </div>

          <!-- 驗證規則 -->
          <div class="validation-section">
            <div class="section-title">驗證規則</div>

            <!-- 文字欄位驗證 -->
            <div v-if="form.type === 'text'" class="row q-gutter-md">
              <q-input
                v-model.number="form.validation.minLength"
                label="最小長度"
                type="number"
                outlined
                dense
                min="0"
                class="col"
              />
              <q-input
                v-model.number="form.validation.maxLength"
                label="最大長度"
                type="number"
                outlined
                dense
                min="1"
                class="col"
              />
            </div>

            <!-- 數字欄位驗證 -->
            <div v-if="form.type === 'number'" class="row q-gutter-md">
              <q-input
                v-model.number="form.validation.min"
                label="最小值"
                type="number"
                outlined
                dense
                class="col"
              />
              <q-input
                v-model.number="form.validation.max"
                label="最大值"
                type="number"
                outlined
                dense
                class="col"
              />
            </div>

            <!-- 通用驗證 -->
            <q-input
              v-model="form.validation.pattern"
              label="正則表達式"
              outlined
              dense
              placeholder="例：^[A-Za-z0-9]+$"
            />

            <q-input
              v-model="form.validation.errorMessage"
              label="自訂錯誤訊息"
              outlined
              dense
              placeholder="驗證失敗時顯示的訊息"
            />

            <q-input
              v-model="form.validation.helpText"
              label="說明文字"
              outlined
              dense
              placeholder="協助用戶填寫的說明"
            />
          </div>

          <!-- 預設值 -->
          <div class="default-value-section">
            <div class="section-title">預設值</div>

            <CustomFieldRenderer
              :field="previewField"
              v-model:value="form.defaultValue"
              :show-label="false"
              :show-help="false"
              dense
            />
          </div>

          <!-- 欄位設定 -->
          <div class="field-settings-section">
            <div class="section-title">欄位設定</div>

            <div class="row q-gutter-md">
              <q-input
                v-model.number="form.displayOrder"
                label="顯示順序"
                type="number"
                outlined
                dense
                min="0"
                class="col"
              />
              <div class="col">
                <q-toggle
                  v-model="form.isRequired"
                  label="必填欄位"
                  color="red"
                />
                <q-toggle
                  v-model="form.isVisible"
                  label="顯示欄位"
                  color="green"
                  class="q-ml-md"
                />
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="取消" color="grey" v-close-popup />
        <q-btn
          unelevated
          :label="isEditing ? '更新' : '建立'"
          color="primary"
          @click="onSubmit"
          :loading="isSubmitting"
        />
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

<style scoped lang="scss">
.custom-field-edit-dialog {
  .section-title {
    font-weight: 600;
    font-size: 14px;
    color: $grey-8;
    margin-bottom: 8px;
    margin-top: 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  .option-item {
    border: 1px solid $grey-4;

    .option-handle {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    }
  }

  .validation-section,
  .default-value-section,
  .field-settings-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid $grey-3;
  }
}
</style>
