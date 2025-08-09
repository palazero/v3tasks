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

### 準備開始
- [ ] Phase 1: 核心功能（專案、任務、列表視圖）
- [ ] Phase 2: 進階任務（巢狀、拖拉）
- [ ] Phase 3: 多視圖系統
- [ ] Phase 4: 自訂欄位
- [ ] Phase 5: 甘特圖與儀表板

## 關鍵檔案路徑

### 需求與設計
- `/req.md` - 完整需求規格書
- `/CLAUDE.md` - 本檔案，開發記憶
- `/report_phase_0_foundation.md` - Phase 0 完成報告

### 核心元件
- `/src/types/index.ts` - 完整類型定義 (376 行)
- `/src/services/` - 資料存取層 (Dexie + Repository)
- `/src/stores/user.ts` - 用戶狀態管理
- `/src/components/layout/UserSwitcher.vue` - 用戶切換元件
- `/src/composables/` - 權限與用戶相關 composables
- `/src/layouts/MainLayout.vue` - 主要佈局 (已更新)

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

## 下一步行動

**Phase 0 已完成！準備開始 Phase 1:**

1. **建立專案管理頁面**
   - ProjectView.vue - 專案詳情頁面
   - ProjectSettings.vue - 專案設定（Owner 專用）
   - MemberManagement - 成員管理介面

2. **實作基本任務系統**
   - TaskCard.vue - 任務卡片元件  
   - TaskDialog.vue - 任務建立/編輯對話框
   - TaskList.vue - 基本任務列表

3. **建立路由系統**
   - 設定 Vue Router
   - All Tasks 頁面
   - Project View 頁面

## 問題與解決

### 已知問題
- 無

### 待解決
- 拖拉套件整合方式
- 甘特圖時區處理
- 大量資料效能優化

## 更新記錄
- 2025-01-09: 專案初始化，完成需求分析與架構設計
- 2025-01-09: **Phase 0 完成** - 基礎架構建立完成，包含類型系統、資料層、模擬用戶系統

## TypeScript 開發注意事項
- "type禁用any"

## 工作流程備忘
- 每完成階段,請總結完成內容到report_phase_X_<subject>.md