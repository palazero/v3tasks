<template>
  <div v-if="showProjectSort" class="row items-center q-gutter-xs">
    <!-- 專案分組控制 -->
    <q-btn
      flat
      dense
      icon="group_work"
      label="依專案分組"
      size="sm"
      :color="isGroupedByProject ? 'primary' : 'grey'"
      @click="$emit('toggle-project-grouping')"
      class="compact-btn"
    >
      <q-tooltip>{{ isGroupedByProject ? '取消專案分組' : '依專案分組顯示' }}</q-tooltip>
    </q-btn>

    <!-- 專案排序選單 -->
    <q-btn
      v-if="isGroupedByProject"
      flat
      dense
      icon="sort"
      size="sm"
      class="compact-btn"
      @click.stop
    >
      <q-tooltip>排序專案</q-tooltip>
      <q-menu>
        <q-list dense style="min-width: 150px">
          <q-item 
            clickable 
            @click="$emit('set-project-sort', 'name')"
            :class="{ 'bg-blue-1': projectSortBy === 'name' }"
          >
            <q-item-section>
              <q-item-label>依名稱排序</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="projectSortBy === 'name'" name="check" color="primary" />
            </q-item-section>
          </q-item>

          <q-item 
            clickable 
            @click="$emit('set-project-sort', 'taskCount')"
            :class="{ 'bg-blue-1': projectSortBy === 'taskCount' }"
          >
            <q-item-section>
              <q-item-label>依任務數量</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="projectSortBy === 'taskCount'" name="check" color="primary" />
            </q-item-section>
          </q-item>

          <q-item 
            clickable 
            @click="$emit('set-project-sort', 'progress')"
            :class="{ 'bg-blue-1': projectSortBy === 'progress' }"
          >
            <q-item-section>
              <q-item-label>依進度排序</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="projectSortBy === 'progress'" name="check" color="primary" />
            </q-item-section>
          </q-item>

          <q-item 
            clickable 
            @click="$emit('set-project-sort', 'overdue')"
            :class="{ 'bg-blue-1': projectSortBy === 'overdue' }"
          >
            <q-item-section>
              <q-item-label>依逾期任務</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="projectSortBy === 'overdue'" name="check" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

    <q-separator v-if="isGroupedByProject" vertical />
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