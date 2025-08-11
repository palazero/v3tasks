<template>
  <div class="row items-center justify-between compact-toolbar bg-grey-1">
    <!-- 左側：搜尋 + 基本工具 + 自訂工具 -->
    <div class="row items-center q-gutter-xs">
      <!-- 搜尋框 -->
      <q-input
        v-if="showSearch"
        v-model="searchValue"
        placeholder="搜尋任務..."
        dense
        style="min-width: 180px"
        class="compact-input"
        debounce="300"
        @update:model-value="$emit('search', String($event || ''))"
      >
        <template v-slot:prepend>
          <q-icon name="search" size="sm" />
        </template>
        <template v-slot:append>
          <q-icon
            v-if="searchValue"
            name="clear"
            size="sm"
            class="cursor-pointer"
            @click="clearSearch"
          />
        </template>
      </q-input>

      <!-- 篩選按鈕 -->
      <q-btn
        v-if="showFilter"
        dense
        flat
        icon="filter_list"
        label="篩選"
        size="sm"
        :color="hasActiveFilters ? 'primary' : 'grey'"
        @click="$emit('show-filter')"
        class="compact-btn"
      >
        <q-badge
          v-if="(activeFiltersCount || 0) > 0"
          color="primary"
          :label="activeFiltersCount || 0"
          rounded
          floating
        />
      </q-btn>

      <!-- 排序按鈕 -->
      <q-btn
        v-if="showSort"
        dense
        flat
        icon="sort"
        label="排序"
        size="sm"
        :color="hasActiveSorts ? 'primary' : 'grey'"
        @click="$emit('show-sort')"
        class="compact-btn"
      />

      <!-- 左側自訂工具插槽 -->
      <slot name="left-tools" />
    </div>

    <!-- 右側：自訂工具 + 新增任務 -->
    <div class="row items-center q-gutter-xs">
      <!-- 右側自訂工具插槽 -->
      <slot name="right-tools" />

      <!-- 欄位管理按鈕 -->
      <q-btn
        v-if="showColumnManager"
        dense
        flat
        icon="view_column"
        label="欄位管理"
        size="sm"
        @click="$emit('show-column-manager')"
        class="compact-btn"
      >
        <q-badge
          v-if="(visibleColumnsCount || 0) > 0"
          color="primary"
          :label="`${visibleColumnsCount}/${totalColumnsCount}`"
          rounded
          floating
        />
        <q-tooltip>管理顯示的欄位</q-tooltip>
      </q-btn>

      <!-- 新增任務按鈕 -->
      <q-btn
        v-if="showAddTask"
        color="primary"
        icon="add"
        label="新增任務"
        size="sm"
        @click="$emit('add-task')"
        class="compact-btn"
      />

      <!-- 更多操作插槽 -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// Props
interface ViewToolbarProps {
  // 基本工具顯示控制
  showSearch?: boolean
  showFilter?: boolean
  showSort?: boolean
  showAddTask?: boolean
  showColumnManager?: boolean
  
  // 搜尋相關
  search?: string
  
  // 篩選相關
  hasActiveFilters?: boolean
  activeFiltersCount?: number
  
  // 排序相關
  hasActiveSorts?: boolean
  
  // 欄位管理相關
  visibleColumnsCount?: number
  totalColumnsCount?: number
}

const props = withDefaults(defineProps<ViewToolbarProps>(), {
  showSearch: true,
  showFilter: true,
  showSort: true,
  showAddTask: true,
  showColumnManager: false,
  search: '',
  hasActiveFilters: false,
  activeFiltersCount: 0,
  hasActiveSorts: false,
  visibleColumnsCount: 0,
  totalColumnsCount: 0
})

// Emits
const emit = defineEmits<{
  'search': [query: string]
  'show-filter': []
  'show-sort': []
  'add-task': []
  'show-column-manager': []
  'update:search': [value: string]
}>()

// 本地搜尋值管理
const searchValue = ref(props.search)

// 清除搜尋
function clearSearch(): void {
  searchValue.value = ''
  emit('search', '')
  emit('update:search', '')
}

// 監聽 props.search 變化
watch(() => props.search, (newValue) => {
  searchValue.value = newValue
})
</script>

<style scoped lang="scss">
// 緊湊工具列
.compact-toolbar {
  min-height: 40px;
  padding: 0 8px;
}

// 緊湊輸入框
.compact-input :deep(.q-field__control) {
  min-height: 28px;
  max-height: 28px;
}

.compact-input :deep(.q-field__native) {
  min-height: 28px;
  max-height: 28px;
}

.compact-input :deep(.q-field__marginal) {
  min-height: 28px;
  max-height: 28px;
}

// 緊湊按鈕
.compact-btn {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.875rem;
}
</style>