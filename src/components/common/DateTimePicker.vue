<template>
  <div class="date-time-picker">
    <div class="row q-gutter-sm">
      <!-- 日期選擇 -->
      <div class="col">
        <q-date
          v-model="dateModel"
          @update:model-value="updateDateTime"
          :options="dateOptions"
        />
      </div>
      
      <!-- 時間選擇 -->
      <div class="col-auto" style="min-width: 200px">
        <q-time
          v-model="timeModel"
          @update:model-value="updateDateTime"
          format24h
        />
      </div>
    </div>
    
    <!-- 快速選擇按鈕 -->
    <div class="row q-gutter-xs q-mt-sm">
      <q-btn
        size="sm"
        flat
        dense
        label="今天"
        @click="setToday"
      />
      <q-btn
        size="sm"
        flat
        dense
        label="明天"
        @click="setTomorrow"
      />
      <q-btn
        size="sm"
        flat
        dense
        label="下週"
        @click="setNextWeek"
      />
      <q-btn
        size="sm"
        flat
        dense
        label="清除"
        @click="clearDateTime"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps<{
  modelValue?: Date | null
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: Date | null]
}>()

// 內部狀態
const dateModel = ref('')
const timeModel = ref('')

// 計算屬性
const dateTimeValue = computed({
  get: () => props.modelValue || null,
  set: (value) => emit('update:modelValue', value)
})

// 初始化表單值
function initValues(): void {
  if (props.modelValue && props.modelValue instanceof Date) {
    const date = props.modelValue
    dateModel.value = formatDateForQDate(date)
    timeModel.value = formatTimeForQTime(date)
  } else {
    dateModel.value = ''
    timeModel.value = ''
  }
}

// 更新日期時間
function updateDateTime(): void {
  if (!dateModel.value) {
    dateTimeValue.value = null
    return
  }

  try {
    const dateStr = dateModel.value.replace(/\//g, '-')
    const timeStr = timeModel.value || '09:00'
    const dateTimeStr = `${dateStr} ${timeStr}`
    const date = new Date(dateTimeStr)
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateTimeStr)
      return
    }
    
    dateTimeValue.value = date
  } catch (error) {
    console.error('Failed to parse date time:', error)
  }
}

// 格式化日期給 QDate 使用
function formatDateForQDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

// 格式化時間給 QTime 使用
function formatTimeForQTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 日期選項（禁用過去的日期）
function dateOptions(date: string): boolean {
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selectedDate >= today
}

// 快速設定今天
function setToday(): void {
  const now = new Date()
  now.setHours(9, 0, 0, 0) // 預設上午 9 點
  dateModel.value = formatDateForQDate(now)
  timeModel.value = formatTimeForQTime(now)
  updateDateTime()
}

// 快速設定明天
function setTomorrow(): void {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  dateModel.value = formatDateForQDate(tomorrow)
  timeModel.value = formatTimeForQTime(tomorrow)
  updateDateTime()
}

// 快速設定下週
function setNextWeek(): void {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(9, 0, 0, 0)
  dateModel.value = formatDateForQDate(nextWeek)
  timeModel.value = formatTimeForQTime(nextWeek)
  updateDateTime()
}

// 清除日期時間
function clearDateTime(): void {
  dateModel.value = ''
  timeModel.value = ''
  dateTimeValue.value = null
}

// 監聽 modelValue 變化
watch(() => props.modelValue, () => {
  initValues()
}, { immediate: true })
</script>

<style scoped lang="scss">
.date-time-picker {
  .q-date {
    box-shadow: none;
    border: 1px solid $grey-4;
  }
  
  .q-time {
    box-shadow: none;
    border: 1px solid $grey-4;
  }
}
</style>