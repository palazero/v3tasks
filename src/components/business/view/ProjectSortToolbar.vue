<template>
  <div v-if="showProjectSort" class="row items-center q-gutter-xs">

  </div>
</template>

<script setup lang="ts">
// Props
interface ProjectSortToolbarProps {
  showProjectSort?: boolean
  isGroupedByProject?: boolean
  projectSortBy?: string
}

const props = withDefaults(defineProps<ProjectSortToolbarProps>(), {
  showProjectSort: false,
  isGroupedByProject: false,
  projectSortBy: 'name'
})

// Emits
const emit = defineEmits<{
  'toggle-project-grouping': []
  'set-project-sort': [sortBy: string]
}>()
</script>

<style scoped lang="scss">
// 緊湊按鈕
.compact-btn {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.875rem;
}

// 選中狀態樣式
:deep(.q-item.bg-blue-1) {
  background-color: rgba(25, 118, 210, 0.08) !important;
}
</style>
