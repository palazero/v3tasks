# 系統架構文件

## 概覽

V3Tasks 是一個現代化的專案任務管理系統，採用企業級 DDD (領域驅動設計) 架構，支援本地 IndexedDB 與遠端 API 的混合式資料源。

## 技術棧

### 前端技術
- **框架**: Vue 3.4.18 + Composition API
- **UI 框架**: Quasar 2.16.0 + Material Design
- **狀態管理**: Pinia 3.0.1
- **語言**: TypeScript 5.5.3
- **建置工具**: Vite + Quasar CLI

### 專案依賴
- **拖拽排序**: vue-draggable-plus 0.6.0
- **甘特圖**: @infectoone/vue-ganttastic 2.3.2
- **圖表**: Chart.js 4.5.0 + vue-chartjs 5.3.2
- **資料庫**: Dexie.js 4.0.11 (IndexedDB)
- **HTTP 客戶端**: Axios 1.2.1
- **唯一 ID**: nanoid 5.1.5

### 開發工具
- **程式碼規範**: ESLint 9.14.0 + Prettier 3.3.3
- **類型檢查**: vue-tsc 2.0.29
- **版本控制**: Git

## 架構設計

### 1. 分層架構

```
┌─────────────────────────────────────────────────────────┐
│                    展示層 (Presentation)                  │
│  - Views (AllTasksView, ProjectView, ProjectSettingsView) │
│  - Components (TaskDialog, TaskItem, TaskCard)           │
│  - Layouts (MainLayout)                                  │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    應用層 (Application)                   │
│  - Composables (useNestedTasks, useTaskDependencies)     │
│  - Services (ColumnConfigService, ViewConfigService)     │
│  - Adapters (ServiceAdapter - 向下相容層)                 │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    領域層 (Domain)                       │
│  - Services (TaskService, ProjectService, UserService)   │
│  - API Services (TaskApiService, ProjectApiService)      │
│  - Business Logic (任務依賴、巢狀結構、權限控制)            │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                  基礎設施層 (Infrastructure)              │
│  - Repositories (BaseRepository, BaseApiRepository)      │
│  - HTTP Services (HttpService, API Error Handling)       │
│  - Database (Dexie + IndexedDB)                         │
│  - Configuration (ConfigManager)                        │
│  - DI Container (ServiceContainer)                      │
└─────────────────────────────────────────────────────────┘
```

### 2. 目錄結構

```
src/
├── boot/                        # Quasar boot 檔案
│   ├── auth.ts                 # 身份驗證初始化
│   └── api-integration.ts      # API 整合初始化
│
├── components/                  # Vue 元件
│   ├── charts/                 # 圖表元件
│   ├── common/                 # 通用元件
│   ├── fields/                 # 自訂欄位元件
│   ├── layout/                 # 佈局元件
│   ├── project/                # 專案相關元件
│   ├── settings/               # 設定頁面元件
│   ├── task/                   # 任務相關元件
│   └── views/                  # 視圖元件 (List, Table, Board, Gantt)
│
├── composables/                # Vue Composition API
│   ├── useAuth.ts              # 身份驗證
│   ├── useCustomFields.ts      # 自訂欄位
│   ├── useNestedTasks.ts       # 巢狀任務
│   ├── usePermissions.ts       # 權限控制
│   ├── useTaskDependencies.ts  # 任務依賴
│   └── useViewConfiguration.ts # 視圖配置
│
├── layouts/                    # 頁面佈局
│   └── MainLayout.vue          # 主要佈局
│
├── pages/                      # 頁面元件
│   ├── AllTasksView.vue        # 所有任務頁面
│   ├── ProjectView.vue         # 專案詳情頁面
│   └── ProjectSettingsView.vue # 專案設定頁面
│
├── router/                     # Vue Router
│   ├── index.ts                # 路由配置
│   └── routes.ts               # 路由定義
│
├── services/                   # 服務層
│   ├── adapters/               # 適配器 (向下相容)
│   │   └── service-adapter.ts  # 統一服務適配器
│   │
│   ├── application/            # 應用服務
│   │   ├── column-config.service.ts
│   │   └── view-config.service.ts
│   │
│   ├── domain/                 # 領域服務
│   │   ├── project.service.ts
│   │   ├── statistics.service.ts
│   │   ├── task.service.ts
│   │   ├── task-api.service.ts # API 增強版任務服務
│   │   └── user.service.ts
│   │
│   ├── infrastructure/         # 基礎設施
│   │   ├── config/             # 配置管理
│   │   │   └── app.config.ts   # 應用配置
│   │   │
│   │   ├── container/          # 依賴注入
│   │   │   ├── service-container.ts
│   │   │   └── service-providers.ts
│   │   │
│   │   ├── database/           # 資料庫
│   │   │   └── db/database.ts  # Dexie 配置
│   │   │
│   │   ├── errors/             # 錯誤處理
│   │   │   └── repository.errors.ts
│   │   │
│   │   ├── events/             # 事件匯流排
│   │   │   └── event-bus.service.ts
│   │   │
│   │   ├── http/               # HTTP 服務
│   │   │   ├── api.errors.ts   # API 錯誤處理
│   │   │   ├── http.service.ts # HTTP 客戶端
│   │   │   └── index.ts
│   │   │
│   │   └── sync/               # 同步管理
│   │       └── sync-manager.service.ts
│   │
│   ├── repositories/           # 資料存取層
│   │   ├── base.repository.ts          # 基礎 Repository
│   │   ├── base-api.repository.ts      # API Repository 基類
│   │   ├── project.repository.ts       # 專案 Repository
│   │   ├── project-api.repository.ts   # 專案 API Repository
│   │   ├── task.repository.ts          # 任務 Repository
│   │   ├── task-api.repository.ts      # 任務 API Repository
│   │   ├── user.repository.ts          # 用戶 Repository
│   │   ├── user-api.repository.ts      # 用戶 API Repository
│   │   └── view.repository.ts          # 視圖 Repository
│   │
│   └── index.ts                # 服務統一入口
│
├── stores/                     # Pinia 狀態管理
│   ├── user.ts                 # 用戶狀態
│   ├── task.ts                 # 任務狀態
│   └── view.ts                 # 視圖狀態
│
└── types/                      # TypeScript 類型
    └── index.ts                # 核心類型定義
```

### 3. 資料流向

#### 3.1 本地模式資料流
```
UI Component → Composable → Domain Service → Local Repository → IndexedDB
```

#### 3.2 API 模式資料流
```
UI Component → Composable → API Service → API Repository → HTTP Service → Backend API
                                              ↓
                                         Local Cache (IndexedDB)
```

#### 3.3 混合模式資料流
```
UI Component → Composable → API Service → API Repository 
                                              ↓
                                    [Network Available?]
                                     ↓              ↓
                               HTTP Service      Local Repository
                                     ↓              ↓
                               Backend API      IndexedDB Cache
                                     ↓              ↑
                               Update Cache ←――――――――┘
```

## 核心組件設計

### 1. 依賴注入容器

```typescript
// 服務容器 - 統一管理服務生命週期
export class ServiceContainer implements IServiceContainer {
  registerSingleton<T>(token: symbol, factory: () => T): void
  resolve<T>(token: symbol): T
  createScope(): IServiceContainer
}

// 服務令牌定義
export const SERVICE_TOKENS = {
  TASK_SERVICE: Symbol('TaskService'),
  TASK_API_SERVICE: Symbol('TaskApiService'),
  HTTP_SERVICE: Symbol('HttpService'),
  CONFIG_MANAGER: Symbol('ConfigManager')
}
```

### 2. Repository 模式

```typescript
// 基礎 Repository - 本地資料存取
export abstract class BaseRepository<T> implements IRepository<T> {
  async findById(id: string): Promise<T | null>
  async create(data: Omit<T, 'id'>): Promise<T>
  async update(id: string, updates: Partial<T>): Promise<T>
  async delete(id: string): Promise<void>
}

// API Repository - 混合式資料存取
export abstract class BaseApiRepository<T> extends BaseRepository<T> {
  constructor(
    table: Table<T>,
    httpService: IHttpService,
    config: ApiRepositoryConfig
  )
  
  // 自動選擇資料源
  async findById(id: string): Promise<T | null> {
    switch (this.config.strategy) {
      case 'API_FIRST': return this.findByIdApiFirst(id)
      case 'LOCAL_FIRST': return this.findByIdLocalFirst(id)
      case 'HYBRID': return this.findByIdHybrid(id)
    }
  }
}
```

### 3. 配置管理系統

```typescript
// 應用配置
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
  }
  dataSource: {
    strategy: 'local' | 'api' | 'hybrid'
    enableOffline: boolean
    cacheTimeout: number
  }
  features: {
    enableApiIntegration: boolean
    enableSync: boolean
  }
}

// 配置管理器
export class ConfigManager {
  async initialize(): Promise<AppConfig>
  updateConfig(updates: Partial<AppConfig>): void
  onConfigChange(listener: (config: AppConfig) => void): () => void
  switchToApiMode(): void
  switchToLocalMode(): void
}
```

### 4. HTTP 服務

```typescript
// HTTP 客戶端
export class HttpService implements IHttpService {
  constructor(config: HttpServiceConfig)
  
  async get<T>(url: string): Promise<HttpResponse<T>>
  async post<T>(url: string, data: any): Promise<HttpResponse<T>>
  
  setAuthToken(token: string): void
  async healthCheck(): Promise<boolean>
}

// API 錯誤處理
export class ApiErrorFactory {
  static fromAxiosError(error: AxiosError): ApiError
}

export class ApiErrorHandler {
  static logError(error: ApiError): void
  static shouldRetry(error: ApiError): boolean
  static getUserFriendlyMessage(error: ApiError): string
}
```

### 5. 同步管理

```typescript
// 同步管理器
export class SyncManagerService {
  registerRepository(name: string, repository: any): void
  async sync(options?: SyncOptions): Promise<SyncResult>
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void
  
  startPeriodicSync(): void
  stopPeriodicSync(): void
  async clearAllCaches(): Promise<void>
}
```

### 6. 服務適配器

```typescript
// 向下相容適配器
class TaskServiceAdapter {
  private get service() {
    return ServiceFactory.getTaskService(container)
  }
  
  async createTask(...args: any[]) {
    return this.service.createTask(...args)
  }
  
  // 自動代理所有方法
}

// 統一服務入口
export const services = {
  task: taskService,
  project: projectService,
  user: userService,
  config: configService
}
```

## 資料模型設計

### 1. 核心實體

#### Task (任務)
```typescript
interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  progress: number
  
  // 關聯
  projectId?: string
  assigneeId?: string
  parentTaskId?: string
  dependencies: string[]
  
  // 時間
  startDateTime?: string
  endDateTime?: string
  completedAt?: string
  
  // 自訂
  customFields: Record<string, any>
  tags: string[]
  
  // 系統
  createdAt: string
  updatedAt: string
  _lastSyncAt?: string  // API 同步標記
  _isDirty?: boolean    // 本地修改標記
}
```

#### Project (專案)
```typescript
interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  
  // 配置
  visibility: 'public' | 'private'
  status: 'active' | 'archived' | 'completed'
  icon?: string
  color?: string
  
  // 成員
  members: ProjectMember[]
  
  // 自訂欄位
  customFields: CustomField[]
  
  // 時間
  startDate?: string
  endDate?: string
  
  // 系統
  createdAt: string
  updatedAt: string
  isArchived?: boolean
  archivedAt?: string
}
```

#### User (用戶)
```typescript
interface User {
  id: string
  username: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  
  // 狀態
  isActive: boolean
  lastLoginAt?: string
  
  // 偏好
  preferences: UserPreferences
  
  // 系統
  createdAt: string
  updatedAt: string
}
```

### 2. 視圖配置

#### ViewConfiguration (視圖配置)
```typescript
interface ViewConfiguration {
  id: string
  projectId: string
  viewType: ViewType
  name: string
  
  // 顯示設定
  columns: ColumnConfig[]
  filters: FilterConfig[]
  sorting: SortConfig[]
  
  // 選項
  showCompleted: boolean
  groupBy?: string
  compactMode: boolean
  
  // 系統
  createdAt: string
  updatedAt: string
}
```

## 狀態管理設計

### 1. Pinia Store 架構

```typescript
// 用戶狀態
export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const simulatedUsers = ref<User[]>([])
  
  // Actions
  const setCurrentUser = (user: User) => {
    currentUser.value = user
  }
  
  // Getters
  const isAuthenticated = computed(() => !!currentUser.value)
  const hasRole = (role: UserRole) => computed(() => 
    currentUser.value?.role === role
  )
  
  return {
    currentUser,
    simulatedUsers,
    setCurrentUser,
    isAuthenticated,
    hasRole
  }
})
```

### 2. 響應式狀態同步

```typescript
// 監聽配置變更並更新 UI
configManager.onConfigChange((config) => {
  // 更新全域狀態
  const uiStore = useUIStore()
  uiStore.updateApiStatus(config.features.enableApiIntegration)
  
  // 重新初始化服務
  reinitializeServices()
})
```

## 安全性設計

### 1. 身份驗證

```typescript
// 模擬用戶系統
const SIMULATED_USERS = [
  { id: 'admin-1', role: 'admin', name: 'Admin' },
  { id: 'owner-1', role: 'user', name: 'Project Owner' },
  { id: 'member-1', role: 'user', name: 'Team Member' }
]

// API 認證 (Token-based)
class AuthService {
  async authenticate(credentials: LoginCredentials): Promise<AuthResult>
  async refreshToken(refreshToken: string): Promise<TokenResult>
  setAuthToken(token: string): void
  clearAuthToken(): void
}
```

### 2. 權限控制

```typescript
// 權限檢查
export const usePermissions = () => {
  const checkProjectAccess = (project: Project, action: string): boolean => {
    const user = useUserStore().currentUser
    if (!user) return false
    
    // 管理員擁有所有權限
    if (user.role === 'admin') return true
    
    // 專案擁有者權限
    if (project.ownerId === user.id) return true
    
    // 成員權限檢查
    const member = project.members?.find(m => m.userId === user.id)
    return member ? checkMemberPermission(member.role, action) : false
  }
  
  return { checkProjectAccess }
}
```

### 3. 資料驗證

```typescript
// 輸入驗證
export const validateTaskData = (data: CreateTaskRequest): ValidationResult => {
  const errors: ValidationError[] = []
  
  if (!data.title?.trim()) {
    errors.push({ field: 'title', message: '標題為必填欄位' })
  }
  
  if (data.title && data.title.length > 200) {
    errors.push({ field: 'title', message: '標題長度不能超過200字元' })
  }
  
  return { isValid: errors.length === 0, errors }
}
```

## 效能優化設計

### 1. 虛擬滾動

```typescript
// 大量資料渲染優化
import { VirtualList } from '@tanstack/vue-virtual'

const TaskVirtualList = () => {
  const tasks = ref<Task[]>([])
  
  return {
    VirtualList,
    tasks,
    itemHeight: 60,
    containerHeight: 400
  }
}
```

### 2. 計算屬性快取

```typescript
// 巢狀任務結構快取
export const useNestedTasks = () => {
  const tasksTree = computed(() => {
    // 複雜的樹狀結構計算
    return buildTaskTree(tasks.value)
  })
  
  // 只有在 tasks 變更時才重新計算
  return { tasksTree }
}
```

### 3. 防抖處理

```typescript
// 搜尋防抖
import { debounce } from 'lodash-es'

const debouncedSearch = debounce(async (query: string) => {
  const results = await taskService.searchTasks(query)
  searchResults.value = results
}, 300)
```

### 4. 快取策略

```typescript
// 多層快取系統
class CacheManager {
  // L1: 記憶體快取 (最快)
  private memoryCache = new Map<string, any>()
  
  // L2: IndexedDB 快取 (持久化)
  private async getFromIndexedDB(key: string): Promise<any>
  
  // L3: API 請求 (最慢但最新)
  private async getFromApi(key: string): Promise<any>
  
  async get(key: string): Promise<any> {
    // 按優先級依次嘗試
    return this.memoryCache.get(key) ||
           await this.getFromIndexedDB(key) ||
           await this.getFromApi(key)
  }
}
```

## 測試策略

### 1. 單元測試

```typescript
// 服務測試
describe('TaskService', () => {
  let taskService: TaskService
  
  beforeEach(() => {
    taskService = new TaskService()
  })
  
  it('should create task successfully', async () => {
    const taskData = { title: 'Test Task' }
    const result = await taskService.createTask(taskData)
    
    expect(result.id).toBeDefined()
    expect(result.title).toBe('Test Task')
  })
})
```

### 2. 整合測試

```typescript
// API 整合測試
describe('API Integration', () => {
  it('should switch to local mode when API unavailable', async () => {
    // 模擬 API 不可用
    mockHttpService.healthCheck.mockResolvedValue(false)
    
    await configManager.initialize()
    
    expect(configManager.getDataSourceStrategy()).toBe('local')
  })
})
```

### 3. E2E 測試

```typescript
// 端到端測試
describe('Task Management Flow', () => {
  it('should create and edit task', () => {
    cy.visit('/projects/1')
    cy.get('[data-cy=add-task]').click()
    cy.get('[data-cy=task-title]').type('New Task')
    cy.get('[data-cy=save-task]').click()
    
    cy.contains('New Task').should('be.visible')
  })
})
```

## 部署架構

### 1. 前端部署
```bash
# 建置
npm run build

# 部署到靜態主機 (Netlify, Vercel, GitHub Pages)
# 或部署到 CDN
```

### 2. 後端 API 部署
```bash
# Docker 容器化
docker build -t v3tasks-api .
docker run -p 3000:3000 v3tasks-api

# 或部署到雲端服務 (AWS, GCP, Azure)
```

### 3. 資料庫部署
```bash
# 關聯式資料庫 (PostgreSQL, MySQL)
# 或 NoSQL 資料庫 (MongoDB, Firebase)
```

## 監控與維護

### 1. 錯誤監控

```typescript
// 整合 Sentry 錯誤監控
import * as Sentry from '@sentry/vue'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  integrations: [
    new Sentry.BrowserTracing()
  ]
})

// 自動捕獲 API 錯誤
ApiErrorHandler.onError((error) => {
  Sentry.captureException(error)
})
```

### 2. 效能監控

```typescript
// Web Vitals 監控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

### 3. 使用者行為分析

```typescript
// Google Analytics 整合
import { gtag } from 'ga-gtag'

// 追蹤關鍵操作
const trackTaskCreation = (task: Task) => {
  gtag('event', 'task_created', {
    task_id: task.id,
    project_id: task.projectId
  })
}
```

---

## 總結

V3Tasks 系統採用了現代化的企業級架構設計：

- **DDD 分層架構**: 清晰的職責分離
- **混合式資料源**: 智慧的本地/遠端切換
- **依賴注入**: 靈活的服務管理
- **完整錯誤處理**: 優雅的錯誤恢復
- **效能優化**: 多層次的快取策略
- **向下相容**: 零破壞性變更

此架構確保了系統的可維護性、擴展性和穩定性，為未來的功能擴展奠定了堅實基礎。