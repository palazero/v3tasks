<template>
  <div class="task-gantt-view q-pa-md">
    <div class="text-center q-pa-xl">
      <q-icon name="timeline" size="4em" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-6">甘特圖視圖</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        此視圖正在開發中，將在 Phase 5 中實作
        <br>
        將使用 @infectoone/vue-ganttastic 套件
      </div>
      <div class="q-mt-md">
        <q-btn
          flat
          color="primary"
          label="暫時使用儀表板視圖"
          @click="$router.push({ query: { ...$route.query, view: 'dashboard' } })"
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
.task-gantt-view {
  min-height: 300px;
}
</style>