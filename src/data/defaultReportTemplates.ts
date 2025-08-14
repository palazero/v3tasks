/**
 * 預設報表範本配置
 */

import type { ReportTemplate } from '@/types/report'

export const DEFAULT_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'template-assignee-bar',
    name: '任務負責人統計（長條圖）',
    description: '展示各團隊成員的任務分配情況，幫助識別工作量不平衡的情況。適合用於資源分配和工作量平衡分析。',
    category: 'task-analysis',
    config: {
      name: '任務負責人統計',
      chartType: 'bar',
      dimension: 'assigneeId',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'primary',
        showTitle: true,
        showLegend: true,
        showLabels: true,
        showValues: false,
        yAxisLabel: '任務數量',
        xAxisLabel: '負責人',
        height: '400px',
        animationEnabled: true,
        animationDuration: 750
      }
    },
    tags: ['任務', '負責人', '工作量', '人員分配'],
    isBuiltIn: true,
    usageCount: 156
  },
  
  {
    id: 'template-status-pie',
    name: '任務狀態分佈（圓餅圖）',
    description: '以圓餅圖顯示不同狀態任務的比例分佈，快速了解專案整體進度和待辦任務比重。',
    category: 'task-analysis',
    config: {
      name: '任務狀態分佈',
      chartType: 'pie',
      dimension: 'statusId',
      aggregation: 'percentage',
      chartOptions: {
        colorScheme: 'default',
        showTitle: true,
        showLegend: true,
        showLabels: true,
        showValues: true,
        height: '400px',
        animationEnabled: true
      }
    },
    tags: ['狀態', '進度', '分佈', '比例'],
    isBuiltIn: true,
    usageCount: 142
  },
  
  {
    id: 'template-priority-doughnut',
    name: '任務優先級分析（甜甜圈圖）',
    description: '分析不同優先級任務的分佈情況，幫助團隊專注於高優先級工作。',
    category: 'task-analysis',
    config: {
      name: '任務優先級分析',
      chartType: 'doughnut',
      dimension: 'priorityId',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'warning',
        showTitle: true,
        showLegend: true,
        showLabels: true,
        showValues: true,
        height: '350px'
      }
    },
    tags: ['優先級', '重要性', '工作安排'],
    isBuiltIn: true,
    usageCount: 89
  },
  
  {
    id: 'template-project-completion',
    name: '專案完成率概覽（水平長條圖）',
    description: '展示各專案的完成率和進度情況，幫助管理者掌握多專案進度。',
    category: 'project-overview',
    config: {
      name: '專案完成率概覽',
      chartType: 'horizontalBar',
      dimension: 'projectId',
      aggregation: 'percentage',
      chartOptions: {
        colorScheme: 'success',
        showTitle: true,
        showLegend: false,
        showValues: true,
        xAxisLabel: '完成率 (%)',
        yAxisLabel: '專案',
        height: '500px',
        showGrid: true
      }
    },
    tags: ['專案', '完成率', '進度', '管理'],
    isBuiltIn: true,
    usageCount: 118
  },
  
  {
    id: 'template-monthly-trend',
    name: '月度任務建立趨勢（線圖）',
    description: '顯示各月份任務建立的趨勢變化，幫助識別工作量的季節性變化和團隊產能。',
    category: 'time-tracking',
    config: {
      name: '月度任務建立趨勢',
      chartType: 'line',
      dimension: 'createdMonth',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'primary',
        showTitle: true,
        showLegend: false,
        showGrid: true,
        xAxisLabel: '月份',
        yAxisLabel: '新建任務數',
        height: '350px',
        animationEnabled: true
      }
    },
    tags: ['時間', '趨勢', '統計', '月度分析'],
    isBuiltIn: true,
    usageCount: 76
  },
  
  {
    id: 'template-team-workload',
    name: '團隊工作負載分析（堆疊長條圖）',
    description: '綜合展示團隊成員按優先級分組的工作負載，幫助平衡團隊工作分配。',
    category: 'team-performance',
    config: {
      name: '團隊工作負載分析',
      chartType: 'stackedBar',
      dimension: 'assigneeId',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'secondary',
        showTitle: true,
        showLegend: true,
        showValues: false,
        xAxisLabel: '團隊成員',
        yAxisLabel: '任務數量',
        height: '400px',
        showGrid: true
      }
    },
    tags: ['團隊', '工作負載', '平衡', '績效'],
    isBuiltIn: true,
    usageCount: 94
  },
  
  {
    id: 'template-due-date-analysis',
    name: '到期日期分析（水平長條圖）',
    description: '分析任務按到期月份的分佈，幫助提前規劃和預防截止日期衝突。',
    category: 'time-tracking',
    config: {
      name: '到期日期分析',
      chartType: 'horizontalBar',
      dimension: 'dueMonth',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'error',
        showTitle: true,
        showLegend: false,
        showValues: true,
        xAxisLabel: '任務數量',
        yAxisLabel: '到期月份',
        height: '450px'
      }
    },
    tags: ['截止日期', '時程規劃', '風險管理'],
    isBuiltIn: true,
    usageCount: 63
  },
  
  {
    id: 'template-project-task-distribution',
    name: '專案任務分佈（甜甜圈圖）',
    description: '展示各專案的任務數量分佈，幫助了解專案規模和資源需求。',
    category: 'project-overview',
    config: {
      name: '專案任務分佈',
      chartType: 'doughnut',
      dimension: 'projectId',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'default',
        showTitle: true,
        showLegend: true,
        showValues: true,
        height: '400px'
      }
    },
    tags: ['專案', '分佈', '規模', '資源'],
    isBuiltIn: true,
    usageCount: 107
  },
  
  {
    id: 'template-priority-by-assignee',
    name: '負責人優先級分佈（堆疊長條圖）',
    description: '展示每個負責人處理的不同優先級任務分佈，幫助評估工作複雜度和壓力。',
    category: 'team-performance',
    config: {
      name: '負責人優先級分佈',
      chartType: 'stackedBar',
      dimension: 'assigneeId',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'warning',
        showTitle: true,
        showLegend: true,
        showValues: false,
        xAxisLabel: '負責人',
        yAxisLabel: '任務數量',
        height: '400px'
      }
    },
    tags: ['負責人', '優先級', '工作複雜度', '壓力分析'],
    isBuiltIn: true,
    usageCount: 82
  },
  
  {
    id: 'template-completion-trend',
    name: '任務完成趨勢（區域圖）',
    description: '顯示任務完成數量的時間趨勢，幫助評估團隊生產力和效率變化。',
    category: 'team-performance',
    config: {
      name: '任務完成趨勢',
      chartType: 'area',
      dimension: 'createdMonth',
      aggregation: 'count',
      chartOptions: {
        colorScheme: 'success',
        showTitle: true,
        showLegend: false,
        showGrid: true,
        xAxisLabel: '月份',
        yAxisLabel: '完成任務數',
        height: '350px',
        animationEnabled: true
      }
    },
    tags: ['完成', '趨勢', '生產力', '效率'],
    isBuiltIn: true,
    usageCount: 58
  }
]

/**
 * 根據分類篩選範本
 */
export function getTemplatesByCategory(category: string): ReportTemplate[] {
  return DEFAULT_REPORT_TEMPLATES.filter(template => template.category === category)
}

/**
 * 獲取熱門範本（使用次數前 N 個）
 */
export function getPopularTemplates(count: number = 5): ReportTemplate[] {
  return [...DEFAULT_REPORT_TEMPLATES]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, count)
}

/**
 * 搜尋範本
 */
export function searchTemplates(query: string): ReportTemplate[] {
  const lowerQuery = query.toLowerCase()
  return DEFAULT_REPORT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * 獲取所有分類
 */
export function getAllCategories(): Array<{ label: string; value: string; count: number }> {
  const categories = new Map<string, number>()
  
  DEFAULT_REPORT_TEMPLATES.forEach(template => {
    const current = categories.get(template.category) || 0
    categories.set(template.category, current + 1)
  })
  
  const categoryLabels: Record<string, string> = {
    'task-analysis': '任務分析',
    'team-performance': '團隊績效',
    'project-overview': '專案總覽',
    'time-tracking': '時間追蹤'
  }
  
  return Array.from(categories.entries()).map(([value, count]) => ({
    label: categoryLabels[value] || value,
    value,
    count
  }))
}