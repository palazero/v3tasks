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

    <!-- 卡片顯示選項 -->
    <div class="toolbar-section row q-gutter-xs">
      <q-toggle
        :model-value="showAssignee"
        label="指派人"
        size="sm"
        @update:model-value="$emit('update:show-assignee', $event)"
      />
      
      <q-toggle
        :model-value="showDueDate"
        label="到期日"
        size="sm"
        @update:model-value="$emit('update:show-due-date', $event)"
      />
      
      <q-toggle
        :model-value="showTags"
        label="標籤"
        size="sm"
        @update:model-value="$emit('update:show-tags', $event)"
      />
      
      <q-toggle
        :model-value="showDescription"
        label="描述"
        size="sm"
        @update:model-value="$emit('update:show-description', $event)"
      />
    </div>

    <q-separator vertical />

    <!-- 卡片大小控制 -->
    <div class="toolbar-section row items-center q-gutter-xs">
      <span class="text-caption text-grey-6">卡片大小:</span>
      <q-btn-group dense>
        <q-btn
          flat
          size="sm"
          icon="compress_alt"
          :color="cardSize === 'small' ? 'primary' : 'grey'"
          @click="$emit('update:card-size', 'small')"
          class="compact-btn-group"
        >
          <q-tooltip>小</q-tooltip>
        </q-btn>
        <q-btn
          flat
          size="sm"
          icon="unfold_less"
          :color="cardSize === 'medium' ? 'primary' : 'grey'"
          @click="$emit('update:card-size', 'medium')"
          class="compact-btn-group"
        >
          <q-tooltip>中</q-tooltip>
        </q-btn>
        <q-btn
          flat
          size="sm"
          icon="unfold_more"
          :color="cardSize === 'large' ? 'primary' : 'grey'"
          @click="$emit('update:card-size', 'large')"
          class="compact-btn-group"
        >
          <q-tooltip>大</q-tooltip>
        </q-btn>
      </q-btn-group>
    </div>

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
  showAssignee?: boolean
  showDueDate?: boolean
  showTags?: boolean
  showDescription?: boolean
  cardSize?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<BoardToolbarProps>(), {
  showAssignee: true,
  showDueDate: true,
  showTags: true,
  showDescription: true,
  cardSize: 'medium'
})

// Emits
const emit = defineEmits<{
  'show-board-settings': []
  'update:show-assignee': [value: boolean]
  'update:show-due-date': [value: boolean]
  'update:show-tags': [value: boolean]
  'update:show-description': [value: boolean]
  'update:card-size': [size: 'small' | 'medium' | 'large']
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