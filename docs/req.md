# 專案任務管理系統 - 需求規格書

## 1. 專案概述

### 1.1 專案願景
打造一個基於 Vue 3 和 Quasar 2 的現代化、高彈性專案任務管理系統。系統以專案為核心，提供多樣化的任務視圖（列表、表格、看板、甘特圖、儀表板），並賦予團隊高度自訂能力，包括自訂視圖和自訂欄位，旨在提升團隊協作效率與專案可視性。

### 1.2 技術架構
- **前端框架**: Vue 3 + Quasar 2
- **狀態管理**: Pinia
- **路由管理**: Vue Router 4
- **程式語言**: TypeScript
- **樣式處理**: SCSS
- **拖拉套件**: vue-draggable-plus
- **甘特圖套件**: @infectoone/vue-ganttastic
- **資料儲存**: localStorage / IndexedDB (開發階段)

---

## 2. 核心概念

### 2.1 系統架構
- **專案 (Project)**: 任務的集合，擁有獨立的成員、設定、視圖和自訂欄位
- **任務 (Task)**: 可執行的最小工作單元，支援巢狀結構與拖拉排序
- **視圖 (View)**: 以特定方式呈現任務的頁面，可儲存篩選、排序、分組等設定
- **欄位 (Field)**: 任務的屬性，分為系統預設欄位和專案自訂欄位

### 2.2 特殊功能
- **模擬用戶切換**: 在主畫面右上角提供用戶切換功能，無需登入即可測試不同角色權限
- **巢狀任務**: 任務支援多層巢狀結構，可透過拖拉調整層級關係
- **All Tasks 視圖**: 系統級特殊視圖，彙總使用者有權限存取的所有任務

---

## 3. 角色與權限

### 3.1 角色定義

#### 系統管理員 (Admin)
- 查看和管理系統中的**所有**專案
- 指派或變更任何專案的擁有者
- 管理使用者帳號
- 存取所有系統功能

#### 專案擁有者 (Owner)
- 建立專案者預設為 Owner
- 編輯專案資訊
- 新增／移除專案成員
- 建立／編輯自訂欄位
- 刪除專案
- 轉移 Owner 身份

#### 專案成員 (Member)
- 查看專案內任務
- 對被授權的任務進行操作
- 建立、儲存個人或團隊的自訂視圖

### 3.2 模擬用戶系統
系統預設包含以下模擬用戶，可透過右上角下拉選單快速切換：
- 系統管理員
- 專案擁有者
- 專案成員 A
- 專案成員 B
- 一般使用者

---

## 4. 功能需求

### 4.1 專案管理

#### 必要功能
- 建立新專案（建立者成為 Owner）
- 編輯專案資訊（名稱、描述）
- 刪除專案（Owner 專用）
- 專案成員管理（新增、移除、權限設定）
- 專案列表顯示（側邊欄）

#### 進階功能
- 專案複製
- 專案範本
- 專案封存

### 4.2 任務管理

#### 核心欄位
- **taskId**: 唯一識別碼 (nanoid, 12 字元)
- **title**: 標題（必填）
- **description**: 描述（富文本編輯器）
- **statusId**: 狀態
- **assigneeId**: 指派對象
- **priorityId**: 優先級
- **startDateTime**: 開始時間
- **endDateTime**: 結束時間
- **creatorId**: 建立者
- **createdAt**: 建立時間
- **updatedAt**: 更新時間

#### 巢狀結構支援
- **parentTaskId**: 父任務 ID
- **children**: 子任務陣列
- **order**: 排序順序
- **level**: 巢狀層級（0 為根任務）
- **isExpanded**: 展開/收合狀態

#### 任務操作
- CRUD 操作（建立、讀取、更新、刪除）
- 拖拉排序
- 拖拉改變層級
- 批次操作
- 快速編輯

### 4.3 視圖系統

#### 視圖類型

##### 1. 列表視圖 (List View)
- 簡潔的垂直任務列表
- 支援巢狀顯示
- 拖拉排序
- 快速編輯

##### 2. 表格視圖 (Table View)
- 類似試算表的網格視圖
- 欄位可自訂顯示/隱藏
- 支援排序
- 行內編輯

##### 3. 看板視圖 (Board View)
- 依狀態或分類分欄顯示
- 拖拉卡片更新狀態
- 自訂欄位分組
- 泳道功能

##### 4. 甘特圖 (Gantt View)
- 基於任務起迄時間的時間軸圖表
- 拖拉調整時間
- 顯示依賴關係
- 進度追蹤

##### 5. 儀表板 (Dashboard View)
- 專案統計數據
- 圖表視覺化
- 關鍵指標顯示
- 自訂小工具

#### 視圖功能
- **篩選器**: 多條件邏輯組合 (AND/OR)
- **排序**: 多欄位升序/降序
- **分組**: 按特定欄位分組顯示
- **欄位管理**: 顯示/隱藏欄位

#### 預設視圖
- **All Tasks**: 包含一個不可刪除的 List View
- **每個專案**: 自動產生 Dashboard View 和 List View（不可刪除）

### 4.4 自訂欄位

#### 支援類型
- **Text**: 單行文字
- **Number**: 數字
- **Date**: 日期選擇器
- **Select**: 單選下拉選單
- **MultiSelect**: 多選標籤
- **User**: 使用者選擇器
- **Checkbox**: 勾選框

#### 管理功能
- 新增自訂欄位（Owner 專用）
- 編輯欄位設定
- 刪除欄位
- 排序欄位顯示順序

---

## 5. 資料模型

### 5.1 User
```typescript
interface User {
  userId: string        // nanoid
  name: string
  email: string
  role: 'admin' | 'user'
  avatar?: string
}
```

### 5.2 Project
```typescript
interface Project {
  projectId: string     // nanoid(8)
  name: string
  description: string
  ownerId: string       // User.userId
  memberIds: string[]   // User.userId[]
  createdAt: Date
  updatedAt: Date
  settings?: ProjectSettings
}
```

### 5.3 Task
```typescript
interface Task {
  taskId: string        // nanoid(12)
  projectId: string     // Project.projectId
  title: string
  description: object   // 富文本物件
  statusId: string
  assigneeId: string    // User.userId
  priorityId: string
  startDateTime: Date | null
  endDateTime: Date | null
  
  // 巢狀結構
  parentTaskId?: string | null
  children?: Task[]
  order: number
  level: number
  isExpanded?: boolean
  
  // 系統欄位
  creatorId: string     // User.userId
  createdAt: Date
  updatedAt: Date
  
  // 自訂欄位值
  customFields: Array<{
    fieldId: string
    value: any
  }>
}
```

### 5.4 View
```typescript
interface View {
  viewId: string        // nanoid
  projectId: string     // 'all' for All Tasks
  name: string
  type: 'list' | 'table' | 'board' | 'gantt' | 'dashboard'
  isDeletable: boolean
  isPersonal: boolean   // 個人或團隊視圖
  creatorId: string     // User.userId
  
  config: {
    filters: FilterConfig[]
    sorts: SortConfig[]
    groupBy?: string    // fieldId
    visibleFields: string[]
    viewSpecificSettings?: any
  }
  
  createdAt: Date
  updatedAt: Date
}
```

### 5.5 CustomFieldDefinition
```typescript
interface CustomFieldDefinition {
  fieldId: string       // nanoid
  projectId: string     // Project.projectId
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 
        'multiSelect' | 'user' | 'checkbox'
  
  options?: Array<{     // for select/multiSelect
    value: string
    label: string
    color?: string
  }>
  
  defaultValue?: any
  isRequired: boolean
  order: number
  
  createdAt: Date
  updatedAt: Date
}
```

---

## 6. 非功能需求

### 6.1 效能需求
- 支援單專案 1000+ 任務
- 視圖切換響應時間 < 1 秒
- 拖拉操作流暢度 60 FPS
- 虛擬滾動處理大量資料

### 6.2 使用者體驗
- 響應式設計（桌面、平板、手機）
- 深色模式支援
- 鍵盤快捷鍵
- 無障礙功能 (ARIA)
- 多語言支援架構

### 6.3 安全性
- 資料驗證與清理
- XSS 防護
- 權限檢查
- 操作日誌記錄

### 6.4 可維護性
- 模組化架構
- TypeScript 型別安全
- 單元測試覆蓋
- 程式碼註解規範

---

## 7. 開發階段規劃

### Phase 1: 基礎架構（第 1-2 週）
- [ ] 專案初始化與環境設定
- [ ] Pinia Store 架構
- [ ] 基本路由設定
- [ ] 模擬用戶系統
- [ ] 主要佈局（Layout）

### Phase 2: 專案管理（第 3 週）
- [ ] 專案 CRUD
- [ ] 專案列表側邊欄
- [ ] 成員管理
- [ ] 專案設定頁面

### Phase 3: 任務核心（第 4-5 週）
- [ ] 任務 CRUD
- [ ] 任務表單
- [ ] 富文本編輯器
- [ ] 巢狀結構支援

### Phase 4: 視圖實作（第 6-8 週）
- [ ] 列表視圖
- [ ] 表格視圖
- [ ] 看板視圖
- [ ] 篩選與排序功能

### Phase 5: 進階功能（第 9-10 週）
- [ ] 甘特圖視圖
- [ ] 儀表板視圖
- [ ] 自訂欄位系統
- [ ] 拖拉功能完善

### Phase 6: 優化與測試（第 11-12 週）
- [ ] 效能優化
- [ ] 響應式調整
- [ ] 錯誤處理
- [ ] 使用者測試

---

## 8. 技術依賴

### 核心套件
```json
{
  "dependencies": {
    "vue": "^3.4.18",
    "vue-router": "^4.0.12",
    "pinia": "^3.0.1",
    "@quasar/extras": "^1.16.4",
    "quasar": "^2.16.0",
    "vue-draggable-plus": "latest",
    "@infectoone/vue-ganttastic": "latest",
    "vue-i18n": "^11.0.0",
    "axios": "^1.2.1"
  },
  "devDependencies": {
    "typescript": "~5.5.3",
    "@quasar/app-vite": "^2.1.0",
    "eslint": "^9.14.0",
    "prettier": "^3.3.3"
  }
}
```

---

## 9. 未來擴展

### 短期目標（3-6 個月）
- 真實後端 API 整合
- 使用者認證系統
- 即時協作功能
- 檔案附件支援
- 評論與討論功能

### 長期目標（6-12 個月）
- 行動應用程式 (Capacitor)
- 第三方整合 (Slack, Teams)
- AI 輔助功能
- 進階報表系統
- 企業版功能

---

## 10. 成功指標

### 技術指標
- 頁面載入時間 < 3 秒
- 程式碼覆蓋率 > 70%
- Lighthouse 分數 > 90

### 業務指標
- 使用者滿意度 > 4.5/5
- 任務完成率提升 30%
- 專案可視度提升 50%

---

## 附錄

### A. 術語表
- **Owner**: 專案擁有者，擁有專案最高權限
- **Member**: 專案成員，參與專案的使用者
- **View**: 視圖，任務的不同呈現方式
- **Custom Field**: 自訂欄位，專案特定的額外資料欄位

### B. 參考資源
- [Vue 3 文檔](https://vuejs.org/)
- [Quasar 框架](https://quasar.dev/)
- [Pinia 狀態管理](https://pinia.vuejs.org/)
- [Vue Draggable Plus](https://github.com/alfred-skyblue/vue-draggable-plus)
- [Vue Ganttastic](https://github.com/InfectoOne/vue-ganttastic)

### C. 變更歷史
- 2025-01-09: 初始版本
- 特別說明：採用模擬用戶系統取代傳統登入機制
- 新增：支援任務巢狀結構與拖拉功能