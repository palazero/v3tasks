# 專案任務管理系統 - 開發記憶文件

## 專案概述
這是一個基於 Vue 3 + Quasar 2 的現代化專案任務管理系統，支援多視圖、巢狀任務、拖拉排序等功能。

## 核心技術棧
- **前端框架**: Vue 3.4.18 + Quasar 2.16.0
- **狀態管理**: Pinia 3.0.1
- **語言**: TypeScript 5.5.3
- **拖拉套件**: vue-draggable-plus
- **甘特圖**: @infectoone/vue-ganttastic
- **資料儲存**: IndexedDB (使用 Dexie.js)

## 重要決策記錄

### 1. 模擬用戶系統
- **決策**: 不實作傳統登入系統，改用右上角下拉選單切換模擬用戶
- **原因**: 簡化開發，方便測試不同角色權限
- **實作**: 預設5個模擬用戶（Admin、Owner、Member A/B、User）

### 2. 任務巢狀結構
- **決策**: 支援多層巢狀任務，最多3層
- **原因**: 平衡功能性與複雜度
- **實作**: 扁平化儲存 + 計算屬性組裝樹狀結構

### 3. 資料儲存方案
- **決策**: 使用 IndexedDB 替代 localStorage
- **原因**: 更適合大量結構化資料，支援 1000+ 任務
- **實作**: 採用 Dexie.js 簡化 API

## 架構設計

### 分層架構
```
展示層 (Views/Components)
    ↓
應用層 (Composables/Hooks)
    ↓
領域層 (Stores/Business Logic)
    ↓
資料層 (Services/API/Storage)
```

### Store 結構
```
stores/
├── core/        # 核心狀態
├── domain/      # 業務邏輯
└── ui/          # UI 狀態
```

## 開發進度追蹤

### 已完成
- [x] 需求分析與文件撰寫 (req.md)
- [x] 系統架構評估
- [x] 技術選型決策
- [x] **Phase 0: 基礎準備** ✅ (2025-01-09)
  - [x] 安裝核心依賴套件
  - [x] 建立 TypeScript 類型定義 (376 行，零 any 類型)
  - [x] 設定 IndexedDB 資料層 (Dexie + Repository 模式)
  - [x] 實作模擬用戶系統 (5 個用戶，完整權限控制)
  - [x] 更新主佈局與用戶切換功能
  - [x] 設定 ESLint 嚴格類型檢查
  - [x] 完成階段報告: `report_phase_0_foundation.md`

- [x] **Phase 1: 核心功能** ✅ (2025-01-09)
  - [x] 建立路由系統與基礎頁面 (AllTasks, ProjectView)
  - [x] 實作任務 CRUD 基本功能 (TaskDialog, TaskItem 完整功能)
  - [x] 建立視圖管理系統 (Tab 架構，列表視圖與儀表板視圖)
  - [x] 完成任務分組與搜尋功能 (AllTasks 按專案分組)
  - [x] 建立佔位符元件 (TableView, BoardView, GanttView)
  - [x] 自訂日期時間選擇器 (Quasar v2 相容)
  - [x] 完成階段報告: `report_phase_1_core.md`

- [x] **Phase 2: 進階任務功能** ✅ (2025-01-09)
  - [x] 實作巢狀任務結構 (NestedTaskItem.vue - 185 行遞迴組件)
  - [x] 整合拖拉排序功能 (DraggableTaskList.vue - vue-draggable-plus)
  - [x] 實作任務層級管理 (縮排/升級操作)
  - [x] 建立任務依賴關係系統 (循環檢測、狀態管理)
  - [x] 擴展 TaskStore 支援巢狀操作 (新增 9 個方法)
  - [x] 建立 useNestedTasks 組合式函數 (343 行業務邏輯)
  - [x] 建立 useTaskDependencies 組合式函數 (338 行依賴管理)
  - [x] 更新 TaskListView 整合新功能
  - [x] 完成階段報告: `report_phase_2_advanced_tasks.md`

- [x] **Phase 3: 多視圖系統** ✅ (2025-01-09)
  - [x] 完善看板視圖 (BoardView) - 實作任務卡片拖拉
  - [x] 增強表格視圖 (TableView) - 行內編輯與樹狀顯示
  - [x] 實作甘特圖視圖 (GanttView) - 時間軸與依賴視覺化
  - [x] 完善視圖配置系統 - 自訂欄位與篩選
  - [x] 建立 ViewConfiguration 元件
  - [x] 實作欄位顯示/隱藏功能
  - [x] 新增篩選器預設功能
  - [x] 持久化視圖配置到 IndexedDB

### 準備開始
- [ ] Phase 4: 自訂欄位
- [ ] Phase 5: 甘特圖與儀表板

## 關鍵檔案路徑

### 需求與設計
- `/req.md` - 完整需求規格書
- `/CLAUDE.md` - 本檔案，開發記憶
- `/report_phase_0_foundation.md` - Phase 0 完成報告
- `/report_phase_1_core.md` - Phase 1 完成報告
- `/report_phase_2_advanced_tasks.md` - Phase 2 完成報告

### 核心元件
- `/src/types/index.ts` - 完整類型定義 (376 行)
- `/src/services/` - 資料存取層 (Dexie + Repository)
- `/src/stores/` - 狀態管理 (user.ts, task.ts, view.ts)
- `/src/components/layout/UserSwitcher.vue` - 用戶切換元件
- `/src/composables/` - 權限與用戶相關 composables
- `/src/layouts/MainLayout.vue` - 主要佈局

### Phase 1 新增元件
- `/src/pages/AllTasksView.vue` - 所有任務頁面 (403 行)
- `/src/pages/ProjectView.vue` - 專案詳情頁面
- `/src/components/task/TaskDialog.vue` - 任務建立/編輯對話框 (612 行)
- `/src/components/task/TaskItem.vue` - 任務項目元件 (385 行)
- `/src/components/views/TaskListView.vue` - 任務列表視圖
- `/src/components/views/TaskDashboardView.vue` - 儀表板視圖 (463 行)
- `/src/components/common/DateTimePicker.vue` - 日期時間選擇器 (193 行)

### Phase 2 新增元件與功能
- `/src/components/task/NestedTaskItem.vue` - 遞迴巢狀任務元件 (185 行)
- `/src/components/task/DraggableTaskList.vue` - 拖拉排序列表 (162 行)
- `/src/composables/useNestedTasks.ts` - 巢狀任務管理 (343 行)
- `/src/composables/useTaskDependencies.ts` - 依賴關係管理 (338 行)
- `/src/stores/task.ts` - 擴展支援巢狀操作 (+9 個新方法)

### Phase 3 多視圖系統
- `/src/components/views/TaskBoardView.vue` - 看板視圖 (拖拉功能)
- `/src/components/views/TaskTableView.vue` - 表格視圖 (行內編輯+樹狀)
- `/src/components/views/TaskGanttView.vue` - 甘特圖視圖 (時間軸+依賴)
- `/src/components/task/TaskCard.vue` - 任務卡片元件 (249 行)
- `/src/components/views/ViewConfiguration.vue` - 視圖配置對話框 (全功能)
- `/src/services/viewConfigurationService.ts` - 視圖配置持久化服務
- `/src/composables/useViewConfiguration.ts` - 視圖配置管理 Composable
- `/src/types/index.ts` - 擴充視圖配置類型定義 (+3 介面)

## 命令提醒

### 開發
```bash
npm run dev      # 啟動開發伺服器
npm run build    # 建置生產版本
npm run lint     # 程式碼檢查
```

### 套件安裝
```bash
# 核心依賴（已安裝）
npm install dexie vue-draggable-plus @infectoone/vue-ganttastic nanoid
```

## 注意事項

### 效能考量
1. 使用虛擬滾動處理大量任務
2. 實作防抖處理頻繁操作
3. 計算屬性快取避免重複計算

### 使用者體驗
1. 所有操作要有載入狀態
2. 錯誤要有明確提示
3. 支援鍵盤快捷鍵
4. 響應式設計（桌面優先）

### 程式碼規範
1. 元件命名: PascalCase
2. Composables: use 開頭
3. 常數: UPPER_SNAKE_CASE
4. 每個功能模組獨立資料夾

### Switch 語句處理規範
為避免 "Unexpected lexical declaration in case block" 錯誤：

**1. 物件映射** (適合簡單值查找)
```typescript
const fieldGetters: Record<string, (task: Task) => any> = {
  'title': (task) => task.title,
  'status': (task) => task.statusId
}
return fieldGetters[fieldId]?.(task) || null
```

**2. if-else 鏈** (適合複雜邏輯)
```typescript
if (condition1) {
  // 處理邏輯
} else if (condition2) {
  // 處理邏輯
} else {
  // 預設處理
}
```

**3. Switch + 大括號** (保留 switch 需求時)
```typescript
switch (value) {
  case 'a': {
    const result = processA();
    return result;
  }
}
```

**使用原則**: 物件映射 > if-else 鏈 > switch，選擇最直觀且不易出錯的寫法

## 下一步行動

**Phase 3 已完成！準備開始 Phase 4:**

Phase 4 將實作自訂欄位系統：

1. **自訂欄位管理**
   - CustomFieldManager 元件
   - 支援多種欄位類型 (文字、數字、日期、選項、用戶)
   - 欄位順序與分組管理

2. **欄位渲染系統**
   - CustomFieldRenderer 元件
   - 動態欄位表單生成
   - 驗證與格式化邏輯

3. **資料結構整合**
   - 擴展 Task 類型支援自訂欄位
   - 欄位值的儲存與查詢優化
   - 匯入匯出自訂欄位資料

4. **視圖整合**
   - 自訂欄位管理介面
   - 篩選與排序配置持久化
   - 視圖間資料同步機制

## 問題與解決

### 已知問題
- TypeScript 嚴格模式在部分既有程式碼中有相容性問題
- 部分 exactOptionalPropertyTypes 設定需要調整

### Phase 2 已解決
- ✅ 拖拉套件整合方式 - 已完成 vue-draggable-plus 整合
- ✅ 巢狀任務結構設計 - 已實作扁平化儲存 + 樹狀顯示
- ✅ 任務依賴關係循環檢測 - 已實作 DFS 算法

### 待解決 (Phase 3+)
- 甘特圖時區處理
- 大量資料效能優化 (虛擬滾動)
- 複雜篩選查詢效能優化

## 更新記錄
- 2025-01-09: 專案初始化，完成需求分析與架構設計
- 2025-01-09: **Phase 0 完成** - 基礎架構建立完成，包含類型系統、資料層、模擬用戶系統
- 2025-01-09: **Phase 1 完成** - 核心功能開發完成，包含任務 CRUD、視圖系統、路由架構
- 2025-01-09: **Phase 2 完成** - 進階任務功能實作完成，包含巢狀任務、拖拉排序、依賴關係管理
- 2025-01-09: **Phase 3 完成** - 多視圖系統實作完成，包含看板、表格、甘特圖視圖及完整配置系統

## TypeScript 開發注意事項
- "type禁用any"

## 工作流程備忘
- 每完成階段,請總結完成內容到report_phase_X_<subject>.md