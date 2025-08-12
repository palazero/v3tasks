# Phase 6: AllTasks 與 ProjectView 架構統一重構

## 概述
完成了 AllTasks 與 ProjectView 的架構統一，將原本獨立的 AllTasksView.vue 頁面重構為使用統一的 ProjectView.vue，實現了程式碼重用和功能一致性。

## 主要變更

### 1. ProjectView.vue 架構擴展
**檔案**: `src/pages/ProjectView.vue`

#### 新增功能支援
- **AllTasks 模式判斷**: 新增 `isAllTasksView` 計算屬性 (`projectId === 'all'`)
- **條件式標題顯示**: AllTasks 顯示"所有任務"，專案顯示專案名稱和描述
- **條件式統計卡片**: 
  - AllTasks: 顯示全局統計 (`taskStore.taskStats`)，包含總任務數、進行中、已逾期
  - 專案: 顯示專案內統計 (`projectStats`)
- **條件式UI元素**: AllTasks 模式隱藏專案成員區域和設定按鈕

#### 資料載入邏輯優化
```typescript
async function loadData(): Promise<void> {
  if (isAllTasksView.value) {
    // AllTasks 模式：載入所有用戶任務和AllTasks視圖
    await Promise.all([
      taskStore.loadAllUserTasks(),
      viewStore.loadAllTasksViews()
    ])
  } else {
    // 專案模式：載入專案資料、任務和視圖
    await Promise.all([
      loadProjectData(),
      taskStore.loadProjectTasks(props.projectId),
      viewStore.loadProjectViews(props.projectId)
    ])
  }
}
```

### 2. 路由系統重構
**檔案**: `src/router/routes.ts`

#### 路由配置變更
```typescript
// 舊配置
{
  path: '',
  name: 'AllTasks',
  component: () => import('pages/AllTasksView.vue'),
  meta: { title: '所有任務', requiresAuth: true }
}

// 新配置
{
  path: '',
  redirect: '/projects/all'
},
{
  path: 'projects/all',
  name: 'AllTasks',
  component: () => import('pages/ProjectView.vue'),
  props: { projectId: 'all' },
  meta: { title: '所有任務', requiresAuth: true }
}
```

#### 優勢
- **SEO友好**: AllTasks 有明確的 URL (`/projects/all`)
- **語義化**: 所有專案相關頁面都在 `/projects/` 路徑下
- **向後相容**: 根路徑自動重定向到 AllTasks

### 3. 檔案移除與清理
- **刪除檔案**: `src/pages/AllTasksView.vue` (原獨立頁面)
- **程式碼重用**: 消除 800+ 行重複程式碼
- **維護簡化**: 單一視圖系統管理邏輯

### 4. 專案分組功能完善
**檔案**: `src/stores/view.ts`

#### AllTasks 預設視圖配置
```typescript
async function createDefaultAllTasksView(): Promise<void> {
  const defaultView: View = {
    viewId: nanoid(),
    projectId: 'all',
    name: '所有任務',
    type: VT.LIST,
    config: {
      groupBy: 'projectId', // 重要：預設以專案分組
      sorts: [{ fieldId: 'createdAt', direction: 'desc' }],
      visibleFields: ['title', 'statusId', 'assigneeId', 'priorityId', 'endDateTime']
    }
  }
}
```

### 5. 任務項目高度優化
**檔案**: 
- `src/components/task/TaskItem.vue`
- `src/components/task/NestedTaskItem.vue`
- `src/services/repositories/view.repository.ts`

#### CSS 高度調整
```scss
// TaskItem.vue & NestedTaskItem.vue
.task-item, .task-row {
  min-height: 32px; // 從 48px 縮減為 32px
}

// view.repository.ts
case 'table':
  return {
    viewSpecificSettings: {
      rowHeight: 32, // 從 40px 縮減為 32px
    }
  }
```

### 6. 專案分組顯示邏輯
**檔案**: `src/components/views/TaskListView.vue`

#### 分組條件判斷
```vue
<template v-if="projectId === 'all' && view.config.groupBy === 'projectId'">
  <!-- 專案分組顯示 -->
</template>
```

#### 分組任務計算
```typescript
const groupedTasks = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return new Map()
  }
  
  const grouped = new Map<string, Task[]>()
  props.tasks.forEach(task => {
    const projectId = task.projectId
    if (!grouped.has(projectId)) {
      grouped.set(projectId, [])
    }
    grouped.get(projectId)!.push(task)
  })
  
  return grouped
})
```

## 技術改進

### 1. 統一使用者體驗
- **一致介面**: AllTasks 和 ProjectView 使用相同的視圖切換系統
- **完整功能**: AllTasks 自動獲得所有視圖類型支援（List、Table、Board、Gantt、Dashboard）
- **統一操作**: 相同的任務管理和視圖配置功能

### 2. 程式架構優化
- **元件重用**: 單一 ProjectView 支援兩種模式
- **狀態管理**: 統一的資料載入和狀態更新邏輯
- **類型安全**: 完整 TypeScript 支援

### 3. 效能提升
- **記憶體優化**: 減少重複元件實例
- **載入優化**: 條件式資料載入邏輯
- **渲染效率**: 統一視圖渲染邏輯

## 功能驗證

### ✅ AllTasks 頁面功能
- **專案分組顯示**: 任務按專案自動分組，顯示專案名稱和任務數量
- **多視圖支援**: List、Table、Board、Gantt、Dashboard 視圖完整可用
- **任務操作**: 建立、編輯、刪除任務功能正常
- **視圖管理**: 建立、編輯、複製、刪除視圖功能完整
- **搜尋篩選**: 任務搜尋和高級篩選功能可用
- **統計顯示**: 總任務數、進行中、已逾期統計正確

### ✅ ProjectView 功能保持
- **專案資訊**: 專案名稱、描述、成員顯示正常
- **權限控制**: 擁有者/成員權限標籤和設定按鈕顯示正確
- **所有原有功能**: 保持完整的專案管理功能

### ✅ 導航和路由
- **URL 正確**: AllTasks 可通過 `/projects/all` 訪問
- **重定向**: 根路徑 `/` 正確重定向到 AllTasks
- **側邊欄導航**: "所有任務"連結正常工作

## 開發環境
- **開發伺服器**: http://localhost:9001/
- **啟動狀態**: ✅ 正常運行
- **錯誤狀態**: ✅ 無編譯錯誤

## 檔案變更統計
- **修改檔案**: 3 個
  - `src/pages/ProjectView.vue` (+60 行邏輯)
  - `src/router/routes.ts` (+8 行配置)
  - `src/services/repositories/view.repository.ts` (+1 行數值調整)
  - `src/components/task/TaskItem.vue` (+1 行CSS調整)
  - `src/components/task/NestedTaskItem.vue` (+1 行CSS調整)
- **刪除檔案**: 1 個
  - `src/pages/AllTasksView.vue` (-800+ 行)
- **淨程式碼減少**: ~730 行

## 後續建議

### 短期優化
1. **效能監控**: 觀察 AllTasks 載入大量任務時的效能表現
2. **使用者測試**: 收集使用者對新架構的反饋
3. **快取優化**: 考慮專案名稱快取機制優化

### 長期規劃
1. **虛擬滾動**: 當任務數量超過 1000 時實施虛擬滾動
2. **離線支援**: 考慮 PWA 和離線快取功能
3. **更多視圖**: 基於統一架構擴展更多視圖類型

## 結論
此次重構成功實現了 AllTasks 和 ProjectView 的架構統一，大幅減少了程式碼重複，提升了維護效率，同時為用戶提供了一致且完整的功能體驗。AllTasks 現在具備完整的多視圖支援和專案分組顯示功能，任務項目高度優化為 32px 提供了更緊湊的使用體驗。

---
**完成日期**: 2025-08-10  
**開發狀態**: ✅ 已完成並可正常使用  
**相關報告**: `report_phase_4_custom_fields.md`、`report_fix_05_quasar_plugins_and_draggable.md`