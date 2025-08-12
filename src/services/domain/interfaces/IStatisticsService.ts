/**
 * 統計領域服務介面
 * 定義統計資料計算的核心業務操作
 */

export interface TaskStatistics {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  overdue: number
  dueToday: number
  dueThisWeek: number
  completed: number
  completionRate: number
}

export interface ProjectStatistics {
  total: number
  active: number
  completed: number
  archived: number
  completionRate: number
  averageTasksPerProject: number
  totalMembers: number
}

export interface TimelineData {
  date: string
  completed: number
  created: number
  overdue: number
}

export interface IStatisticsService {
  /**
   * 取得任務統計資料
   */
  getTaskStatistics(projectId?: string): Promise<TaskStatistics>

  /**
   * 取得專案統計資料
   */
  getProjectStatistics(userId?: string): Promise<ProjectStatistics>

  /**
   * 取得時間軸統計資料
   */
  getTimelineStatistics(projectId?: string, days?: number): Promise<TimelineData[]>

  /**
   * 取得用戶工作負載統計
   */
  getUserWorkloadStatistics(userId: string): Promise<{
    assignedTasks: number
    completedThisWeek: number
    overdueTasksCount: number
    averageCompletionTime: number
  }>

  /**
   * 取得團隊績效統計
   */
  getTeamPerformanceStatistics(projectId: string): Promise<{
    totalMembers: number
    activeMembers: number
    completionRates: Record<string, number>
    taskDistribution: Record<string, number>
  }>

  /**
   * 取得專案健康度指標
   */
  getProjectHealthMetrics(projectId: string): Promise<{
    onTrackPercentage: number
    riskLevel: 'low' | 'medium' | 'high'
    overduePercentage: number
    velocityTrend: 'increasing' | 'stable' | 'decreasing'
  }>
}