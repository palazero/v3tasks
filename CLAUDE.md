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

- [x] **Phase 4: 自訂欄位系統** ✅ (2025-01-09)
  - [x] 實作 CustomFieldManager 元件 - 欄位類型管理
  - [x] 建立 CustomFieldRenderer 元件 - 動態欄位渲染
  - [x] 擴展 Task 類型支援自訂欄位資料
  - [x] 整合自訂欄位到各視圖系統
  - [x] 建立欄位驗證與格式化邏輯
  - [x] 完成階段報告: `report_phase_4_custom_fields.md`

- [x] **應用程式啟動錯誤修復** ✅ (2025-01-10)
  - [x] 修復 Vite 客戶端 500 錯誤 (別名配置問題)
  - [x] 解決身份驗證無限重定向循環 (新增 auth boot 檔案)
  - [x] 修正 SCSS 變數錯誤 (TaskListView.vue)
  - [x] 建立缺失的 MemberManagementDialog.vue 元件
  - [x] 修正所有 TypeScript 類型錯誤
  - [x] 完成修復報告: `report_fix_03_application_startup_errors.md`

- [x] **Quasar 插件與 VueDraggable 修復** ✅ (2025-01-10)
  - [x] 修復 Quasar 插件配置 (Notify、Dialog、Screen 未載入)
  - [x] 解決 VueDraggable 看板任務卡片顯示問題
  - [x] 修正拖拽語法錯誤 (移除 item-key 和 template slot)
  - [x] 實作正確的 Component 模式語法
  - [x] 實作跨列拖拽事件處理和狀態更新
  - [x] 修復 IndexedDB DataCloneError 序列化問題
  - [x] 修正 SCSS 變數錯誤和 UI 組件問題
  - [x] 完成修復報告: `report_fix_05_quasar_plugins_and_draggable.md`

- [x] **專案設定系統整合** ✅ (2025-08-10)
  - [x] 重構專案設定頁面 (ProjectSettingsView.vue) - 模組化側邊導航設計
  - [x] 將人員管理功能從專案檢視移至專案設定 (ProjectMembersSettings.vue)
  - [x] 整合自訂欄位管理功能 (ProjectCustomFieldsSettings.vue)
  - [x] 新增基本資訊設定 (ProjectGeneralSettings.vue) - 專案名稱、描述、圖示
  - [x] 新增視圖配置管理 (ProjectViewsSettings.vue) - 預設視圖、自動儲存等設定
  - [x] 新增權限控制設定 (ProjectPermissionsSettings.vue) - 專案可見性、成員權限
  - [x] 新增危險操作管理 (ProjectDangerSettings.vue) - 資料清理、專案刪除等
  - [x] 更新 ProjectView.vue 移除原有人員管理對話框，整合設定入口
  - [x] 擴展 Project 類型定義，新增 icon 和 isArchived 屬性
  - [x] 修復所有 ESLint 錯誤，確保程式碼品質

### 準備開始
- [ ] Phase 5: 甘特圖與儀表板進階功能

## 關鍵檔案路徑

### 需求與設計
- `/req.md` - 完整需求規格書
- `/CLAUDE.md` - 本檔案，開發記憶
- `/report_phase_0_foundation.md` - Phase 0 完成報告
- `/report_phase_1_core.md` - Phase 1 完成報告
- `/report_phase_2_advanced_tasks.md` - Phase 2 完成報告
- `/report_fix_03_application_startup_errors.md` - 應用程式啟動錯誤修復報告
- `/report_fix_05_quasar_plugins_and_draggable.md` - Quasar 插件與 VueDraggable 修復報告
- `/report_project_settings_integration.md` - 專案設定系統整合報告

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

### Phase 4 自訂欄位系統
- `/src/components/fields/CustomFieldManager.vue` - 自訂欄位管理元件
- `/src/components/fields/CustomFieldRenderer.vue` - 動態欄位渲染器
- `/src/services/customFieldService.ts` - 自訂欄位服務層
- `/src/composables/useCustomFields.ts` - 自訂欄位管理 Composable

### 應用程式啟動修復
- `/src/boot/auth.ts` - 身份驗證啟動檔案 (解決無限重定向)
- `/src/components/project/MemberManagementDialog.vue` - 專案成員管理元件
- `/quasar.config.ts` - 修復 Vite 別名配置

### Quasar 插件與 VueDraggable 修復
- `/quasar.config.ts` - 啟用 Notify、Dialog、Screen 插件
- `/src/services/repositories/base.repository.ts` - 新增 sanitizeData 方法
- `/src/components/views/TaskBoardView.vue` - 修正 VueDraggable 語法
- `/src/components/charts/BaseChart.vue` - 註冊 Chart.js 控制器
- `/src/router/routes.ts` - 新增路由重定向規則

### 專案設定系統整合
- `/src/pages/ProjectSettingsView.vue` - 重構專案設定頁面 (模組化側邊導航設計)
- `/src/components/settings/ProjectGeneralSettings.vue` - 基本資訊設定 (專案名稱、描述、圖示)
- `/src/components/settings/ProjectMembersSettings.vue` - 人員管理設定 (成員新增、移除、角色管理)
- `/src/components/settings/ProjectCustomFieldsSettings.vue` - 自訂欄位管理 (欄位配置、預覽、統計)
- `/src/components/settings/ProjectViewsSettings.vue` - 視圖配置管理 (預設視圖、自動儲存設定)
- `/src/components/settings/ProjectPermissionsSettings.vue` - 權限控制設定 (可見性、成員權限矩陣)
- `/src/components/settings/ProjectDangerSettings.vue` - 危險操作管理 (清理、歸檔、刪除專案)
- `/src/types/index.ts` - 擴展 Project 介面 (新增 icon、isArchived 屬性)

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

**所有核心功能階段已完成！應用程式現已完全可用。**

**當前狀態**:
- ✅ 應用程式可正常啟動 (http://localhost:9001)
- ✅ 所有 TypeScript 錯誤已修復
- ✅ 身份驗證系統正常運作 (自動登入模擬用戶)
- ✅ 所有核心功能完整可用
- ✅ Quasar 插件功能完全正常 ($q.notify, $q.dialog)
- ✅ 看板拖拽功能完整可用 (跨列拖拽 + 狀態更新)
- ✅ IndexedDB 資料持久化穩定運作

**可選的下一階段 - Phase 5: 甘特圖與儀表板進階功能**:

1. **甘特圖進階功能**
   - 時區處理與本地化
   - 拖拉調整任務時間
   - 依賴關係視覺化增強
   - 關鍵路徑計算

2. **儀表板進階功能**
   - 工作量統計圖表
   - 專案進度儀表板
   - 個人績效分析
   - 自訂報表功能

3. **效能優化**
   - 大量資料虛擬滾動
   - 複雜查詢優化
   - 快取機制改進

4. **使用者體驗增強**
   - 鍵盤快捷鍵支援
   - 拖拉操作體驗優化
   - 載入狀態改進

## 問題與解決

### 已知問題
- TypeScript 嚴格模式在部分既有程式碼中有相容性問題
- 部分 exactOptionalPropertyTypes 設定需要調整

### Phase 2 已解決
- ✅ 拖拉套件整合方式 - 已完成 vue-draggable-plus 整合
- ✅ 巢狀任務結構設計 - 已實作扁平化儲存 + 樹狀顯示
- ✅ 任務依賴關係循環檢測 - 已實作 DFS 算法

### 應用程式啟動問題已解決
- ✅ Vite 客戶端 500 錯誤 - 修正別名配置問題
- ✅ 身份驗證無限重定向 - 新增 auth boot 檔案自動初始化用戶
- ✅ SCSS 變數錯誤 - 替換為標準 CSS 值
- ✅ 缺失元件錯誤 - 補充 MemberManagementDialog.vue
- ✅ TypeScript 類型錯誤 - 完整修正所有類型問題

### 待解決 (Phase 5+)
- 甘特圖時區處理
- 大量資料效能優化 (虛擬滾動)
- 複雜篩選查詢效能優化

## 更新記錄
- 2025-01-09: 專案初始化，完成需求分析與架構設計
- 2025-01-09: **Phase 0 完成** - 基礎架構建立完成，包含類型系統、資料層、模擬用戶系統
- 2025-01-09: **Phase 1 完成** - 核心功能開發完成，包含任務 CRUD、視圖系統、路由架構
- 2025-01-09: **Phase 2 完成** - 進階任務功能實作完成，包含巢狀任務、拖拉排序、依賴關係管理
- 2025-01-09: **Phase 3 完成** - 多視圖系統實作完成，包含看板、表格、甘特圖視圖及完整配置系統
- 2025-01-09: **Phase 4 完成** - 自訂欄位系統實作完成，支援多種欄位類型與動態渲染
- 2025-01-10: **應用程式啟動錯誤修復完成** - 解決 Vite 500 錯誤、身份驗證循環、TypeScript 錯誤等阻礙性問題
- 2025-01-10: **Quasar 插件與 VueDraggable 修復完成** - 解決插件配置、看板拖拽、IndexedDB 序列化等核心功能問題
- 2025-08-10: **專案設定系統整合完成** - 重構專案設定頁面，整合人員管理、自訂欄位等功能到統一設定介面

## TypeScript 開發注意事項
- "type禁用any"

## 工作流程備忘
- 每完成階段,請總結完成內容到report_phase_X_<subject>.md
- 每完成問題修復,請總結修復內容到report_fix_<seq>_<subject>.md