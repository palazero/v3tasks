# V3Tasks - 後端 API 整合文件

## 📚 文件概覽

本目錄包含 V3Tasks 系統後端 API 整合的完整技術文件：

| 文件名稱 | 說明 | 目標讀者 |
|----------|------|----------|
| [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) | **API 整合使用指南** | 前端開發者 |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | **API 端點規格文件** | 後端開發者 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **系統架構設計文件** | 系統架構師 |

## 🎯 快速導航

### 對前端開發者
- 想要**使用 API 功能**？請閱讀 [API 整合使用指南](./API_INTEGRATION_GUIDE.md)
- 需要了解**如何配置環境**？請參考 [快速開始章節](./API_INTEGRATION_GUIDE.md#快速開始)
- 遇到**問題需要除錯**？請查看 [疑難排解章節](./API_INTEGRATION_GUIDE.md#疑難排解)

### 對後端開發者
- 需要**實作 API 服務**？請參考 [API 端點規格文件](./API_ENDPOINTS.md)
- 想了解**請求回應格式**？請查看 [通用回應格式章節](./API_ENDPOINTS.md#通用回應格式)
- 需要**錯誤處理規範**？請閱讀 [錯誤回應章節](./API_ENDPOINTS.md#錯誤回應)

### 對系統架構師
- 想了解**整體架構設計**？請閱讀 [系統架構設計文件](./ARCHITECTURE.md)
- 需要了解**技術選型**？請查看 [技術棧章節](./ARCHITECTURE.md#技術棧)
- 關心**效能優化策略**？請參考 [效能優化設計章節](./ARCHITECTURE.md#效能優化設計)

## 🚀 核心特點

### ✅ 企業級架構
- **DDD 分層設計**: 清晰的職責分離
- **依賴注入容器**: 靈活的服務管理
- **Repository 模式**: 統一的資料存取抽象

### ✅ 智慧資料源
- **Hybrid 模式**: 智慧選擇本地/遠端資料源
- **離線優先**: 完整的離線體驗
- **自動同步**: 網路恢復時自動同步資料

### ✅ 零破壞性變更
- **向下相容**: 現有程式碼無需修改
- **服務適配器**: 自動代理服務方法
- **漸進式遷移**: 平滑的升級路徑

### ✅ 完整錯誤處理
- **12 種錯誤類型**: 涵蓋所有 API 錯誤場景
- **自動重試**: 智慧的重試機制
- **優雅降級**: API 失敗時自動回退本地

## 📋 API 端點概覽

### 核心服務
```
http://localhost:3000/api
├── /health                 # 健康檢查
├── /tasks                  # 任務管理
├── /projects               # 專案管理
├── /users                  # 用戶管理
└── /auth                   # 身份驗證
```

### 支援的操作
| 實體 | 操作 | 端點 |
|------|------|------|
| 任務 | CRUD + 批量操作 | `/tasks/*` |
| 專案 | CRUD + 成員管理 | `/projects/*` |
| 用戶 | CRUD + 認證 | `/users/*` |

## 🔧 環境配置

### 最小配置
```env
# .env
ENABLE_API_INTEGRATION=true
API_BASE_URL=http://localhost:3000/api
```

### 完整配置
```env
# API 設定
ENABLE_API_INTEGRATION=true
DATA_SOURCE_STRATEGY=hybrid
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3

# 同步設定
ENABLE_SYNC=true
SYNC_INTERVAL=30000
CACHE_TIMEOUT=300000

# 功能開關
ENABLE_OFFLINE_MODE=true
ENABLE_ERROR_TRACKING=false
```

## 📖 使用範例

### 基本使用
```typescript
import { taskService, configService } from '@/services'

// 檢查 API 狀態
if (configService.isApiEnabled()) {
  console.log('API 模式已啟用')
}

// 使用任務服務 (自動選擇 API 或本地)
const tasks = await taskService.getTasksByProject(projectId)
const stats = await taskService.getTaskStatistics(projectId)
```

### 配置管理
```typescript
import { configService } from '@/services'

// 切換資料源模式
configService.switchToApiMode()     // API 優先
configService.switchToLocalMode()  // 僅本地
configService.switchToHybridMode() // 混合模式

// 監聽配置變更
configService.onConfigChange((config) => {
  console.log('資料源策略:', config.dataSource.strategy)
})
```

### 同步管理
```typescript
import { getSyncManager } from '@/services'

const syncManager = getSyncManager()
if (syncManager) {
  // 手動同步
  await syncManager.triggerSync()
  
  // 監聽同步狀態
  syncManager.onSyncStatusChange((status) => {
    console.log('同步狀態:', status.isRunning)
  })
}
```

## 🔍 問題診斷

### 常見問題快速解決

#### API 無法連接
```bash
# 1. 檢查後端服務
curl http://localhost:3000/api/health

# 2. 檢查配置
echo $API_BASE_URL
```

#### 同步不工作
```typescript
// 檢查同步狀態
import { getSyncManager } from '@/services'
const syncManager = getSyncManager()
console.log(syncManager?.getSyncStatus())

// 強制同步
await syncManager?.triggerSync({ forceSync: true })
```

#### 配置未生效
```typescript
// 重新載入配置
import { configService } from '@/services'
await configService.redetectConfig()
```

## 📊 架構概覽

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

### 資料流向

#### 混合模式
```
UI → Service → API Repository → [Network?] → HTTP/IndexedDB
                     ↓
                Local Cache (IndexedDB)
```

#### 離線模式
```
UI → Service → Local Repository → IndexedDB
```

## 🛠️ 開發工具

### 除錯指令
```typescript
// 查看服務狀態
import { serviceStatus } from '@/services'
console.table(serviceStatus.getServiceStatus())

// 查看同步狀態
console.log(serviceStatus.getSyncStatus())

// 匯出配置
console.log(configService.exportConfig())
```

### 環境檢測
```typescript
// 檢查 API 連接
const isConnected = await serviceStatus.checkApiConnection()

// 檢查功能狀態
const status = {
  api: configService.isApiEnabled(),
  offline: configService.isOfflineModeEnabled(),
  sync: configService.isSyncEnabled()
}
```

## 📈 效能指標

### 關鍵指標
- **首次載入時間**: < 2 秒
- **離線切換時間**: < 100ms
- **同步完成時間**: < 5 秒 (1000 筆資料)
- **快取命中率**: > 80%

### 監控項目
- API 回應時間
- 同步成功率
- 錯誤發生率
- 記憶體使用量

## 🔄 版本相容性

| 版本 | 支援狀態 | 說明 |
|------|----------|------|
| v1.0.x | ✅ 完全支援 | 包含所有 API 整合功能 |
| v0.9.x | ⚠️ 部分支援 | 僅支援本地模式 |
| v0.8.x | ❌ 不支援 | 需要升級到 v1.0+ |

## 🤝 貢獻指南

### 開發流程
1. Fork 專案
2. 建立功能分支: `git checkout -b feature/new-feature`
3. 提交變更: `git commit -m 'feat: add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 建立 Pull Request

### 程式碼規範
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 撰寫單元測試
- 更新相關文件

## 📞 支援與回饋

### 獲得幫助
- 🐛 **Bug 報告**: [GitHub Issues](https://github.com/palazero/v3tasks/issues)
- 💡 **功能建議**: [GitHub Discussions](https://github.com/palazero/v3tasks/discussions)
- 📧 **技術支援**: palazero@gmail.com

### 社群資源
- 📖 **文件首頁**: [V3Tasks Docs](https://v3tasks.docs.example.com)
- 💬 **討論區**: [GitHub Discussions](https://github.com/palazero/v3tasks/discussions)
- 🎥 **教學影片**: [YouTube Channel](https://youtube.com/v3tasks)

---

## 🎉 開始使用

準備好體驗 V3Tasks 的強大 API 整合功能了嗎？

1. 📖 **閱讀文件**: 從 [API 整合使用指南](./API_INTEGRATION_GUIDE.md) 開始
2. ⚙️ **配置環境**: 複製 `.env.example` 並設定您的配置
3. 🚀 **啟動應用**: `npm run dev` 並享受無縫的 API 整合體驗！

歡迎來到 V3Tasks 的強大世界！🌟