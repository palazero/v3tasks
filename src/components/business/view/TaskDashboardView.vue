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

      <!-- 自訂報表區域 -->
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12">
          <q-card class="custom-reports-section">
            <q-card-section>
              <div class="section-header">
                <div class="section-title">
                  <q-icon name="analytics" class="q-mr-sm" />
                  自訂報表
                </div>
                <div class="section-actions">
                  <q-btn
                    flat
                    dense
                    icon="add"
                    @click="openReportBuilder"
                  >
                    <q-tooltip>建立報表</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    :icon="showCustomReports ? 'expand_less' : 'expand_more'"
                    @click="toggleCustomReports"
                  >
                    <q-tooltip>{{ showCustomReports ? '收合' : '展開' }}</q-tooltip>
                  </q-btn>
                </div>
              </div>
              
              <q-slide-transition>
                <div v-show="showCustomReports" class="custom-reports-content">
                  <!-- 無自訂報表時的狀態 -->
                  <div v-if="!hasReports" class="no-reports-state">
                    <div class="no-reports-content">
                      <q-icon name="assessment" size="3rem" color="grey-5" />
                      <div class="no-reports-text">尚未建立任何自訂報表</div>
                      <q-btn
                        color="primary"
                        @click="openReportBuilder"
                      >
                        建立第一個報表
                      </q-btn>
                    </div>
                  </div>
                  
                  <!-- 自訂報表網格 -->
                  <div v-else class="reports-grid">
                    <div 
                      v-for="report in customReports" 
                      :key="report.id"
                      class="report-item"
                    >
                      <q-card flat bordered>
                        <q-card-section class="report-header">
                          <div class="report-title">{{ report.name }}</div>
                          <q-btn
                            flat
                            dense
                            round
                            icon="more_vert"
                            @click.stop
                          >
                            <q-menu>
                              <q-list>
                                <q-item clickable @click="editReport(report)">
                                  <q-item-section avatar>
                                    <q-icon name="edit" />
                                  </q-item-section>
                                  <q-item-section>編輯</q-item-section>
                                </q-item>
                                <q-item clickable @click="handleDuplicateReport(report)">
                                  <q-item-section avatar>
                                    <q-icon name="content_copy" />
                                  </q-item-section>
                                  <q-item-section>複製</q-item-section>
                                </q-item>
                                <q-separator />
                                <q-item clickable @click="handleDeleteReport(report)" class="text-negative">
                                  <q-item-section avatar>
                                    <q-icon name="delete" color="negative" />
                                  </q-item-section>
                                  <q-item-section>刪除</q-item-section>
                                </q-item>
                              </q-list>
                            </q-menu>
                          </q-btn>
                        </q-card-section>
                        
                        <q-card-section class="report-content">
                          <ReportRenderer
                            :config="report"
                            :auto-load="true"
                            :show-header="false"
                            :show-filters="false"
                            :show-summary="false"
                            chart-height="180px"
                          />
                        </q-card-section>
                      </q-card>
                    </div>
                  </div>
                </div>
              </q-slide-transition>
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
    
    <!-- 報表建構器對話框 -->
    <q-dialog 
      v-model="showReportBuilder" 
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <ReportBuilder
        :project-id="projectId"
        @close="showReportBuilder = false"
        @report-created="handleReportSaved"
      />
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import TaskStatusChart from '@/components/ui/charts/TaskStatusChart.vue'
import TaskPriorityChart from '@/components/ui/charts/TaskPriorityChart.vue'
import TaskTimelineChart from '@/components/ui/charts/TaskTimelineChart.vue'
import ProjectCompletionChart from '@/components/ui/charts/ProjectCompletionChart.vue'
import ReportBuilder from '@/components/reports/ReportBuilder.vue'
import ReportRenderer from '@/components/reports/ReportRenderer.vue'
import { statisticsService } from '@/services/domain/statistics.service'
import type { TaskStatistics, ProjectStatistics, TimelineData } from '@/services/domain/statistics.service'
import type { ReportConfig } from '@/types/report'
import { useReportManager } from '@/composables/useReportManager'

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

// 自訂報表相關狀態
const showCustomReports = ref(false)
const showReportBuilder = ref(false)

// 使用新的報表管理器
const {
  reports: customReports,
  loading: reportsLoading,
  error: reportsError,
  hasReports,
  reportCount,
  createReport,
  updateReport,
  deleteReport,
  duplicateReport,
  refreshReports
} = useReportManager({
  projectId: props.projectId,
  autoLoad: false // 手動控制載入時機
})

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

async function loadCustomReports(): Promise<void> {
  try {
    await refreshReports()
  } catch (error) {
    console.error('載入自訂報表失敗:', error)
  }
}

function toggleCustomReports(): void {
  showCustomReports.value = !showCustomReports.value
  if (showCustomReports.value && !hasReports.value) {
    void loadCustomReports()
  }
}

function openReportBuilder(): void {
  showReportBuilder.value = true
}

async function handleReportSaved(report: ReportConfig): Promise<void> {
  // 新架構中報表已通過 ReportManager 自動處理
  // 這裡只需要確保 UI 狀態更新
  
  // 確保自訂報表區域展開以顯示新報表
  if (!showCustomReports.value) {
    showCustomReports.value = true
  }
  
  // 重新載入報表列表以確保同步
  await loadCustomReports()
}

async function handleReportDeleted(reportId: string): Promise<void> {
  // 新架構中刪除通過 ReportManager 處理
  // 這裡只需要調用服務層方法
  try {
    await deleteReport(reportId)
  } catch (error) {
    console.error('刪除報表失敗:', error)
  }
}

function editReport(report: ReportConfig): void {
  // 這裡應該打開編輯對話框
  // 由於 ReportBuilder 本身就有編輯功能，我們可以直接使用
  // TODO: 傳遞報表資料給 ReportBuilder 進行編輯
  showReportBuilder.value = true
}

async function handleDuplicateReport(report: ReportConfig): Promise<void> {
  try {
    await duplicateReport(report.id, `${report.name} (副本)`)
  } catch (error) {
    console.error('複製報表失敗:', error)
  }
}

function handleDeleteReport(report: ReportConfig): void {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除報表「${report.name}」嗎？此操作無法撤銷。`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await handleReportDeleted(report.id)
  })
}

// 初始化
onMounted(async () => {
  await loadStatistics()
  await loadCustomReports()
  isLoading.value = false
})

// 監聽 projectId 變化
import { watch } from 'vue'
watch(() => props.projectId, async () => {
  isLoading.value = true
  await loadStatistics()
  await loadCustomReports()
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
  
  // 自訂報表區域樣式 - 緊湊版本
  .custom-reports-section {
    border: 1px solid #e1e5e9;
    background: white;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      padding: 0.75rem 1rem 0 1rem;

      .section-title {
        display: flex;
        align-items: center;
        font-size: 1rem;
        font-weight: 600;
        color: #333;
      }

      .section-actions {
        display: flex;
        gap: 0.125rem;
      }
    }

    .custom-reports-content {
      .no-reports-state {
        text-align: center;
        padding: 1.5rem 1rem;

        .no-reports-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;

          .no-reports-text {
            color: #666;
            font-size: 0.8rem;
          }
        }
      }

      .reports-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 0.75rem;
        padding: 0 1rem 1rem 1rem;

        .report-item {
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0.75rem;
            background: #f8f9fa;
            border-bottom: 1px solid #e1e5e9;
            min-height: 32px;

            .report-title {
              font-weight: 500;
              color: #333;
              font-size: 0.875rem;
              line-height: 1.2;
            }
          }

          .report-content {
            padding: 0.75rem;
            background: white;
          }
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
