<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 500px">
      <q-card-section>
        <div class="text-h6">排序設定</div>
      </q-card-section>

      <q-card-section class="q-pt-none" style="max-height: 60vh; overflow-y: auto">
        <div class="text-center q-pa-xl">
          <q-icon name="sort" size="3em" color="grey-5" />
          <div class="text-h6 q-mt-md text-grey-6">排序功能</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            此功能正在開發中，將在 Phase 4 中實作
            <br>
            將支援多欄位排序與自訂排序規則
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" v-close-popup />
        <q-btn color="primary" label="套用" @click="applySorts" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SortConfig } from '@/types'

// Props
const props = defineProps<{
  modelValue: boolean
  sorts: SortConfig[]
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'sorts-updated': [sorts: SortConfig[]]
}>()

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function applySorts(): void {
  // 暫時回傳原有排序條件
  emit('sorts-updated', props.sorts)
  dialogModel.value = false
}
</script>