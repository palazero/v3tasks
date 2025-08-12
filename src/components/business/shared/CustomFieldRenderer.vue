<template>
  <div class="custom-field-renderer" :class="{ 'field-readonly': readonly }">
    <!-- 文字欄位 -->
    <q-input
      v-if="field.type === 'text'"
      v-model="localValue as string"
      :label="showLabel ? field.name : undefined"
      :placeholder="field.validation?.placeholder || `請輸入${field.name}`"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      @blur="validateAndEmit"
      @keyup.enter="validateAndEmit"
    />

    <!-- 數字欄位 -->
    <q-input
      v-else-if="field.type === 'number'"
      v-model.number="localValue as number"
      type="number"
      :label="showLabel ? field.name : undefined"
      :placeholder="field.validation?.placeholder || `請輸入${field.name}`"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      :min="field.validation?.min"
      :max="field.validation?.max"
      @blur="validateAndEmit"
      @keyup.enter="validateAndEmit"
    />

    <!-- 日期欄位 -->
    <q-input
      v-else-if="field.type === 'date'"
      v-model="formattedDateValue"
      :label="showLabel ? field.name : undefined"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      @blur="validateAndEmit"
    >
      <template v-if="!readonly" v-slot:append>
        <q-icon name="event" class="cursor-pointer">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-date
              v-model="formattedDateValue"
              mask="YYYY-MM-DD"
              @update:model-value="onDateChange"
            >
              <div class="row items-center justify-end">
                <q-btn v-close-popup label="確定" color="primary" flat />
              </div>
            </q-date>
          </q-popup-proxy>
        </q-icon>
      </template>
    </q-input>

    <!-- 單選欄位 -->
    <q-select
      v-else-if="field.type === 'select'"
      v-model="localValue"
      :options="field.options || []"
      :label="showLabel ? field.name : undefined"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      emit-value
      map-options
      clearable
      @update:model-value="validateAndEmit"
    >
      <template v-if="field.options" v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <div class="row items-center q-gutter-xs">
              <q-icon
                v-if="scope.opt.color"
                name="circle"
                :color="scope.opt.color"
                size="xs"
              />
              <span>{{ scope.opt.label }}</span>
            </div>
          </q-item-section>
        </q-item>
      </template>
      
      <template v-if="localValue && field.options" v-slot:selected>
        <div class="row items-center q-gutter-xs">
          <q-icon
            v-if="selectedOption?.color"
            name="circle"
            :color="selectedOption.color"
            size="xs"
          />
          <span>{{ selectedOption?.label || localValue }}</span>
        </div>
      </template>
    </q-select>

    <!-- 多選欄位 -->
    <q-select
      v-else-if="field.type === 'multiSelect'"
      v-model="localValue"
      :options="field.options || []"
      :label="showLabel ? field.name : undefined"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      multiple
      emit-value
      map-options
      use-chips
      @update:model-value="validateAndEmit"
    >
      <template v-if="field.options" v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section side>
            <q-checkbox :model-value="scope.selected" @update:model-value="scope.toggleOption" />
          </q-item-section>
          <q-item-section>
            <div class="row items-center q-gutter-xs">
              <q-icon
                v-if="scope.opt.color"
                name="circle"
                :color="scope.opt.color"
                size="xs"
              />
              <span>{{ scope.opt.label }}</span>
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-select>

    <!-- 用戶欄位 -->
    <q-select
      v-else-if="field.type === 'user'"
      v-model="localValue"
      :options="availableUsers"
      :label="showLabel ? field.name : undefined"
      :readonly="readonly"
      :dense="dense"
      :outlined="!readonly"
      :borderless="readonly"
      :required="field.isRequired"
      :error="!!validationError"
      :error-message="validationError || undefined"
      emit-value
      map-options
      clearable
      @update:model-value="validateAndEmit"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section side>
            <q-avatar size="24px" color="primary" text-color="white">
              {{ getUserInitials(scope.opt.value) }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
      
      <template v-if="localValue" v-slot:selected>
        <div class="row items-center q-gutter-xs">
          <q-avatar size="20px" color="primary" text-color="white">
            {{ getUserInitials(localValue as string) }}
          </q-avatar>
          <span>{{ selectedUser?.label || localValue }}</span>
        </div>
      </template>
    </q-select>

    <!-- 核取方塊欄位 -->
    <q-checkbox
      v-else-if="field.type === 'checkbox'"
      v-model="localValue"
      :label="showLabel ? field.name : undefined"
      :readonly="readonly"
      :dense="dense"
      :required="field.isRequired"
      @update:model-value="validateAndEmit"
    />

    <!-- 未知欄位類型 -->
    <div v-else class="text-caption text-negative">
      不支援的欄位類型：{{ field.type }}
    </div>

    <!-- 說明文字 -->
    <div
      v-if="field.validation?.helpText && showHelp"
      class="field-help text-caption text-grey-6 q-mt-xs"
    >
      <q-icon name="info" size="xs" class="q-mr-xs" />
      {{ field.validation.helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CustomField } from '@/types'
// import { useCustomFields } from '@/composables/useCustomFields'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { customFieldService } from '@/services/customFieldService'

// Props
const props = withDefaults(defineProps<{
  field: CustomField
  value?: unknown
  readonly?: boolean
  dense?: boolean
  showLabel?: boolean
  showHelp?: boolean
  projectId?: string
}>(), {
  readonly: false,
  dense: false,
  showLabel: true,
  showHelp: true
})

// Emits
const emit = defineEmits<{
  'update:value': [value: unknown]
  'validation-error': [error: string | null]
}>()

const { getUserOptions } = useCurrentUser()
const availableUsers = computed(() => getUserOptions())

// 本地值
const localValue = ref(props.value)
const validationError = ref<string | null>(null)

// 監聽外部值變化
watch(() => props.value, (newValue) => {
  localValue.value = newValue
}, { immediate: true })

// 日期格式化
const formattedDateValue = computed({
  get: () => {
    if (!localValue.value) return ''
    
    const date = localValue.value instanceof Date 
      ? localValue.value 
      : new Date(localValue.value as string)
    
    if (isNaN(date.getTime())) return ''
    
    return date.toISOString().split('T')[0] // YYYY-MM-DD 格式
  },
  set: (value: string) => {
    if (value) {
      localValue.value = new Date(value)
    } else {
      localValue.value = null
    }
  }
})

// 選中的選項
const selectedOption = computed(() => {
  if (!props.field.options || !localValue.value) return null
  return props.field.options.find(opt => opt.value === localValue.value)
})

// 選中的用戶
const selectedUser = computed(() => {
  if (!localValue.value) return null
  return availableUsers.value.find(user => user.value === localValue.value)
})

// 驗證並發送事件
function validateAndEmit(): void {
  if (props.readonly) return
  
  // 驗證欄位值
  const validation = customFieldService.validateFieldValue(props.field, localValue.value)
  
  if (validation.isValid) {
    validationError.value = null
    emit('validation-error', null)
  } else {
    validationError.value = validation.error || '值無效'
    emit('validation-error', validation.error || '值無效')
  }
  
  // 發送值變化事件
  emit('update:value', localValue.value)
}

// 日期變化處理
function onDateChange(value: string): void {
  localValue.value = value ? new Date(value) : null
  validateAndEmit()
}

// 取得用戶姓名縮寫
function getUserInitials(userId: string): string {
  const user = availableUsers.value.find(u => u.value === userId)
  return user ? user.label.substring(0, 2).toUpperCase() : userId.substring(0, 2).toUpperCase()
}

// 組件掛載時驗證初始值
onMounted(() => {
  if (props.value !== undefined && props.value !== null) {
    validateAndEmit()
  }
})
</script>

<style scoped lang="scss">
.custom-field-renderer {
  .field-readonly {
    :deep(.q-field__control) {
      padding: 4px 8px;
    }
    
    :deep(.q-field__native) {
      color: $grey-8;
    }
  }

  .field-help {
    line-height: 1.2;
  }
}
</style>