# 統一欄位管理系統實作報告

**日期**: 2025-08-11  
**階段**: Phase 5+ 擴展功能  
**狀態**: 部分完成 - 核心架構與 Table 視圖已完成

## 概述

實作統一的欄位管理系統，支援所有視圖（Table、List、Gantt）的欄位顯示/隱藏、排序、寬度調整等功能。系統整合系統欄位與自訂欄位，提供一致的管理介面和用戶體驗。

## 實作內容

### 1. 核心架構建立 ✅

#### 1.1 統一欄位定義系統
**檔案**: `src/config/columnDefinitions.ts`
- **功能**: 定義所有可用欄位的元資料
- **涵蓋範圍**: 12個系統欄位 + 動態自訂欄位
- **關鍵特性**:
  - 每個欄位包含完整的配置資訊（寬度、是否必要、適用視圖等）
  - 支援不同視圖類型的欄位篩選
  - 自訂欄位自動轉換為統一格式
  - 預設顯示和必要欄位的智能判斷

**系統欄位涵蓋**:
```typescript
title, status, assignee, priority, startDate, deadline, 
duration, progress, tags, creator, createdAt, updatedAt, description
```

#### 1.2 通用欄位管理元件
**檔案**: `src/components/common/ColumnManager.vue`
- **功能**: 可重用的欄位管理對話框
- **特色功能**:
  - 系統欄位與自訂欄位分組顯示
  - 拖拉排序（支援同組內重排）
  - 寬度調整（Table/Gantt 視圖）
  - 快速操作（全部顯示、僅顯示必要、重置、恢復預設）
  - 實時統計顯示（已選擇 X/Y 個欄位）
  - 響應式設計，適配不同視圖需求

#### 1.3 欄位配置服務
**檔案**: `src/services/columnConfigService.ts`
- **功能**: 處理欄位配置的邏輯和轉換
- **服務內容**:
  - 預設配置生成
  - 現有配置與新欄位定義合併
  - 配置驗證（必要欄位檢查、重複檢查）
  - 舊格式遷移
  - 表格欄位定義轉換

### 2. ViewToolbar 整合 ✅

**修改檔案**: `src/components/common/ViewToolbar.vue`
- **新增功能**: 欄位管理按鈕
- **特色**: 顯示已選欄位數量徽章
- **整合方式**: 透過 props 控制是否顯示，發送 `show-column-manager` 事件

**Props 擴展**:
```typescript
showColumnManager?: boolean
visibleColumnsCount?: number  
totalColumnsCount?: number
```

### 3. TaskTableView 完整重構 ✅

**修改檔案**: `src/components/views/TaskTableView.vue`

#### 3.1 移除舊系統
- ❌ 移除內建欄位管理工具列（80行代碼）
- ❌ 移除內建拖拉排序邏輯（150行代碼）
- ❌ 移除硬編碼的欄位定義（100行代碼）

#### 3.2 整合新系統
- ✅ 引入 ColumnManager 元件
- ✅ 動態欄位定義系統
- ✅ 響應式配置管理
- ✅ 自訂欄位支援

#### 3.3 關鍵改進
```typescript
// 動態初始化欄位定義
function initializeFieldDefinitions() {
  allFieldDefinitions.value = getFieldsForView('table', projectCustomFields.value)
  // 智能合併現有配置與新欄位
  currentColumnConfig.value = columnConfigService.mergeWithFieldDefinitions(...)
}

// 簡化的表格欄位生成
const tableColumns = computed(() => {
  return currentColumnConfig.value
    .filter(col => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(col => generateColumnDefinition(col))
})
```

### 4. 型別定義擴展 ✅

**修改檔案**: `src/types/index.ts`
- **ColumnConfig 介面擴展**:
```typescript
interface ColumnConfig {
  // 原有屬性...
  required?: boolean      // 是否必要欄位
  minWidth?: number      // 最小寬度
  maxWidth?: number      // 最大寬度
}
```

## 技術架構

### 資料流程
```
用戶操作 ColumnManager
    ↓
配置變更 → handleColumnConfigUpdate
    ↓  
emit('configuration-update')
    ↓
ProjectView 接收 → ViewStore.updateViewConfig
    ↓
IndexedDB 持久化儲存
    ↓
下次載入自動恢復配置
```

### 組件關係
```
ProjectView
├── ViewToolbar (欄位管理按鈕)
├── TaskTableView
│   ├── ColumnManager (管理對話框)
│   └── 動態表格欄位
└── 其他視圖...
```

## 實作效果

### ✅ 已完成功能
1. **統一管理介面**: 所有欄位在同一對話框中管理
2. **智能分組**: 系統欄位與自訂欄位分別展示
3. **拖拉排序**: 直觀的欄位順序調整
4. **寬度調整**: Table 視圖支援欄位寬度自訂
5. **配置持久化**: 用戶設定自動儲存和恢復
6. **自訂欄位整合**: 專案自訂欄位無縫融入管理系統
7. **必要欄位保護**: 必要欄位不可隱藏或移動
8. **快速操作**: 一鍵顯示全部、僅顯示必要等

### 📊 程式碼統計
- **新增檔案**: 3個（columnDefinitions.ts, ColumnManager.vue, columnConfigService.ts）
- **修改檔案**: 3個（ViewToolbar.vue, TaskTableView.vue, types/index.ts）
- **新增代碼**: ~800行
- **移除代碼**: ~330行（舊欄位管理邏輯）
- **淨增加**: ~470行

## 待完成工作

### 🔄 進行中
- **TaskListView 整合**: 欄位顯示/隱藏功能（任務項目標籤化顯示）
- **TaskGanttView 整合**: 甘特圖左側欄位配置

### 📋 待實作
- **ProjectView 統一整合**: 處理所有視圖的欄位管理事件
- **Board 視圖支援**: 看板卡片欄位配置
- **效能優化**: 大量欄位時的渲染效能
- **國際化**: 欄位標籤多語言支援

## 技術亮點

### 1. 模組化設計
- 欄位定義、配置服務、管理元件完全解耦
- 任何視圖都能輕鬆整合欄位管理功能

### 2. 擴展性
- 新增系統欄位只需修改 `columnDefinitions.ts`
- 自訂欄位自動整合，無需額外開發

### 3. 用戶體驗
- 統一的操作介面，學習成本低
- 實時預覽，即時反饋
- 智能預設值，減少配置負擔

### 4. 相容性
- 舊配置自動遷移
- 漸進式升級，不影響現有功能

## 遇到的挑戰與解決

### 1. 欄位映射複雜性
**問題**: 不同視圖對相同欄位有不同的渲染需求  
**解決**: 建立統一的欄位定義系統，透過 `renderType` 區分渲染方式

### 2. 自訂欄位整合
**問題**: 自訂欄位類型多樣，需要統一管理  
**解決**: 建立轉換函數，將自訂欄位定義轉為統一格式

### 3. 配置持久化
**問題**: 確保用戶配置正確儲存到 ViewConfiguration  
**解決**: 透過事件系統與現有 ViewStore 整合

## 後續規劃

### Phase 6: 完成所有視圖整合
1. **TaskListView**: 標籤式欄位顯示
2. **TaskGanttView**: 甘特圖左側表格配置  
3. **ProjectView**: 統一事件處理

### Phase 7: 進階功能
1. **欄位群組**: 相關欄位分組管理
2. **條件顯示**: 根據任務狀態動態顯示欄位
3. **預設模板**: 預設欄位配置模板

## 結論

統一欄位管理系統的核心架構已成功建立，TaskTableView 已完全整合新系統。系統提供了强大的擴展性和一致的用戶體驗，為後續視圖整合奠定了堅實基礎。預計完成所有視圖整合後，將大幅提升用戶的欄位管理效率和系統的整體一致性。