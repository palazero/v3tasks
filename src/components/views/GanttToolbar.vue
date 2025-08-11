<template>
  <div class="row items-center q-gutter-xs">
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
        style="min-width: 80px"
        @update:model-value="$emit('update:timeline-scale', $event)"
      />
    </div>

    <q-separator vertical />

    <!-- 顯示選項開關 -->
    <div class="toolbar-section row q-gutter-sm">
      <q-toggle
        :model-value="showWeekends"
        label="週末"
        size="sm"
        @update:model-value="$emit('update:show-weekends', $event)"
      />
      
      <q-toggle
        :model-value="showDependencies"
        label="依賴"
        size="sm"
        @update:model-value="$emit('update:show-dependencies', $event)"
      />
      
      <q-toggle
        :model-value="showProgress"
        label="進度"
        size="sm"
        @update:model-value="$emit('update:show-progress', $event)"
      />
      
      <q-toggle
        :model-value="timelineDragEnabled"
        label="拖拉"
        size="sm"
        @update:model-value="$emit('update:timeline-drag-enabled', $event)"
      />
    </div>

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
  </div>
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

// 切換開關樣式調整
:deep(.q-toggle) {
  .q-toggle__label {
    font-size: 0.875rem;
  }
}
</style>