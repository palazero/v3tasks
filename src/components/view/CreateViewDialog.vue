<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">建立新視圖</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="viewName"
          label="視圖名稱"
          filled
          autofocus
          @keyup.enter="createView"
        />

        <q-select
          v-model="viewType"
          :options="viewTypeOptions"
          option-value="value"
          option-label="label"
          label="視圖類型"
          filled
          emit-value
          map-options
          class="q-mt-md"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" v-close-popup />
        <q-btn color="primary" label="建立" @click="createView" :disable="!viewName" />
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
  { label: '列表視圖', value: VT.LIST },
  { label: '儀表板', value: VT.DASHBOARD },
  { label: '表格視圖', value: VT.TABLE },
  { label: '看板視圖', value: VT.BOARD },
  { label: '甘特圖', value: VT.GANTT }
]

function createView(): void {
  if (!viewName.value) return

  const newView: View = {
    viewId: nanoid(),
    name: viewName.value,
    type: viewType.value,
    projectId: props.projectId,
    isDefault: false,
    config: {
      filters: [],
      sorts: [],
      groupBy: props.projectId === 'all' ? 'projectId' : undefined,
      columns: []
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