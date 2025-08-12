# 專案編碼標準與命名規範

## 📋 目錄

1. [概述](#概述)
2. [架構規範](#架構規範)
3. [命名規範](#命名規範)
4. [程式碼品質規範](#程式碼品質規範)
5. [開發流程規範](#開發流程規範)
6. [技術規範](#技術規範)
7. [拖拉排序規範](#拖拉排序規範)
8. [響應式資料同步規範](#響應式資料同步規範)
9. [Vue 3 Composition API 規範](#vue-3-composition-api-規範)
10. [禁止事項](#禁止事項)

## 🎯 概述

本文檔定義專案任務管理系統的編碼標準，確保程式碼一致性、可維護性和團隊協作效率。

### 適用範圍
- Vue 3 + TypeScript 專案
- Quasar 2 UI 框架
- 企業級任務管理系統

## 🏗️ 架構規範

### 目錄結構規範

```
src/
├── components/               # 元件目錄
│   ├── ui/                  # 純UI元件 (可跨專案復用)
│   │   ├── charts/          # 圖表相關元件
│   │   ├── dialogs/         # 對話框元件
│   │   └── inputs/          # 輸入控制元件
│   ├── business/            # 業務領域元件
│   │   ├── project/         # 專案領域
│   │   │   └── settings/    # 專案設定子模組
│   │   ├── task/            # 任務領域
│   │   ├── user/            # 用戶領域
│   │   ├── view/            # 視圖領域
│   │   └── shared/          # 跨領域共享業務元件
│   ├── layout/              # 佈局相關元件
│   └── index.ts             # Barrel Export
├── services/                # 服務層
├── stores/                  # 狀態管理
├── composables/             # 組合式函數
├── utils/                   # 工具函數
└── types/                   # 類型定義
```

### Import 路徑規範

#### 1. 路徑別名使用
- **@/components** - 元件目錄
- **@/services** - 服務層
- **@/stores** - 狀態管理
- **@/types** - 類型定義
- **@/composables** - 組合式函數
- **@/utils** - 工具函數

#### 2. Import 順序規範
```typescript
// 1. 外部套件
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

// 2. 內部別名路徑
import { TaskService } from '@/services'
import type { Task } from '@/types'

// 3. 相對路徑
import TaskItem from './TaskItem.vue'
```

#### 3. Barrel Exports
每個目錄都有 `index.ts` 檔案進行統一導出

## 🏷️ 命名規範

### 檔案命名規範

#### 1. Vue 元件命名
**業務元件**: `{Domain}{Entity}{Type}.vue`
- `TaskListView.vue` - 任務領域的列表視圖
- `TaskEditDialog.vue` - 任務領域的編輯對話框
- `ProjectSettingsPanel.vue` - 專案領域的設定面板

**UI 元件**: `{Function}{Type}.vue`
- `DateTimePicker.vue` - 日期時間選擇器
- `FilterDialog.vue` - 篩選對話框

**工具列**: `{Context}Toolbar.vue`
- `TaskViewToolbar.vue` - 任務視圖工具列
- `ProjectToolbar.vue` - 專案工具列

### 程式碼命名約定

#### 基本命名規則
- **變數/函數**: camelCase
- **常數**: UPPER_SNAKE_CASE  
- **類型/介面**: PascalCase
- **檔案名**: PascalCase for components
- **Composables**: 以 `use` 開頭，如 `useTaskManager`
- **Services**: 以 `Service` 結尾，如 `TaskService`
- **Stores**: 以 `Store` 結尾，如 `taskStore`

### 事件命名規範

#### 事件命名 vs 函數命名區別

**事件命名（資源導向）**
- **格式**: `{resource}-{action}` (使用短橫線分隔)
- **用途**: 組件間通訊、狀態變更通知
- **範例**: `task-add`、`task-edit`、`project-update`

**函數命名（動作導向）**
- **格式**: `{verb}{Object}` 或 `handle{Event}` 
- **用途**: 實際執行業務邏輯或處理事件
- **範例**: `createTask`、`updateProject`、`handleTaskAdd`

#### 對應關係
```typescript
// 函數命名（camelCase）
function createTask(data: TaskData) { ... }
function handleTaskAdd(statusId?: string) { ... }

// 事件命名（resource-action，使用短橫線）
emit('task-add', taskData)
emit('task-edit', task)
emit('task-update', { taskId, updates })
```

#### 企業級事件分類體系

**1. 任務相關事件 (TaskEvents)**

*UI 層級事件（用戶界面動作）*
- `task-add` - 請求新增任務（開啟新增對話框）
- `task-edit` - 請求編輯任務（開啟編輯對話框）
- `task-view` - 請求查看任務（開啟詳情）
- `task-duplicate` - 請求複製任務
- `task-click` - 任務被點擊
- `task-select` - 任務被選擇

*數據層級事件（實際數據操作）*
- `task-create` - 執行創建任務（提交數據）
- `task-update` - 執行更新任務（提交數據）
- `task-delete` - 執行刪除任務
- `task-move` - 移動任務（拖拉）

*完成狀態事件（操作結果）*
- `task-created` - 任務創建成功
- `task-updated` - 任務更新成功
- `task-deleted` - 任務刪除成功
- `task-moved` - 任務移動成功

**2. 子任務相關事件 (SubtaskEvents)**
- `subtask-add` - 新增子任務
- `subtask-remove` - 移除子任務
- `subtask-update` - 更新子任務

**3. 表單與輸入事件 (FormEvents)**
- `update:modelValue` - v-model 預設事件
- `update:search` - 搜尋輸入
- `update:showAssignee` - 顯示指派人切換

**4. UI 交互事件 (UIEvents)**
- `show-dialog` - 顯示對話框
- `hide-panel` - 隱藏面板
- `toggle-sidebar` - 切換側邊欄
- `refresh` - 重新整理

**5. 狀態變更事件 (StateEvents)**
- `status-changed` - 狀態已變更
- `selection-changed` - 選擇已變更
- `filter-changed` - 篩選已變更
- `view-changed` - 視圖已變更

#### 事件命名驗證規則
```typescript
// 有效的事件命名模式
const validPatterns = [
  /^task-(add|edit|delete|duplicate|click|update|create|created|moved)$/,
  /^subtask-(add|remove|update|reorder)$/,
  /^update:[a-zA-Z][a-zA-Z0-9]*$/,
  /^(show|hide|toggle)-[a-zA-Z][a-zA-Z0-9-]*$/,
  /^[a-zA-Z][a-zA-Z0-9]*-(changed|completed)$/,
]
```

#### 事件名稱常數 (避免拼寫錯誤)
```typescript
export const EVENT_NAMES = {
  // 任務事件
  TASK_ADD: 'task-add',
  TASK_EDIT: 'task-edit', 
  TASK_DELETE: 'task-delete',
  TASK_UPDATE: 'task-update',
  
  // 子任務事件
  SUBTASK_ADD: 'subtask-add',
  
  // UI 事件
  SHOW_DIALOG: 'show-dialog',
  REFRESH: 'refresh',
} as const
```

#### 遷移映射 (舊事件名稱 → 新事件名稱)
```typescript
export const EVENT_MIGRATIONS = {
  'add-task': 'task-add',
  'edit-task': 'task-edit',
  'delete-task': 'task-delete',
  'add-subtask': 'subtask-add',
  'toggle-selection': 'selection-changed',
} as const
```

## 🎯 程式碼品質規範

### TypeScript 嚴格模式
- 禁用 `any` 類型
- 啟用嚴格類型檢查
- 所有函數必須有明確返回類型

### 註解與文檔規範
```typescript
/**
 * 任務管理服務
 * @description 提供任務的 CRUD 操作與業務邏輯
 */
export class TaskService {
  /**
   * 創建新任務
   * @param taskData - 任務資料
   * @param projectId - 專案 ID
   * @returns 創建的任務物件
   */
  async createTask(taskData: CreateTaskData, projectId: string): Promise<Task> {
    // 實作邏輯
  }
}
```

### 錯誤處理規範
```typescript
// 使用統一的錯誤類型
try {
  await taskService.updateTask(task)
} catch (error) {
  if (error instanceof ValidationError) {
    // 處理驗證錯誤
  } else if (error instanceof NetworkError) {
    // 處理網路錯誤
  } else {
    // 處理未知錯誤
    console.error('Unknown error:', error)
  }
}
```

## 🔄 開發流程規範

### Git 提交規範

#### Conventional Commits 格式
```
<type>(<scope>): <description>

<body>

<footer>
```

#### 提交類型 (type)
- **feat**: 新功能
- **fix**: 錯誤修復
- **docs**: 文檔更新
- **style**: 程式碼格式調整（不影響功能）
- **refactor**: 重構（既非新功能也非錯誤修復）
- **test**: 測試相關
- **chore**: 建置工具或輔助工具變動

#### 範圍 (scope)
- **task**: 任務相關功能
- **project**: 專案相關功能
- **ui**: UI 元件
- **store**: 狀態管理
- **service**: 服務層

#### 範例
```
feat(task): 新增任務拖拉排序功能
fix(ui): 修復 TaskDialog 關閉按鈕失效問題
docs(readme): 更新專案安裝說明
```

### 分支命名規範
```
feature/{scope}/{description}  # feature/task/drag-sort
bugfix/{scope}/{description}   # bugfix/ui/dialog-close
hotfix/{scope}/{description}   # hotfix/api/timeout-issue
```

## ⚙️ 技術規範

### 環境變數命名規範

#### 命名格式
```
VITE_APP_{CATEGORY}_{NAME}
```

#### 分類前綴
- **API**: `VITE_APP_API_BASE_URL`
- **AUTH**: `VITE_APP_AUTH_SECRET_KEY`
- **DB**: `VITE_APP_DB_NAME`
- **FEATURE**: `VITE_APP_FEATURE_DEBUG_MODE`

#### 範例
```env
# API 相關
VITE_APP_API_BASE_URL=https://api.example.com
VITE_APP_API_TIMEOUT=5000

# 認證相關
VITE_APP_AUTH_TOKEN_EXPIRE=3600

# 功能開關
VITE_APP_FEATURE_GANTT_ENABLED=true
```

### CSS/SCSS 命名規範

#### BEM 方法論
```scss
// Block
.task-card { }

// Element
.task-card__title { }
.task-card__description { }

// Modifier
.task-card--completed { }
.task-card__title--large { }
```

#### CSS 變數命名
```scss
:root {
  // 顏色系統
  --color-primary-500: #3b82f6;
  --color-success-100: #dcfce7;
  
  // 間距系統
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  
  // 字體系統
  --font-size-sm: 14px;
  --font-weight-medium: 500;
  
  // 陰影系統
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

#### 響應式斷點
```scss
// 斷點命名
$breakpoints: (
  'xs': 0px,
  'sm': 600px,
  'md': 1024px,
  'lg': 1440px,
  'xl': 1920px
);
```

### API 端點命名規範

#### RESTful 路徑設計
```
GET    /api/v1/projects           # 取得專案列表
POST   /api/v1/projects           # 創建專案
GET    /api/v1/projects/{id}      # 取得特定專案
PUT    /api/v1/projects/{id}      # 更新專案
DELETE /api/v1/projects/{id}      # 刪除專案

GET    /api/v1/projects/{id}/tasks     # 取得專案任務
POST   /api/v1/projects/{id}/tasks     # 創建任務
```

#### 查詢參數命名
```
GET /api/v1/tasks?status_id=1&assignee_id=123&page=1&per_page=20
```

**標準查詢參數**
- **分頁**: `page`, `per_page`, `limit`, `offset`
- **篩選**: `{field}_id`, `{field}_like`, `{field}_in`
- **排序**: `sort_by`, `sort_order` (asc/desc)
- **搜尋**: `search`, `query`

#### 錯誤回應格式
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "輸入資料驗證失敗",
    "details": [
      {
        "field": "title",
        "message": "標題不能為空"
      }
    ]
  }
}
```

## 🎛️ 拖拉排序規範

### VueDraggable 使用標準

#### 基本配置
```vue
<template>
  <VueDraggable
    v-model="localTaskList"
    group="tasks"
    :animation="150"
    ghost-class="task-ghost"
    chosen-class="task-chosen"
    drag-class="task-drag"
    handle=".drag-handle"
    :fallback-on-body="true"
    :swap-threshold="0.65"
    @start="onDragStart"
    @end="onDragEnd"
  >
    <!-- 拖拉項目 -->
  </VueDraggable>
</template>
```

#### 事件處理最佳實踐
```typescript
// 使用 @end 而非 @change 避免拖拉過程中觸發更新
function onDragEnd(evt: SortableEvent): void {
  // 在拖拉結束後才進行狀態更新
  updateTaskOrder()
}

// 資料同步策略
const localTaskList = ref<Task[]>([])

// 監聽 props 變化並同步到本地狀態
watch(() => props.tasks, (newTasks) => {
  localTaskList.value = [...newTasks]
}, { immediate: true, deep: true })
```

#### 樣式類別規範
```scss
.task-ghost {
  opacity: 0.5;
  background: #f5f5f5;
}

.task-chosen {
  background: #e3f2fd;
}

.task-drag {
  transform: rotate(2deg);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
```

## 🔄 響應式資料同步規範

### Props 與本地狀態同步
```typescript
// ✅ 正確：使用 watch 進行單向資料同步
const localData = ref<DataType[]>([])

watch(() => props.data, (newData) => {
  localData.value = [...newData]
}, { immediate: true, deep: true })

// ❌ 錯誤：直接修改 props
// props.data.push(newItem) // 這會導致 Vue 警告
```

### 避免循環依賴
```typescript
// ✅ 正確：使用 computed 處理衍生資料
const flattenedTasks = computed(() => {
  return flattenWithLevel(localTaskList.value || [], props.level || 0)
})

// ❌ 錯誤：使用 watch 監聽 computed 可能造成循環
// watch(flattenedTasks, () => {
//   localTaskList.value = processData(flattenedTasks.value)
// })
```

## 🎯 Vue 3 Composition API 規範

### Composables 設計原則
```typescript
// ✅ 正確：返回響應式物件
export function useTaskManager(projectId: string) {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  
  const createTask = async (data: CreateTaskData) => {
    loading.value = true
    try {
      // 邏輯實作
    } finally {
      loading.value = false
    }
  }
  
  return {
    tasks: readonly(tasks),
    loading: readonly(loading),
    createTask
  }
}
```

### 事件發送規範
```typescript
// ✅ 正確：使用統一的事件介面
const emit = defineEmits<{
  'task-add': [data: Partial<Task>]
  'task-update': [taskId: string, updates: Partial<Task>]
  'selection-changed': [data: { taskId: string; selected: boolean }]
}>()

// 發送事件時使用統一格式
function handleTaskAdd(): void {
  emit('task-add', { 
    projectId: props.projectId,
    statusId: 'todo' 
  })
}
```

## 🚫 禁止事項

### 程式碼品質
1. 跨領域直接引用
2. 相對路徑超過 2 層  
3. 直接修改 Props
4. 硬編碼魔術數字
5. 使用 `console.log` 於生產環境
6. 使用 `any` 類型
7. 未處理的 Promise rejection
8. **在拖拉組件中使用 @change 事件**（應使用 @end）
9. **混合使用舊事件命名與新事件命名**
10. **在 computed 內部修改響應式資料**

### 安全性
11. 在前端存儲敏感資料
12. 直接在程式碼中包含 API 密鑰
13. 未驗證用戶輸入

### 效能
14. 在 render 函數中進行複雜計算
15. 不必要的響應式資料
16. 未優化的大型圖片資源
17. **頻繁的深層 watch 監聽**
18. **未使用 readonly() 保護內部狀態**

---

此文檔確保編碼標準的一致性和可維護性，所有團隊成員必須遵循。