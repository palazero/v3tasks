# API 整合實作文件

## 概覽

本專案現已支援完整的後端 API 整合，提供本地 IndexedDB 與遠端 API 的雙重資料源支援。系統採用企業級 DDD 架構，具備完整的錯誤處理、同步機制和離線支援。

## 核心特點

### ✅ 零破壞性變更
- 現有程式碼無需修改即可使用 API 功能
- 服務適配器提供完整向下相容性
- 自動回退機制確保穩定性

### ✅ 智慧資料源策略
- **Hybrid 模式**: 智慧選擇本地/遠端資料源
- **API-First 模式**: 優先使用 API，失敗時回退本地
- **Local-Only 模式**: 僅使用本地 IndexedDB

### ✅ 企業級架構
- 依賴注入容器系統
- Repository 模式抽象化資料存取
- 完整的錯誤處理與監控
- 配置驅動的功能開關

### ✅ 離線優先設計
- 自動網路狀態檢測
- 本地資料快取與同步
- 衝突解決機制
- 增量同步支援

## API 端點配置

### 預設配置
```typescript
API_BASE_URL=http://localhost:3000/api
```

### 支援的端點
```
GET  /health                    # 健康檢查
GET  /tasks                     # 取得任務列表
POST /tasks                     # 建立任務
GET  /tasks/:id                 # 取得單一任務
PUT  /tasks/:id                 # 更新任務
DELETE /tasks/:id               # 刪除任務
PATCH /tasks/batch-status       # 批量更新狀態

GET  /projects                  # 取得專案列表
POST /projects                  # 建立專案
GET  /projects/:id              # 取得單一專案
PUT  /projects/:id              # 更新專案
DELETE /projects/:id            # 刪除專案

GET  /users                     # 取得用戶列表
POST /users                     # 建立用戶
GET  /users/:id                 # 取得單一用戶
PUT  /users/:id                 # 更新用戶
DELETE /users/:id               # 刪除用戶
```

## 使用方式

### 1. 環境配置

複製環境變數範本：
```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# 啟用 API 整合
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=hybrid

# API 設定
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=10000

# 同步設定
ENABLE_SYNC=true
SYNC_INTERVAL=30000
```

### 2. 啟動檔案註冊

在 `quasar.config.ts` 中註冊啟動檔案：
```typescript
boot: [
  'auth',
  'api-integration' // 新增
]
```

### 3. 服務使用方式

#### 方式一：使用適配器（推薦）
```typescript
import { taskService, projectService, userService } from '@/services'

// 自動選擇 API 或本地實作
const tasks = await taskService.getTasksByProject(projectId)
const statistics = await taskService.getTaskStatistics(projectId)
```

#### 方式二：使用 Vue 組合式 API
```typescript
export default defineComponent({
  setup() {
    // 從 Vue 實例取得服務
    const { proxy } = getCurrentInstance()!
    const taskService = proxy.$services.getTaskService()
    
    const loadTasks = async () => {
      return await taskService.getTasksByProject(projectId.value)
    }
    
    return { loadTasks }
  }
})
```

#### 方式三：直接使用服務工廠
```typescript
import { ServiceFactory } from '@/services'
import { container } from '@/services/infrastructure/container/service-container'

const taskService = ServiceFactory.getTaskService(container)
const tasks = await taskService.getTasksByProject(projectId)
```

### 4. 配置管理

```typescript
import { configService } from '@/services'

// 檢查 API 狀態
if (configService.isApiEnabled()) {
  // API 模式功能
  const stats = await taskService.getTaskStatistics()
}

// 切換模式
configService.switchToApiMode()     // API 模式
configService.switchToLocalMode()  // 本地模式  
configService.switchToHybridMode() // 混合模式

// 監聽配置變更
const unsubscribe = configService.onConfigChange((config) => {
  console.log('配置已變更:', config.dataSource.strategy)
})
```

### 5. 同步管理

```typescript
import { getSyncManager } from '@/services'

const syncManager = getSyncManager()
if (syncManager) {
  // 手動觸發同步
  const result = await syncManager.triggerSync()
  
  // 監聽同步狀態
  syncManager.onSyncStatusChange((status) => {
    console.log('同步狀態:', status)
  })
  
  // 清除快取
  await syncManager.clearAllCaches()
}
```

## 架構說明

### 分層架構
```
展示層 (Views/Components)
    ↓
應用層 (Composables/Hooks)  
    ↓
領域層 (Services/Business Logic)
    ↓
基礎設施層 (Repositories/API/Storage)
```

### 核心組件

#### 1. HTTP 服務 (`HttpService`)
- 基於 Axios 的 HTTP 客戶端
- 自動重試機制
- 請求/回應攔截器
- 認證令牌管理

#### 2. API Repository (`BaseApiRepository`)
- 雙重資料源支援
- 智慧快取策略
- 自動同步機制
- 離線支援

#### 3. 服務適配器 (`ServiceAdapter`)
- 向下相容性保證
- 自動服務選擇
- 方法代理
- 功能檢測

#### 4. 配置管理 (`ConfigManager`)
- 環境變數管理
- 執行時配置檢測
- 配置變更通知
- 功能開關控制

#### 5. 同步管理 (`SyncManagerService`)
- 定期資料同步
- 衝突解決
- 批量操作
- 錯誤恢復

### 資料流向

#### API 模式
```
UI → Service → ApiRepository → HTTP → API Server
                     ↓
                LocalDB (Cache)
```

#### 離線模式  
```
UI → Service → LocalRepository → IndexedDB
```

#### 混合模式
```
UI → Service → ApiRepository → HTTP → API Server (成功)
                     ↓              ↓ (失敗)
                LocalDB ← ← ← LocalDB (回退)
```

## 錯誤處理

### API 錯誤類型
- `NetworkError`: 網路連接錯誤
- `TimeoutError`: 請求超時
- `AuthenticationError`: 認證失敗
- `AuthorizationError`: 權限不足
- `NotFoundError`: 資源不存在
- `ServerError`: 伺服器錯誤

### 錯誤處理策略
```typescript
try {
  const task = await taskService.createTask(taskData)
} catch (error) {
  if (error instanceof NetworkError) {
    // 網路錯誤：提示用戶檢查連接
    showNetworkErrorMessage()
  } else if (error instanceof AuthenticationError) {
    // 認證錯誤：重定向到登入頁面
    router.push('/login')
  } else {
    // 其他錯誤：顯示通用錯誤訊息
    showGenericErrorMessage(error.message)
  }
}
```

## 效能優化

### 快取策略
- **Cache-First**: 本地快取優先，適用於變更少的資料
- **Network-First**: 網路優先，適用於即時性要求高的資料
- **Stale-While-Revalidate**: 先返回快取，背景更新

### 批量操作
```typescript
// 批量更新任務狀態
const updates = taskIds.map(id => ({ id, updates: { status: 'done' } }))
const results = await taskService.batchUpdateTasks(updates)
```

### 增量同步
系統支援增量同步，只同步變更的資料：
- 追蹤資料變更時間戳
- 僅同步 `_isDirty` 標記的記錄
- 衝突解決基於最後修改時間

## 測試策略

### API 可用性測試
```typescript
import { checkApiAvailability } from '@/services'

const isApiReady = await checkApiAvailability(container)
if (!isApiReady) {
  // 回退到本地模式
}
```

### 離線模式測試
```typescript
// 模擬離線狀態
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false
})

// 測試離線功能
const tasks = await taskService.getTasksByProject(projectId)
// 應該從本地快取返回資料
```

## 部署考量

### 環境配置
- **開發環境**: `DATA_SOURCE_STRATEGY=hybrid`
- **測試環境**: `DATA_SOURCE_STRATEGY=api`
- **生產環境**: 根據實際需求配置

### 監控項目
- API 回應時間
- 同步成功率
- 快取命中率
- 離線使用率

### 效能指標
- 首次載入時間
- 離線切換時間
- 同步完成時間
- 記憶體使用量

## 故障排除

### 常見問題

#### 1. API 連接失敗
```bash
# 檢查 API 伺服器狀態
curl http://localhost:3000/api/health
```

#### 2. 同步不工作
檢查配置：
- `ENABLE_SYNC=true`
- `ENABLE_API_INTEGRATION=true`
- 網路連接狀態

#### 3. 資料不一致
執行完整同步：
```typescript
const syncManager = getSyncManager()
await syncManager.clearAllCaches()
await syncManager.triggerSync()
```

### 除錯工具
```typescript
// 查看服務狀態
import { serviceStatus } from '@/services'
console.log(serviceStatus.getServiceStatus())

// 查看同步狀態  
console.log(serviceStatus.getSyncStatus())

// 檢查 API 連接
const isConnected = await serviceStatus.checkApiConnection()
```

## 未來規劃

### Phase 6: 進階功能
- [ ] ProjectApiService 完整實作
- [ ] UserApiService 身份認證整合
- [ ] 即時資料推送 (WebSocket)
- [ ] 資料版本控制

### Phase 7: 效能優化
- [ ] Service Worker 快取策略
- [ ] 背景同步
- [ ] 資料壓縮
- [ ] CDN 整合

### Phase 8: 監控與分析
- [ ] 錯誤監控 (Sentry)
- [ ] 效能監控 (Web Vitals)
- [ ] 使用者行為分析
- [ ] A/B 測試框架

---

## 總結

後端 API 整合已完成！系統現在支援：

✅ **完整 API 整合** - 與 localhost:3000 後端服務無縫整合  
✅ **零破壞性變更** - 現有程式碼無需修改  
✅ **智慧資料源** - 自動選擇最佳資料來源  
✅ **離線優先** - 完整離線支援與同步機制  
✅ **企業級架構** - DDD 分層設計，依賴注入，錯誤處理  
✅ **向下相容** - 漸進式遷移，平滑切換  

系統已準備就緒，可開始與後端 API 服務整合。