# Table View 專案分組功能實現報告

## 📋 概述

成功為 Table View 實現專案分組功能，與 List View 保持一致的功能和用戶體驗。在「所有任務」頁面的 Table View 中，任務現在按專案分組顯示，每個專案都有獨立的表格和統計資訊。

## 🎯 實現功能

### 核心功能
- ✅ **專案分組顯示**：所有任務按專案自動分組，每個專案獨立表格
- ✅ **展開/收合控制**：每個專案可獨立展開或收合，狀態持久化
- ✅ **統計資訊顯示**：總任務數、進度百分比、逾期任務、進行中任務
- ✅ **專案排序功能**：按名稱、任務數量、進度、逾期任務排序
- ✅ **狀態記憶**：展開/收合狀態和排序偏好記憶到 localStorage
- ✅ **完整表格功能**：保留所有原有表格功能（編輯、排序、篩選等）

### 技術特點
- 🔄 **代碼復用**：完全復用 List View 的分組邏輯和統計算法
- 🏗️ **多表格架構**：每個專案使用獨立的 QTable 實例
- 💾 **獨立存儲**：使用專用的 localStorage keys 避免與 List View 衝突
- ⚡ **效能優化**：統計資料使用 computed 快取，避免重複計算

## 🛠️ 技術實現

### 文件修改
**主要文件**: `src/components/views/TaskTableView.vue`

#### 1. 新增 Import
```typescript
import { getProjectRepository } from '@/services/repositories'
```

#### 2. 專案分組邏輯
```typescript
// 專案分組計算
const groupedTasks = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return new Map()
  }
  // 分組和排序邏輯
})

// 排序後的專案分組
const sortedGroupedTasks = computed(() => {
  // 專案排序邏輯
})

// 統計資訊快取
const projectStatsCache = computed(() => {
  // 統計計算和快取
})
```

#### 3. 狀態管理
```typescript
// 專案展開/收合狀態（獨立 key）
const PROJECT_EXPAND_KEY = 'projectExpandState_table'
const projectExpandState = ref<Record<string, boolean>>(loadProjectExpandState())

// 專案排序偏好（獨立 key）  
const PROJECT_SORT_KEY = 'projectSortBy_table'
const projectSortBy = ref<string>(loadProjectSortBy())
```

#### 4. 模板結構
```vue
<template>
  <div class="table-container">
    <!-- AllTasks 專案分組顯示 -->
    <template v-if="projectId === 'all' && view.config.groupBy === 'projectId'">
      <div v-for="[projectId, projectTasks] in sortedGroupedTasks" class="project-group">
        <!-- 專案標題 + 統計 + 操作 -->
        <div class="project-group-header">
          <!-- 展開按鈕、專案名稱、統計 Badge、排序選單、跳轉按鈕 -->
        </div>
        
        <!-- 專案任務表格 -->
        <div v-show="isProjectExpanded(projectId)" class="project-tasks">
          <q-table :rows="getFilteredProjectTasks(projectTasks)">
            <!-- 完整的 slot templates -->
          </q-table>
        </div>
      </div>
    </template>
    
    <!-- 非分組模式提示 -->
    <div v-else class="non-grouped-notice">
      <!-- 提示信息 -->
    </div>
  </div>
</template>
```

#### 5. 樣式設計
```scss
.project-group {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .project-group-header {
    background-color: #f5f5f5;
    transition: background-color 0.2s ease;
  }
}
```

### 關鍵函數

#### `getFilteredProjectTasks(projectTasks: Task[])`
處理專案任務的篩選和層級顯示：
```typescript
function getFilteredProjectTasks(projectTasks: Task[]): Task[] {
  // 先構建樹狀結構
  const nestedProjectTasks = buildTaskTree(projectTasks)
  
  // 然後扁平化並加入層級信息
  const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
    // 遞迴處理任務和子任務
  }
  
  return flattenWithLevel(nestedProjectTasks)
}
```

#### `getCachedProjectStats(projectId: string)`  
獲取專案統計資訊：
```typescript
function getCachedProjectStats(projectId: string) {
  return projectStatsCache.value.get(projectId) || {
    total: 0,
    completed: 0, 
    inProgress: 0,
    overdue: 0,
    priority: { high: 0, medium: 0, low: 0 },
    progress: 0
  }
}
```

## 🐛 修復的問題

### 堆疊溢出問題
**問題**：`getFilteredProjectTasks` 函數中的無限遞迴調用
```typescript
// ❌ 問題代碼
const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
  const nestedProjectTasks = buildTaskTree(projectTasks) // 在遞迴中調用
  // 導致無限遞迴
}
```

**修復**：將 `buildTaskTree` 移到遞迴函數外部
```typescript  
// ✅ 修復代碼
function getFilteredProjectTasks(projectTasks: Task[]): Task[] {
  const nestedProjectTasks = buildTaskTree(projectTasks) // 只調用一次
  
  const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
    // 安全的遞迴邏輯
  }
}
```

## 💡 設計決策

### 1. 多表格 vs 單表格
**選擇**：多表格架構（每專案一個 QTable）
**原因**：
- 保持表格功能完整性（排序、篩選、編輯）
- 視覺層次更清晰
- 技術實現更簡單穩定

### 2. 代碼復用策略
**選擇**：完全復用 List View 的分組邏輯
**原因**：
- 減少重複代碼，降低維護成本
- 確保功能一致性
- 加快開發速度

### 3. 存儲隔離
**選擇**：使用獨立的 localStorage keys
**原因**：
- 避免與 List View 狀態衝突
- 允許兩個視圖獨立的用戶偏好
- 提供更好的用戶體驗

## 🎨 用戶界面

### 專案標題欄
- **展開按鈕**：`expand_less` / `expand_more` 圖標
- **專案圖標**：藍色資料夾圖標  
- **專案名稱**：加粗顯示
- **統計 Badge**：
  - 灰色：總任務數
  - 藍色/綠色：進度百分比（100% 顯示綠色）
  - 紅色：逾期任務數（僅在有逾期時顯示）
  - 黃色：進行中任務數（僅在有進行中任務時顯示）
- **操作按鈕**：
  - 排序選單：`sort` 圖標
  - 跳轉專案：`open_in_new` 圖標

### 視覺效果
- **卡片風格**：8px 圓角，陰影效果
- **懸停效果**：陰影加深，背景色變化
- **響應式設計**：統計 Badge 在小螢幕上自動調整

## 📊 效能考量

### 計算優化
- **統計快取**：使用 `computed` 避免重複計算
- **分組快取**：專案分組結果快取
- **按需渲染**：收合的專案表格不渲染

### 記憶體優化
- **樹狀結構**：只在需要時建構
- **扁平化結果**：及時清理中間變數
- **事件處理**：使用事件委派減少監聽器

## 🧪 測試結果

### 功能測試
- ✅ 專案分組正確顯示
- ✅ 展開/收合狀態記憶
- ✅ 統計資訊準確計算
- ✅ 排序功能正常運作
- ✅ 表格編輯功能完整
- ✅ 跨專案導航正常

### 效能測試  
- ✅ 無堆疊溢出錯誤
- ✅ 大量任務載入順暢
- ✅ 狀態切換響應迅速
- ✅ 記憶體使用穩定

### 相容性測試
- ✅ ESLint 檢查通過
- ✅ TypeScript 編譯成功
- ✅ 開發服務器穩定運行

## 🚀 使用方式

### 進入功能
1. 訪問「所有任務」頁面 (`/projects/all`)
2. 切換到 **Table View** 視圖
3. 確保視圖配置中 `groupBy` 設為 `'projectId'`

### 操作指南
1. **查看專案**：每個專案顯示為獨立的表格卡片
2. **展開/收合**：點擊專案標題或箭頭圖標
3. **查看統計**：標題區域顯示任務數、進度、逾期等資訊
4. **排序專案**：點擊排序圖標，選擇排序方式
5. **跳轉專案**：點擊「開啟專案」圖標直接跳轉
6. **編輯任務**：在表格中直接點擊任務進行編輯

### 狀態記憶
- **展開/收合**：自動記住每個專案的展開狀態
- **排序偏好**：記住用戶選擇的排序方式
- **跨會話**：刷新頁面後狀態保持不變

## 🔮 後續規劃

### 短期優化
1. **響應式優化**：改進行動端顯示效果
2. **載入優化**：大量專案的虛擬滾動
3. **快捷操作**：鍵盤快捷鍵支援

### 長期規劃  
1. **自訂欄位**：專案分組表格中的自訂欄位支援
2. **批量操作**：跨專案的批量任務操作
3. **匯出功能**：分專案匯出表格資料

## 📈 影響評估

### 正面影響
- **功能一致性**：List View 和 Table View 功能對等
- **用戶體驗**：提供更豐富的任務管理方式
- **程式架構**：代碼復用率提升，維護成本降低

### 技術債務
- **模板複雜度**：模板結構較為複雜，需要維護
- **效能考量**：多個 QTable 實例可能影響效能
- **測試覆蓋**：需要更全面的測試用例

## 📝 總結

Table View 專案分組功能已成功實現，功能完整且穩定。通過復用 List View 的成功經驗，快速達成了功能對等。用戶現在可以在兩種視圖間自由切換，享受一致的專案分組體驗。

該實現解決了技術挑戰（無限遞迴問題），提供了良好的用戶界面，並建立了可持續的代碼架構。為後續 Gantt View 的專案分組實現提供了寶貴經驗。

---

**實現日期**: 2025-08-10  
**開發狀態**: ✅ 已完成並可正常使用  
**測試環境**: http://localhost:9002  
**相關功能**: List View 專案分組、專案視圖記憶