# 專案編碼標準與命名規範

## 📁 目錄結構規範

### Components 目錄組織

```
src/components/
├── ui/                      # 純UI元件 (可跨專案復用)
│   ├── charts/             # 圖表相關元件
│   ├── dialogs/            # 對話框元件
│   └── inputs/             # 輸入控制元件
├── business/               # 業務領域元件
│   ├── project/            # 專案領域
│   │   └── settings/       # 專案設定子模組
│   ├── task/               # 任務領域
│   ├── user/               # 用戶領域
│   ├── view/               # 視圖領域
│   └── shared/             # 跨領域共享業務元件
├── layout/                 # 佈局相關元件
└── index.ts                # Barrel Export
```

## 🏷️ 檔案命名規範

### Vue 元件命名

#### 1. 業務元件命名
格式: `{Domain}{Entity}{Type}.vue`

**範例:**
- `TaskListView.vue` - 任務領域的列表視圖
- `TaskEditDialog.vue` - 任務領域的編輯對話框
- `ProjectSettingsPanel.vue` - 專案領域的設定面板

#### 2. UI 元件命名
格式: `{Function}{Type}.vue`

**範例:**
- `DateTimePicker.vue` - 日期時間選擇器
- `FilterDialog.vue` - 篩選對話框

#### 3. 工具列命名
格式: `{Context}Toolbar.vue`

**範例:**
- `TaskViewToolbar.vue` - 任務視圖工具列
- `ProjectToolbar.vue` - 專案工具列

## 📦 Import 路徑規範

### 1. 路徑別名使用
- **@/components** - 元件目錄
- **@/services** - 服務層
- **@/stores** - 狀態管理
- **@/types** - 類型定義

### 2. Barrel Exports
每個目錄都有 `index.ts` 檔案進行統一導出

## 🎯 程式碼品質規範

### 1. TypeScript 嚴格模式
- 禁用 `any` 類型
- 啟用嚴格類型檢查

### 2. 命名約定
- **變數/函數**: camelCase
- **常數**: UPPER_SNAKE_CASE  
- **類型/介面**: PascalCase
- **檔案名**: PascalCase for components

## 🚫 禁止事項

### 1. 跨領域直接引用
### 2. 相對路徑超過 2 層
### 3. 直接修改 Props

此文檔確保編碼標準的一致性和可維護性。