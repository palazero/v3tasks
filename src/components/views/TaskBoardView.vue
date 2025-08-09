<template>
  <div class="task-board-view q-pa-md">
    <div class="text-center q-pa-xl">
      <q-icon name="view_kanban" size="4em" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-6">看板視圖</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        此視圖正在開發中，將在 Phase 3 中實作
        <br>
        將支援拖拉排序與狀態切換功能
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
.task-board-view {
  min-height: 300px;
}
</style>