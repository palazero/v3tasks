<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="standard"
  >
    <q-card class="custom-field-group-dialog" style="width: 400px; max-width: 90vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          {{ isEditing ? '編輯欄位群組' : '新增欄位群組' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-md">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="form.name"
            label="群組名稱 *"
            outlined
            dense
            :rules="[val => !!val || '請輸入群組名稱']"
            maxlength="50"
            counter
            autofocus
          />

          <q-input
            v-model="form.description"
            label="描述"
            outlined
            dense
            type="textarea"
            rows="3"
            maxlength="200"
            counter
          />

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
            <div class="col column q-gutter-sm">
              <q-toggle
                v-model="form.isCollapsible"
                label="可收合"
                color="primary"
              />
              <q-toggle
                v-if="form.isCollapsible"
                v-model="form.isCollapsed"
                label="預設收合"
                color="orange"
              />
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
import { useQuasar } from 'quasar'
import type { CustomFieldGroup } from '@/types'
import { useCustomFields } from '@/composables/useCustomFields'

// Props
const props = defineProps<{
  modelValue: boolean
  group?: CustomFieldGroup | null
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
const isEditing = computed(() => !!props.group)

// 表單資料
const form = ref({
  name: '',
  description: '',
  displayOrder: 1000,
  isCollapsible: true,
  isCollapsed: false
})

// 初始化表單
function initializeForm(): void {
  if (props.group) {
    // 編輯模式
    form.value = {
      name: props.group.name,
      description: props.group.description || '',
      displayOrder: props.group.displayOrder,
      isCollapsible: props.group.isCollapsible,
      isCollapsed: props.group.isCollapsed
    }
  } else {
    // 新增模式
    form.value = {
      name: '',
      description: '',
      displayOrder: 1000,
      isCollapsible: true,
      isCollapsed: false
    }
  }
}

// 監聽 group 變化
watch(() => props.group, () => {
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

// 提交表單
async function onSubmit(): Promise<void> {
  // 基本驗證
  if (!form.value.name.trim()) {
    $q.notify({
      type: 'negative',
      message: '請輸入群組名稱'
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

    const groupData = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      displayOrder: form.value.displayOrder,
      isCollapsible: form.value.isCollapsible,
      isCollapsed: form.value.isCollapsed
    }

    if (isEditing.value && props.group) {
      // 更新現有群組
      await customFields.updateCustomFieldGroup(props.group.groupId, groupData)
      $q.notify({
        type: 'positive',
        message: '欄位群組已更新'
      })
    } else {
      // 建立新群組
      await customFields.createCustomFieldGroup(groupData)
      $q.notify({
        type: 'positive',
        message: '欄位群組已建立'
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
.custom-field-group-dialog {
  // 樣式可以根據需要添加
}
</style>
