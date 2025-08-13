# API 整合使用指南

## 目錄
- [快速開始](#快速開始)
- [功能特點](#功能特點)
- [架構概覽](#架構概覽)
- [環境配置](#環境配置)
- [API 服務使用](#api-服務使用)
- [資料源策略](#資料源策略)
- [同步機制](#同步機制)
- [錯誤處理](#錯誤處理)
- [最佳實踐](#最佳實踐)
- [疑難排解](#疑難排解)

## 快速開始

### 1. 環境設定

複製環境變數範本：
```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# 啟用 API 整合
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=hybrid

# API 服務設定
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3

# 同步設定
ENABLE_SYNC=true
SYNC_INTERVAL=30000
CACHE_TIMEOUT=300000
```

### 2. 後端服務準備

確保後端 API 服務在 `http://localhost:3000` 運行並提供以下端點：

```
GET  /api/health                # 健康檢查
GET  /api/tasks                 # 獲取任務列表
POST /api/tasks                 # 創建任務
GET  /api/tasks/:id             # 獲取單個任務
PUT  /api/tasks/:id             # 更新任務
DELETE /api/tasks/:id           # 刪除任務
PATCH /api/tasks/batch-status   # 批量更新狀態
```

### 3. 應用啟動配置

在 `quasar.config.ts` 中註冊 API 整合 boot 檔案：
```typescript
boot: [
  'auth',
  'api-integration' // 新增此行
]
```

### 4. 基本使用

```typescript
import { taskService, configService } from '@/services'

// 檢查 API 是否啟用
if (configService.isApiEnabled()) {
  console.log('API 模式已啟用')
}

// 使用任務服務（自動選擇 API 或本地實作）
const tasks = await taskService.getTasksByProject(projectId)
const stats = await taskService.getTaskStatistics(projectId)
```

## 功能特點

### ✅ 零破壞性變更
- 現有程式碼無需修改即可使用 API 功能
- 服務適配器提供完整向下相容性
- 自動回退機制確保系統穩定性

### ✅ 智慧資料源策略
- **Hybrid 模式**: 智慧選擇本地/遠端資料源
- **API-First 模式**: 優先使用 API，失敗時回退本地
- **Local-Only 模式**: 僅使用本地 IndexedDB

### ✅ 企業級架構
- DDD 分層架構設計
- 依賴注入容器系統
- Repository 模式抽象化
- 完整的錯誤處理與監控

### ✅ 離線優先設計
- 自動網路狀態檢測
- 本地資料快取與同步
- 衝突解決機制
- 增量同步支援

## 架構概覽

### 分層架構
```
┌─────────────────────────────────────┐
│         展示層 (Views/Components)     │
├─────────────────────────────────────┤
│       應用層 (Composables/Hooks)     │
├─────────────────────────────────────┤
│     領域層 (Services/Business Logic) │
├─────────────────────────────────────┤
│   基礎設施層 (Repositories/API/DB)    │
└─────────────────────────────────────┘
```

### 核心組件

#### 1. HTTP 服務 (`HttpService`)
```typescript
interface IHttpService {
  get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  post<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  put<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  setAuthToken(token: string): void
  healthCheck(): Promise<boolean>
}
```

#### 2. API Repository (`BaseApiRepository`)
```typescript
enum DataSourceStrategy {
  LOCAL_ONLY = 'local-only',
  API_ONLY = 'api-only', 
  API_FIRST = 'api-first',
  LOCAL_FIRST = 'local-first',
  HYBRID = 'hybrid'
}
```

#### 3. 配置管理 (`ConfigManager`)
```typescript
interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retryAttempts: number
  }
  dataSource: {
    strategy: 'local' | 'api' | 'hybrid'
    enableOffline: boolean
    cacheTimeout: number
    syncInterval: number
  }
  features: {
    enableApiIntegration: boolean
    enableOfflineMode: boolean
    enableSync: boolean
  }
}
```

## 環境配置

### 配置選項說明

| 變數名 | 預設值 | 說明 |
|--------|--------|------|
| `API_BASE_URL` | `http://localhost:3000/api` | API 基礎 URL |
| `API_TIMEOUT` | `10000` | 請求超時時間 (毫秒) |
| `API_RETRY_ATTEMPTS` | `3` | 失敗重試次數 |
| `DATA_SOURCE_STRATEGY` | `hybrid` | 資料源策略 |
| `ENABLE_API_INTEGRATION` | `true` | 是否啟用 API 整合 |
| `ENABLE_OFFLINE_MODE` | `true` | 是否啟用離線模式 |
| `ENABLE_SYNC` | `true` | 是否啟用自動同步 |
| `SYNC_INTERVAL` | `30000` | 同步間隔 (毫秒) |
| `CACHE_TIMEOUT` | `300000` | 快取過期時間 (毫秒) |

### 不同環境的推薦配置

#### 開發環境
```env
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=hybrid
API_BASE_URL=http://localhost:3000/api
ENABLE_SYNC=true
```

#### 測試環境
```env
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=api
API_BASE_URL=https://test-api.example.com/api
ENABLE_SYNC=false
```

#### 生產環境
```env
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=hybrid
API_BASE_URL=https://api.example.com/api
ENABLE_SYNC=true
SYNC_INTERVAL=60000
```

## API 服務使用

### 1. 服務適配器使用 (推薦)

```typescript
import { taskService, projectService, userService } from '@/services'

// 任務操作
const task = await taskService.createTask({
  title: '新任務',
  projectId: 'project-1',
  assigneeId: 'user-1'
})

const tasks = await taskService.getTasksByProject('project-1')
const stats = await taskService.getTaskStatistics('project-1')

// 專案操作
const project = await projectService.getProjectById('project-1')
const userProjects = await projectService.getProjectsByUser('user-1')

// 用戶操作
const user = await userService.findByEmail('user@example.com')
const profile = await userService.updateProfile('user-1', { name: '新名稱' })
```

### 2. Vue 組合式 API

```typescript
import { defineComponent, getCurrentInstance } from 'vue'

export default defineComponent({
  setup() {
    const { proxy } = getCurrentInstance()!
    const taskService = proxy.$services.getTaskService()
    const configManager = proxy.$services.getConfigManager()
    
    const loadTasks = async (projectId: string) => {
      try {
        return await taskService.getTasksByProject(projectId)
      } catch (error) {
        console.error('載入任務失敗:', error)
        return []
      }
    }
    
    const switchToOfflineMode = () => {
      configManager.switchToLocalMode()
    }
    
    return { loadTasks, switchToOfflineMode }
  }
})
```

### 3. 直接使用服務工廠

```typescript
import { ServiceFactory } from '@/services'
import { container } from '@/services/infrastructure/container/service-container'

const taskService = ServiceFactory.getTaskService(container)
const httpService = ServiceFactory.getHttpService(container)

// 檢查 API 連接
const isConnected = await httpService.healthCheck()
if (isConnected) {
  const tasks = await taskService.getTasksByProject(projectId)
}
```

## 資料源策略

### 1. Hybrid 模式 (預設)
智慧選擇最佳資料源，平衡效能與一致性：

```typescript
// 自動選擇策略
const tasks = await taskService.getTasksByProject(projectId)
// → 如果 API 可用且資料過期：使用 API
// → 如果 API 不可用或資料新鮮：使用本地快取
```

### 2. API-First 模式
優先使用 API，失敗時回退本地：

```typescript
import { configService } from '@/services'

configService.switchToApiMode()
// → 所有操作優先嘗試 API
// → API 失敗時自動使用本地資料
```

### 3. Local-Only 模式
僅使用本地資料，適用於離線場景：

```typescript
configService.switchToLocalMode()
// → 所有操作使用 IndexedDB
// → 不會發送 API 請求
```

### 4. 動態切換

```typescript
import { configService, serviceStatus } from '@/services'

// 檢查網路狀態
const isOnline = await serviceStatus.checkApiConnection()

if (isOnline) {
  configService.switchToHybridMode()
  console.log('切換到混合模式')
} else {
  configService.switchToLocalMode()
  console.log('切換到離線模式')
}

// 監聽配置變更
const unsubscribe = configService.onConfigChange((config) => {
  console.log('資料源策略:', config.dataSource.strategy)
})
```

## 同步機制

### 1. 自動同步

系統會在以下情況自動觸發同步：
- 應用啟動時
- 網路恢復時  
- 定期同步 (根據 `SYNC_INTERVAL` 設定)
- 資料修改後

### 2. 手動同步

```typescript
import { getSyncManager } from '@/services'

const syncManager = getSyncManager()
if (syncManager) {
  // 立即同步
  const result = await syncManager.triggerSync()
  console.log('同步結果:', result)
  
  // 同步特定實體
  await syncManager.sync({ entities: ['tasks'] })
  
  // 強制完整同步
  await syncManager.sync({ forceSync: true })
}
```

### 3. 同步狀態監控

```typescript
const syncManager = getSyncManager()
if (syncManager) {
  // 獲取當前狀態
  const status = syncManager.getSyncStatus()
  console.log('同步狀態:', status)
  
  // 監聽狀態變更
  const unsubscribe = syncManager.onSyncStatusChange((status) => {
    if (status.isRunning) {
      console.log('同步進行中:', status.currentEntity)
    } else {
      console.log('同步完成:', status.lastSyncAt)
    }
  })
  
  // 取消監聽
  unsubscribe()
}
```

### 4. 快取管理

```typescript
// 清除所有快取
await syncManager.clearAllCaches()

// 獲取所有 Repository 同步狀態
const allStatus = syncManager.getAllRepositorySyncStatus()
console.log('Repository 狀態:', allStatus)
```

## 錯誤處理

### 1. API 錯誤類型

系統提供 12 種專業錯誤類型：

```typescript
import { 
  NetworkError, 
  TimeoutError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  BadRequestError,
  ServerError 
} from '@/services'

try {
  const task = await taskService.createTask(taskData)
} catch (error) {
  if (error instanceof NetworkError) {
    showToast('網路連接失敗，請檢查連接後重試')
  } else if (error instanceof AuthenticationError) {
    router.push('/login')
  } else if (error instanceof NotFoundError) {
    showToast('請求的資源不存在')
  } else if (error instanceof BadRequestError) {
    showValidationErrors(error.validationErrors)
  } else {
    showToast('操作失敗，請稍後重試')
  }
}
```

### 2. 錯誤恢復策略

```typescript
import { isRetryableError, ApiErrorHandler } from '@/services'

try {
  await taskService.updateTask(taskId, updates)
} catch (error) {
  // 記錄錯誤
  if (error instanceof ApiError) {
    ApiErrorHandler.logError(error, { taskId, operation: 'update' })
  }
  
  // 檢查是否可重試
  if (isRetryableError(error)) {
    // 顯示重試選項
    showRetryDialog(() => taskService.updateTask(taskId, updates))
  } else {
    // 顯示錯誤訊息
    showErrorMessage(ApiErrorHandler.getUserFriendlyMessage(error))
  }
}
```

### 3. 全域錯誤處理

```typescript
// 在 Vue 應用中設定全域錯誤處理
app.config.errorHandler = (error) => {
  if (error instanceof ApiError) {
    const message = ApiErrorHandler.getUserFriendlyMessage(error)
    showGlobalErrorToast(message)
  }
}
```

## 最佳實踐

### 1. 服務使用

```typescript
// ✅ 推薦：使用適配器
import { taskService } from '@/services'
const tasks = await taskService.getTasksByProject(projectId)

// ❌ 不推薦：直接使用具體服務
import { TaskApiService } from '@/services/domain/task-api.service'
const service = new TaskApiService(httpService)
```

### 2. 錯誤處理

```typescript
// ✅ 推薦：具體錯誤類型處理
if (error instanceof NetworkError) {
  // 網路錯誤處理
} else if (error instanceof AuthenticationError) {
  // 認證錯誤處理
}

// ❌ 不推薦：通用錯誤處理
try {
  // 操作
} catch (error) {
  console.error(error) // 缺乏具體處理
}
```

### 3. 配置管理

```typescript
// ✅ 推薦：使用配置服務
import { configService } from '@/services'
if (configService.isApiEnabled()) {
  // API 相關操作
}

// ❌ 不推薦：直接檢查環境變數
if (process.env.ENABLE_API_INTEGRATION === 'true') {
  // 不夠靈活
}
```

### 4. 同步操作

```typescript
// ✅ 推薦：監聽同步狀態
const syncManager = getSyncManager()
syncManager?.onSyncStatusChange((status) => {
  updateSyncIndicator(status)
})

// ❌ 不推薦：阻塞同步
await syncManager.triggerSync() // 可能很耗時
```

### 5. 快取策略

```typescript
// ✅ 推薦：讓系統自動管理快取
const tasks = await taskService.getTasksByProject(projectId)
// 系統會自動選擇快取或 API

// ❌ 不推薦：手動管理快取
const cachedTasks = localStorage.getItem('tasks')
if (!cachedTasks) {
  // 手動快取邏輯
}
```

## 疑難排解

### 1. API 連接問題

**問題**: API 無法連接
```bash
# 檢查後端服務狀態
curl http://localhost:3000/api/health

# 檢查網路連接
ping localhost
```

**解決方案**:
```typescript
import { serviceStatus } from '@/services'

// 檢查連接狀態
const isConnected = await serviceStatus.checkApiConnection()
if (!isConnected) {
  console.log('API 不可用，已自動切換到離線模式')
}
```

### 2. 同步問題

**問題**: 資料同步失敗
```typescript
// 檢查同步狀態
const syncManager = getSyncManager()
const status = syncManager?.getSyncStatus()
console.log('同步狀態:', status)

// 查看同步錯誤
const repoStatus = syncManager?.getAllRepositorySyncStatus()
console.log('Repository 狀態:', repoStatus)
```

**解決方案**:
```typescript
// 清除快取並重新同步
await syncManager?.clearAllCaches()
await syncManager?.triggerSync({ forceSync: true })
```

### 3. 配置問題

**問題**: 配置未生效
```typescript
// 檢查當前配置
import { configService } from '@/services'
console.log('當前配置:', configService.config)

// 重新檢測配置
await configService.redetectConfig()
```

### 4. 效能問題

**問題**: API 請求過慢
```env
# 調整超時設定
API_TIMEOUT=5000

# 調整重試次數
API_RETRY_ATTEMPTS=1

# 調整快取時間
CACHE_TIMEOUT=600000
```

### 5. 記憶體問題

**問題**: 快取佔用過多記憶體
```typescript
// 定期清理快取
setInterval(async () => {
  const syncManager = getSyncManager()
  await syncManager?.clearAllCaches()
}, 30 * 60 * 1000) // 每 30 分鐘清理一次
```

### 6. 除錯工具

```typescript
// 啟用除錯模式
localStorage.setItem('debug', 'api:*')

// 查看服務狀態
console.table(serviceStatus.getServiceStatus())

// 匯出配置
console.log(configService.exportConfig())

// 查看容器註冊
console.log(container)
```

### 7. 常見錯誤碼

| 錯誤碼 | 說明 | 解決方案 |
|--------|------|----------|
| `NETWORK_ERROR` | 網路連接失敗 | 檢查網路連接 |
| `TIMEOUT_ERROR` | 請求超時 | 增加 `API_TIMEOUT` 設定 |
| `AUTHENTICATION_ERROR` | 認證失敗 | 重新登入 |
| `NOT_FOUND_ERROR` | 資源不存在 | 檢查資源 ID |
| `SERVER_ERROR` | 伺服器錯誤 | 檢查後端服務日誌 |

---

## 總結

API 整合系統提供了企業級的解決方案，具備：

- 🔄 **智慧切換**: 自動選擇最佳資料源
- 🛡️ **錯誤恢復**: 完善的錯誤處理機制  
- 📱 **離線支援**: 無縫的離線體驗
- 🔧 **易於配置**: 環境驅動的配置系統
- 🔒 **向下相容**: 零破壞性變更

使用本指南可以快速上手 API 整合功能，充分發揮系統的強大能力！