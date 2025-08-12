<template>
  <div class="row items-center q-gutter-xs">
    <!-- 時間範圍選擇 -->
    <div class="toolbar-section row items-center q-gutter-xs">
      <span class="text-caption text-grey-6">時間範圍:</span>
      <q-select
        :model-value="timeRange"
        :options="timeRangeOptions"
        emit-value
        map-options
        dense
        outlined
        style="min-width: 100px"
        @update:model-value="$emit('update:time-range', $event)"
      />
    </div>

    <q-separator vertical />

    <!-- 圖表顯示控制 -->
    <div class="toolbar-section row q-gutter-xs">
      <q-toggle
        :model-value="showStatusChart"
        label="狀態圖表"
        size="sm"
        @update:model-value="$emit('update:show-status-chart', $event)"
      />
      
      <q-toggle
        :model-value="showPriorityChart"
        label="優先級圖表"
        size="sm"
        @update:model-value="$emit('update:show-priority-chart', $event)"
      />
      
      <q-toggle
        :model-value="showTimelineChart"
        label="時間線圖表"
        size="sm"
        @update:model-value="$emit('update:show-timeline-chart', $event)"
      />
      
      <q-toggle
        :model-value="showCompletionChart"
        label="完成率圖表"
        size="sm"
        @update:model-value="$emit('update:show-completion-chart', $event)"
      />
    </div>

    <q-separator vertical />

    <!-- 視圖選項 -->
    <div class="toolbar-section row items-center q-gutter-xs">
      <span class="text-caption text-grey-6">視圖:</span>
      <q-btn-group dense>
        <q-btn
          flat
          size="sm"
          icon="grid_view"
          :color="viewMode === 'grid' ? 'primary' : 'grey'"
          @click="$emit('update:view-mode', 'grid')"
          class="compact-btn-group"
        >
          <q-tooltip>網格視圖</q-tooltip>
        </q-btn>
        <q-btn
          flat
          size="sm"
          icon="view_list"
          :color="viewMode === 'list' ? 'primary' : 'grey'"
          @click="$emit('update:view-mode', 'list')"
          class="compact-btn-group"
        >
          <q-tooltip>列表視圖</q-tooltip>
        </q-btn>
      </q-btn-group>
    </div>

    <q-separator vertical />

    <!-- 操作按鈕 -->
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
        <q-tooltip>重新載入統計資料</q-tooltip>
      </q-btn>

      <q-btn
        flat
        dense
        icon="file_download"
        label="導出"
        size="sm"
        @click="showExportMenu = !showExportMenu"
        class="compact-btn"
      >
        <q-tooltip>導出統計資料</q-tooltip>
        <q-menu v-model="showExportMenu">
          <q-list dense style="min-width: 120px">
            <q-item clickable @click="$emit('export', 'pdf')">
              <q-item-section avatar>
                <q-icon name="picture_as_pdf" />
              </q-item-section>
              <q-item-section>PDF 報表</q-item-section>
            </q-item>
            <q-item clickable @click="$emit('export', 'excel')">
              <q-item-section avatar>
                <q-icon name="table_chart" />
              </q-item-section>
              <q-item-section>Excel 表格</q-item-section>
            </q-item>
            <q-item clickable @click="$emit('export', 'image')">
              <q-item-section avatar>
                <q-icon name="image" />
              </q-item-section>
              <q-item-section>圖片</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn
        flat
        dense
        icon="settings"
        label="設定"
        size="sm"
        @click="$emit('show-settings')"
        class="compact-btn"
      >
        <q-tooltip>儀表板設定</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props
interface DashboardToolbarProps {
  timeRange?: string
  showStatusChart?: boolean
  showPriorityChart?: boolean
  showTimelineChart?: boolean
  showCompletionChart?: boolean
  viewMode?: 'grid' | 'list'
}

const props = withDefaults(defineProps<DashboardToolbarProps>(), {
  timeRange: 'month',
  showStatusChart: true,
  showPriorityChart: true,
  showTimelineChart: false,
  showCompletionChart: true,
  viewMode: 'grid'
})

// Emits
const emit = defineEmits<{
  'update:time-range': [value: string]
  'update:show-status-chart': [value: boolean]
  'update:show-priority-chart': [value: boolean]
  'update:show-timeline-chart': [value: boolean]
  'update:show-completion-chart': [value: boolean]
  'update:view-mode': [mode: 'grid' | 'list']
  'refresh': []
  'export': [format: 'pdf' | 'excel' | 'image']
  'show-settings': []
}>()

// Local state
const showExportMenu = ref(false)

// Time range options
const timeRangeOptions = [
  { label: '本週', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' },
  { label: '全部時間', value: 'all' }
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

// 下拉選單樣式
:deep(.q-select) {
  .q-field__control {
    min-height: 28px;
  }
}
</style>