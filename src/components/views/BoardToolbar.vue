<template>
  <div class="row items-center q-gutter-xs">
    <!-- 看板設定 -->
    <q-btn
      flat
      dense
      icon="settings"
      label="看板設定"
      size="sm"
      @click="$emit('show-board-settings')"
      class="compact-btn"
    >
      <q-tooltip>看板設定</q-tooltip>
    </q-btn>

    <q-separator vertical />

    <!-- 快速操作 -->
    <div class="toolbar-section row q-gutter-xs">
      <q-btn
        flat
        dense
        icon="refresh"
        label="重新整理"
        size="sm"
        @click="$emit('refresh')"
        class="compact-btn"
      >
        <q-tooltip>重新整理看板</q-tooltip>
      </q-btn>

      <q-btn
        flat
        dense
        icon="fullscreen"
        label="全螢幕"
        size="sm"
        @click="$emit('toggle-fullscreen')"
        class="compact-btn"
      >
        <q-tooltip>全螢幕檢視</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface BoardToolbarProps {
}

const props = withDefaults(defineProps<BoardToolbarProps>(), {
})

// Emits
const emit = defineEmits<{
  'show-board-settings': []
  'update:show-assignee': [value: boolean]
  'update:show-due-date': [value: boolean]
  'update:show-tags': [value: boolean]
  'update:show-description': [value: boolean]
  'refresh': []
  'toggle-fullscreen': []
}>()
</script>

<style scoped lang="scss">
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

// 緊湊按鈕
.compact-btn {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.875rem;
}

// 緊湊按鈕組
.compact-btn-group {
  min-height: 28px;
  padding: 2px 6px;
  font-size: 0.75rem;
}

// 切換開關樣式調整
:deep(.q-toggle) {
  .q-toggle__label {
    font-size: 0.875rem;
  }
}

// 按鈕組樣式
:deep(.q-btn-group) {
  .q-btn {
    border-radius: 0;

    &:first-child {
      border-radius: 4px 0 0 4px;
    }

    &:last-child {
      border-radius: 0 4px 4px 0;
    }
  }
}
</style>
