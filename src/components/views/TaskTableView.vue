<template>
  <div class="task-table-view q-pa-md">
    <div class="text-center q-pa-xl">
      <q-icon name="table_view" size="4em" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-6">表格視圖</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        此視圖正在開發中，將在 Phase 3 中實作
      </div>
      <div class="q-mt-md">
        <q-btn
          flat
          color="primary"
          label="暫時使用列表視圖"
          @click="$router.push({ query: { ...$route.query, view: 'list' } })"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Task, View } from '@/types'

// Props
defineProps<{
  view: View
  tasks: Task[]
  projectId: string
}>()

// Emits
defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
}>()
</script>

<style scoped lang="scss">
.task-table-view {
  min-height: 300px;
}
</style>