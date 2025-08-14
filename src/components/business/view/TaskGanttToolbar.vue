<template>
  <!-- 展開/縮合控制 -->
  <div class="toolbar-section row q-gutter-xs">
    <q-btn
      flat
      dense
      size="sm"
      icon="unfold_more"
      label="全部展開"
      color="blue-grey"
      @click="$emit('expand-all')"
      class="compact-btn"
    >
      <q-tooltip>展開所有任務</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      size="sm"
      icon="unfold_less"
      label="全部縮合"
      color="blue-grey"
      @click="$emit('collapse-all')"
      class="compact-btn"
    >
      <q-tooltip>縮合所有任務</q-tooltip>
    </q-btn>
  </div>

  <q-separator vertical />

  <!-- 縮放控制 -->
  <div class="toolbar-section row q-gutter-xs">
    <q-btn
      flat
      dense
      size="sm"
      icon="zoom_in"
      @click="$emit('zoom-in')"
      class="compact-btn"
    >
      <q-tooltip>放大</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      size="sm"
      icon="zoom_out"
      @click="$emit('zoom-out')"
      class="compact-btn"
    >
      <q-tooltip>縮小</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      size="sm"
      icon="fit_screen"
      @click="$emit('fit-to-screen')"
      class="compact-btn"
    >
      <q-tooltip>適合螢幕</q-tooltip>
    </q-btn>
  </div>

  <q-separator vertical />

  <!-- 時間軸尺度選擇器 -->
  <div class="toolbar-section">
    <q-select
      :model-value="timelineScale"
      :options="timelineScaleOptions"
      emit-value
      map-options
      dense
      outlined
      style="min-width: 70px"
      class="compact-select"
      @update:model-value="$emit('update:timeline-scale', $event)"
    />
  </div>

  <q-separator vertical />

  <!-- 幫助按鈕 -->
  <q-btn
    flat
    dense
    size="sm"
    icon="help_outline"
    color="grey-6"
    class="compact-btn"
  >
    <q-tooltip class="text-no-wrap">
      時間軸拖拉：開啟後可直接拖拉時間軸<br/>
      滾輪縮放：Ctrl + 滾輪進行縮放
    </q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
// Props
interface GanttToolbarProps {
  timelineScale?: string
  showWeekends?: boolean
  showDependencies?: boolean
  showProgress?: boolean
  timelineDragEnabled?: boolean
}

const props = withDefaults(defineProps<GanttToolbarProps>(), {
  timelineScale: 'day',
  showWeekends: false,
  showDependencies: true,
  showProgress: true,
  timelineDragEnabled: false
})

// Emits
const emit = defineEmits<{
  'expand-all': []
  'collapse-all': []
  'zoom-in': []
  'zoom-out': []
  'fit-to-screen': []
  'update:timeline-scale': [value: string]
  'update:show-weekends': [value: boolean]
  'update:show-dependencies': [value: boolean]
  'update:show-progress': [value: boolean]
  'update:timeline-drag-enabled': [value: boolean]
}>()

// 時間軸尺度選項
const timelineScaleOptions = [
  { label: '小時', value: 'hour' },
  { label: '日', value: 'day' },
  { label: '週', value: 'week' },
  { label: '月', value: 'month' }
]
</script>

<style scoped lang="scss">
.compact-toolbar {
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
  min-height: 40px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 2px;
}

// 緊湊按鈕 - 更小尺寸
.compact-btn {
  min-height: 24px;
  padding: 2px 6px;
  font-size: 0.75rem;

  :deep(.q-btn__content) {
    min-width: auto;
    gap: 0.25rem;
  }

  // 只有圖標的按鈕更小
  &:not(:has(.q-btn__content > span:not(.q-icon))) {
    min-width: 24px;
    padding: 2px;
  }
}

// 緊湊選擇器
.compact-select {
  :deep(.q-field__control) {
    min-height: 24px;
    height: 30px;
    padding: 0 8px;
    font-size: 0.75rem;
  }

  :deep(.q-field__native) {
    min-height: 24px;
    padding: 0;
    font-size: 0.75rem;
  }

  :deep(.q-field__append) {
    padding-left: 4px;
  }

  // 覆蓋 Quasar dense 預設高度
  :deep(.q-field--dense .q-field__control),
  :deep(.q-field--dense .q-field__marginal) {
    height: 30px;
  }
}

// 分隔線樣式
:deep(.q-separator) {
  &.q-separator--vertical {
    height: 20px;
    margin: 0 0.25rem;
    background: #d1d5db;
  }
}

// 提示框樣式
:deep(.q-tooltip) {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}

// 切換開關樣式調整
:deep(.q-toggle) {
  .q-toggle__label {
    font-size: 0.75rem;
  }

  .q-toggle__track {
    width: 32px;
    height: 18px;
  }

  .q-toggle__thumb {
    width: 14px;
    height: 14px;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .compact-toolbar {
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.375rem;
    min-height: 36px;
  }

  .toolbar-section {
    gap: 1px;
  }

  .compact-btn {
    min-height: 22px;
    font-size: 0.7rem;

    // 移動端隱藏文字，只保留圖標
    :deep(.q-btn__content > span:not(.q-icon)) {
      display: none;
    }
  }

  .compact-select {
    :deep(.q-field__control) {
      min-height: 22px;
      font-size: 0.7rem;
    }
  }
}
</style>
