<template>
  <div class="task-dashboard-view q-pa-md">
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="text-center q-py-sm">
      <q-spinner-dots size="2rem" color="primary" />
      <div class="text-grey-6 q-mt-md">載入統計資料中...</div>
    </div>

    <template v-else>
      <!-- 統計卡片列 -->
      <div class="row q-col-gutter-md q-mb-sm">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="text-center">
              <div class="stat-number text-primary">{{ taskStats.total }}</div>
              <div class="stat-label">總任務數</div>
              <q-icon name="task_alt" size="2em" class="stat-icon text-primary" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="text-center">
              <div class="stat-number text-orange">{{ taskStats.byStatus.inProgress || 0 }}</div>
              <div class="stat-label">進行中</div>
              <q-icon name="schedule" size="2em" class="stat-icon text-orange" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="text-center">
              <div class="stat-number text-positive">{{ taskStats.completed }}</div>
              <div class="stat-label">已完成</div>
              <q-icon name="check_circle" size="2em" class="stat-icon text-positive" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="text-center">
              <div class="stat-number text-negative">{{ taskStats.overdue }}</div>
              <div class="stat-label">已逾期</div>
              <q-icon name="warning" size="2em" class="stat-icon text-negative" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 完成率進度條 -->
      <div class="row q-col-gutter-md q-mb-sm">
        <div class="col-12">
          <q-card class="completion-card">
            <q-card-section>
              <div class="row items-center">
                <div class="col">
                  <div class="text-h6">整體完成率</div>
                  <div class="text-subtitle2 text-grey-6">
                    {{ taskStats.completed }} / {{ taskStats.total }} 個任務已完成
                  </div>
                </div>
                <div class="col-auto">
                  <q-circular-progress
                    :value="taskStats.completionRate"
                    size="80px"
                    :thickness="0.15"
                    color="primary"
                    track-color="grey-3"
                    class="q-ma-md"
                  >
                    <div class="text-h6 text-primary">
                      {{ taskStats.completionRate.toFixed(0) }}%
                    </div>
                  </q-circular-progress>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 圖表區域 -->
      <div class="row q-col-gutter-md q-mb-sm">
        <!-- 任務狀態分佈 -->
        <div class="col-12 col-md-6">
          <q-card class="chart-card">
            <q-card-section>
              <TaskStatusChart :statistics="taskStats" height="350px" />
            </q-card-section>
          </q-card>
        </div>

        <!-- 任務優先級分佈 -->
        <div class="col-12 col-md-6">
          <q-card class="chart-card">
            <q-card-section>
              <TaskPriorityChart :statistics="taskStats" height="350px" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 任務趨勢圖 -->
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12">
          <q-card class="chart-card" flat bordered>
            <q-card-section class="q-pa-sm">
              <TaskTimelineChart :timeline="timelineData" height="240px" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 專案完成率 (如果有多個專案) -->
      <div v-if="projectStats.total > 1" class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12">
          <q-card class="chart-card" flat bordered>
            <q-card-section class="q-pa-sm">
              <ProjectCompletionChart :statistics="projectStats" height="300px" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 詳細信息卡片 -->
      <div class="row q-col-gutter-sm">
        <!-- 截止日期提醒 -->
        <div class="col-12 col-md-6">
          <q-card class="info-card">
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="schedule" class="q-mr-sm" />
                截止日期提醒
              </div>

              <div class="reminder-list">
                <div class="reminder-item q-mb-sm">
                  <q-badge color="negative" class="q-mr-sm">
                    {{ taskStats.overdue }}
                  </q-badge>
                  <span class="text-negative">已逾期任務</span>
                </div>

                <div class="reminder-item q-mb-sm">
                  <q-badge color="warning" class="q-mr-sm">
                    {{ taskStats.dueToday }}
                  </q-badge>
                  <span class="text-warning">今天到期</span>
                </div>

                <div class="reminder-item">
                  <q-badge color="info" class="q-mr-sm">
                    {{ taskStats.dueThisWeek }}
                  </q-badge>
                  <span class="text-info">本週到期</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- 工作負載分析 -->
        <div class="col-12 col-md-6">
          <q-card class="info-card">
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="bar_chart" class="q-mr-sm" />
                工作負載分析
              </div>

              <div class="workload-info">
                <div class="workload-item">
                  <div class="text-caption text-grey-6">緊急任務</div>
                  <div class="text-h6 text-red">{{ taskStats.byPriority.urgent || 0 }}</div>
                </div>

                <div class="workload-item">
                  <div class="text-caption text-grey-6">高優先級</div>
                  <div class="text-h6 text-orange">{{ taskStats.byPriority.high || 0 }}</div>
                </div>

                <div class="workload-item">
                  <div class="text-caption text-grey-6">中優先級</div>
                  <div class="text-h6 text-yellow-8">{{ taskStats.byPriority.medium || 0 }}</div>
                </div>

                <div class="workload-item">
                  <div class="text-caption text-grey-6">低優先級</div>
                  <div class="text-h6 text-green">{{ taskStats.byPriority.low || 0 }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 刷新按鈕 -->
      <div class="text-center q-mt-xl">
        <q-btn
          flat
          round
          icon="refresh"
          @click="refreshData"
          :loading="isRefreshing"
        >
          <q-tooltip>刷新統計資料</q-tooltip>
        </q-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import TaskStatusChart from '@/components/ui/charts/TaskStatusChart.vue'
import TaskPriorityChart from '@/components/ui/charts/TaskPriorityChart.vue'
import TaskTimelineChart from '@/components/ui/charts/TaskTimelineChart.vue'
import ProjectCompletionChart from '@/components/ui/charts/ProjectCompletionChart.vue'
import { statisticsService } from '@/services/statisticsService'
import type { TaskStatistics, ProjectStatistics, TimelineData } from '@/services/statisticsService'

interface Props {
  projectId?: string
}

const props = withDefaults(defineProps<Props>(), {
  projectId: 'all'
})

const $q = useQuasar()

// 狀態
const isLoading = ref(true)
const isRefreshing = ref(false)
const taskStats = ref<TaskStatistics>({
  total: 0,
  byStatus: { todo: 0, 'in-progress': 0, done: 0, archived: 0 },
  byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
  overdue: 0,
  dueToday: 0,
  dueThisWeek: 0,
  completed: 0,
  completionRate: 0
})

const projectStats = ref<ProjectStatistics>({
  total: 0,
  active: 0,
  archived: 0,
  tasksPerProject: [],
  completionRates: []
})

const timelineData = ref<TimelineData[]>([])

// 方法
async function loadStatistics(): Promise<void> {
  try {
    const [taskStatsData, projectStatsData, timelineStats] = await Promise.all([
      statisticsService.getTaskStatistics(props.projectId),
      statisticsService.getProjectStatistics(),
      statisticsService.getTimelineData(props.projectId)
    ])

    taskStats.value = taskStatsData
    projectStats.value = projectStatsData
    timelineData.value = timelineStats
  } catch (error) {
    console.error('Failed to load statistics:', error)
    $q.notify({
      type: 'negative',
      message: '載入統計資料失敗',
      position: 'top'
    })
  }
}

async function refreshData(): Promise<void> {
  isRefreshing.value = true
  try {
    await loadStatistics()
    $q.notify({
      type: 'positive',
      message: '統計資料已更新',
      position: 'top'
    })
  } finally {
    isRefreshing.value = false
  }
}

// 初始化
onMounted(async () => {
  await loadStatistics()
  isLoading.value = false
})

// 監聽 projectId 變化
import { watch } from 'vue'
watch(() => props.projectId, async () => {
  isLoading.value = true
  await loadStatistics()
  isLoading.value = false
})
</script>

<style scoped lang="scss">
.task-dashboard-view {
  max-width: 1200px;
  margin: 0 auto;

  .stat-card {
    height: 80px;
    position: relative;
    overflow: hidden;
    border: 1px solid #e1e5e9;
    background: white;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.125rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.15;
    }
  }

  .completion-card {
    border: 1px solid #e1e5e9;
    background: white;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
    }
  }

  .chart-card {
    border: 1px solid #e1e5e9;
    background: white;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
    }
  }

  .info-card {
    border: 1px solid #e1e5e9;
    background: white;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
    }

    .reminder-list {
      .reminder-item {
        display: flex;
        align-items: center;
        padding: 0.125rem 0;
      }
    }

    .workload-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;

      .workload-item {
        text-align: center;
        padding: 0.5rem;
        border-radius: 6px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        transition: all 0.2s ease;

        &:hover {
          background: #e9ecef;
          transform: translateY(-1px);
        }
      }
    }
  }
}

@media (max-width: 900px) {
  .task-dashboard-view {
    .stat-card {
      height: 70px;

      .stat-number {
        font-size: 1.5rem;
      }

      .stat-label {
        font-size: 0.7rem;
      }

      .stat-icon {
        right: 0.5rem;
      }
    }
  }
}

@media (max-width: 600px) {
  .task-dashboard-view {
    .stat-card {
      height: 65px;

      .stat-number {
        font-size: 1.4rem;
      }

      .stat-label {
        font-size: 0.65rem;
      }

      .stat-icon {
        right: 0.4rem;
      }
    }

    .workload-info {
      grid-template-columns: 1fr !important;
      gap: 0.5rem;
    }
  }
}
</style>
