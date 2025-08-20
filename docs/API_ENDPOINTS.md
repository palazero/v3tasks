# API 端點規格文件

## 概述

本文件定義了 V3Tasks 系統與後端 API 服務 (localhost:3000) 的完整介面規格。

## 基礎資訊

- **Base URL**: `http://localhost:3000/api`
- **認證方式**: Bearer Token
- **資料格式**: JSON
- **編碼**: UTF-8

## 通用回應格式

### 成功回應
```json
{
  "data": {}, // 實際資料
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 錯誤回應
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 健康檢查

### GET /health
檢查 API 服務狀態

**請求**:
```http
GET /api/health
```

**回應**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 任務管理 API

### GET /tasks
取得任務列表

**請求**:
```http
GET /api/tasks?projectId={projectId}&assigneeId={assigneeId}&status={status}&limit={limit}&offset={offset}
```

**查詢參數**:
- `projectId` (可選): 專案 ID
- `assigneeId` (可選): 指派人 ID  
- `status` (可選): 任務狀態 (`todo`, `inProgress`, `done`, `cancelled`)
- `priority` (可選): 優先級 (`low`, `medium`, `high`, `urgent`)
- `tags` (可選): 標籤 (逗號分隔)
- `limit` (可選): 返回數量限制 (預設: 100)
- `offset` (可選): 偏移量 (預設: 0)

**回應**:
```json
{
  "data": {
    "tasks": [
      {
        "id": "task-1",
        "title": "任務標題",
        "description": "任務描述",
        "status": "todo",
        "priority": "medium",
        "progress": 0,
        "projectId": "project-1",
        "assigneeId": "user-1",
        "createdBy": "user-1",
        "parentTaskId": null,
        "startDateTime": "2024-01-01T09:00:00.000Z",
        "endDateTime": "2024-01-02T17:00:00.000Z",
        "completedAt": null,
        "estimatedHours": 8,
        "actualHours": 0,
        "tags": ["frontend", "urgent"],
        "customFields": {
          "complexity": "high",
          "reviewer": "user-2"
        },
        "dependencies": ["task-2"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

### POST /tasks
建立新任務

**請求**:
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "新任務",
  "description": "任務描述",
  "projectId": "project-1",
  "assigneeId": "user-1",
  "parentTaskId": null,
  "status": "todo",
  "priority": "medium",
  "startDateTime": "2024-01-01T09:00:00.000Z",
  "endDateTime": "2024-01-02T17:00:00.000Z",
  "estimatedHours": 8,
  "tags": ["frontend"],
  "customFields": {
    "complexity": "medium"
  },
  "dependencies": []
}
```

**回應**:
```json
{
  "data": {
    "id": "task-123",
    "title": "新任務",
    // ... 其他任務欄位
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "任務建立成功"
}
```

### GET /tasks/{id}
取得單一任務

**請求**:
```http
GET /api/tasks/task-123
```

**回應**:
```json
{
  "data": {
    "id": "task-123",
    "title": "任務標題",
    // ... 完整任務資料
  }
}
```

### PUT /tasks/{id}
更新任務

**請求**:
```http
PUT /api/tasks/task-123
Content-Type: application/json

{
  "title": "更新後的標題",
  "status": "inProgress",
  "progress": 50,
  "actualHours": 4
}
```

**回應**:
```json
{
  "data": {
    "id": "task-123",
    "title": "更新後的標題",
    "status": "inProgress",
    // ... 更新後的完整資料
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "任務更新成功"
}
```

### DELETE /tasks/{id}
刪除任務

**請求**:
```http
DELETE /api/tasks/task-123
```

**回應**:
```json
{
  "message": "任務刪除成功"
}
```

### PATCH /tasks/batch-status
批量更新任務狀態

**請求**:
```http
PATCH /api/tasks/batch-status
Content-Type: application/json

{
  "taskIds": ["task-1", "task-2", "task-3"],
  "status": "done"
}
```

**回應**:
```json
{
  "data": {
    "updatedTasks": [
      {
        "id": "task-1",
        "status": "done",
        "completedAt": "2024-01-01T12:00:00.000Z",
        "progress": 100
      }
      // ... 其他更新的任務
    ]
  },
  "message": "批量更新成功"
}
```

### PATCH /tasks/{id}/move
移動任務到不同專案

**請求**:
```http
PATCH /api/tasks/task-123/move
Content-Type: application/json

{
  "projectId": "project-2"
}
```

**回應**:
```json
{
  "data": {
    "id": "task-123",
    "projectId": "project-2",
    // ... 更新後的任務資料
  },
  "message": "任務移動成功"
}
```

## 專案管理 API

### GET /projects
取得專案列表

**請求**:
```http
GET /api/projects?ownerId={ownerId}&status={status}&limit={limit}&offset={offset}
```

**查詢參數**:
- `ownerId` (可選): 擁有者 ID
- `status` (可選): 專案狀態 (`active`, `archived`, `completed`)
- `visibility` (可選): 可見性 (`public`, `private`)
- `limit` (可選): 返回數量限制
- `offset` (可選): 偏移量

**回應**:
```json
{
  "data": {
    "projects": [
      {
        "id": "project-1",
        "name": "專案名稱",
        "description": "專案描述",
        "ownerId": "user-1",
        "status": "active",
        "visibility": "private",
        "icon": "📋",
        "color": "#3498db",
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "isArchived": false,
        "archivedAt": null,
        "members": [
          {
            "userId": "user-1",
            "role": "owner",
            "joinedAt": "2024-01-01T00:00:00.000Z"
          },
          {
            "userId": "user-2", 
            "role": "member",
            "joinedAt": "2024-01-02T00:00:00.000Z"
          }
        ],
        "customFields": [],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### POST /projects
建立新專案

**請求**:
```http
POST /api/projects
Content-Type: application/json

{
  "name": "新專案",
  "description": "專案描述", 
  "visibility": "private",
  "icon": "📋",
  "color": "#3498db",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**回應**:
```json
{
  "data": {
    "id": "project-123",
    "name": "新專案",
    "ownerId": "user-1", // 從認證 token 取得
    // ... 其他專案欄位
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "專案建立成功"
}
```

### GET /projects/{id}
取得單一專案

**請求**:
```http
GET /api/projects/project-123
```

### PUT /projects/{id}
更新專案

**請求**:
```http
PUT /api/projects/project-123
Content-Type: application/json

{
  "name": "更新後的專案名稱",
  "description": "更新後的描述"
}
```

### DELETE /projects/{id}
刪除專案

**請求**:
```http
DELETE /api/projects/project-123
```

### POST /projects/{id}/members
新增專案成員

**請求**:
```http
POST /api/projects/project-123/members
Content-Type: application/json

{
  "userId": "user-2",
  "role": "member"
}
```

**回應**:
```json
{
  "data": {
    "id": "project-123",
    "members": [
      // ... 更新後的成員列表
    ]
  },
  "message": "成員新增成功"
}
```

### DELETE /projects/{id}/members/{userId}
移除專案成員

**請求**:
```http
DELETE /api/projects/project-123/members/user-2
```

### PATCH /projects/{id}/members/{userId}
更新成員角色

**請求**:
```http
PATCH /api/projects/project-123/members/user-2
Content-Type: application/json

{
  "role": "admin"
}
```

### GET /projects/by-member/{userId}
取得用戶參與的專案

**請求**:
```http
GET /api/projects/by-member/user-123
```

### POST /projects/{id}/duplicate
複製專案

**請求**:
```http
POST /api/projects/project-123/duplicate
Content-Type: application/json

{
  "newName": "專案副本",
  "includeTasks": true,
  "includeMembers": false
}
```

### GET /projects/{id}/statistics
取得專案統計

**請求**:
```http
GET /api/projects/project-123/statistics
```

**回應**:
```json
{
  "data": {
    "totalTasks": 25,
    "completedTasks": 15,
    "activeTasks": 8,
    "overdueTasks": 2,
    "members": 5,
    "progress": 60,
    "estimatedHours": 200,
    "actualHours": 120
  }
}
```

## 用戶管理 API

### GET /users
取得用戶列表

**請求**:
```http
GET /api/users?role={role}&status={status}&limit={limit}&offset={offset}
```

**查詢參數**:
- `role` (可選): 用戶角色 (`admin`, `user`)
- `status` (可選): 帳號狀態 (`active`, `inactive`)
- `limit` (可選): 返回數量限制
- `offset` (可選): 偏移量

**回應**:
```json
{
  "data": {
    "users": [
      {
        "id": "user-1",
        "username": "john_doe",
        "email": "john@example.com",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "role": "user",
        "isActive": true,
        "preferences": {
          "theme": "light",
          "language": "zh-TW",
          "timezone": "Asia/Taipei"
        },
        "lastLoginAt": "2024-01-01T10:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### POST /users
建立新用戶

**請求**:
```http
POST /api/users
Content-Type: application/json

{
  "username": "new_user",
  "email": "newuser@example.com",
  "name": "New User",
  "password": "securepassword",
  "role": "user"
}
```

### GET /users/{id}
取得單一用戶

**請求**:
```http
GET /api/users/user-123
```

### PUT /users/{id}
更新用戶資料

**請求**:
```http
PUT /api/users/user-123
Content-Type: application/json

{
  "name": "Updated Name",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

### DELETE /users/{id}
刪除用戶

**請求**:
```http
DELETE /api/users/user-123
```

### GET /users/by-email
根據電子郵件查找用戶

**請求**:
```http
GET /api/users/by-email?email=user@example.com
```

### GET /users/by-username
根據用戶名查找用戶

**請求**:
```http
GET /api/users/by-username?username=john_doe
```

### PUT /users/{id}/profile
更新用戶資料檔案

**請求**:
```http
PUT /api/users/user-123/profile
Content-Type: application/json

{
  "name": "New Display Name",
  "avatar": "https://example.com/avatar.jpg"
}
```

### PUT /users/{id}/password
變更用戶密碼

**請求**:
```http
PUT /api/users/user-123/password
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### PUT /users/{id}/preferences
更新用戶偏好設定

**請求**:
```http
PUT /api/users/user-123/preferences
Content-Type: application/json

{
  "preferences": {
    "theme": "dark",
    "language": "en-US",
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

### PATCH /users/{id}/deactivate
停用用戶帳號

**請求**:
```http
PATCH /api/users/user-123/deactivate
```

### PATCH /users/{id}/reactivate
重新啟用用戶帳號

**請求**:
```http
PATCH /api/users/user-123/reactivate
```

### GET /users/{id}/activity
取得用戶活動統計

**請求**:
```http
GET /api/users/user-123/activity
```

**回應**:
```json
{
  "data": {
    "totalTasks": 45,
    "completedTasks": 30,
    "activeProjects": 3,
    "lastActivityAt": "2024-01-01T15:30:00.000Z",
    "weeklyStats": {
      "tasksCompleted": 8,
      "hoursWorked": 32
    }
  }
}
```

## 認證 API

### POST /auth/login
用戶登入

**請求**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**回應**:
```json
{
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "User Name",
      // ... 其他用戶資料
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  },
  "message": "登入成功"
}
```

### POST /auth/register
用戶註冊

**請求**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "username": "newuser",
  "name": "New User"
}
```

### POST /auth/logout
用戶登出

**請求**:
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### GET /auth/verify-token
驗證令牌

**請求**:
```http
GET /api/auth/verify-token
Authorization: Bearer {token}
```

### POST /auth/refresh-token
刷新令牌

**請求**:
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### POST /auth/password-reset-request
請求密碼重設

**請求**:
```http
POST /api/auth/password-reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### POST /auth/password-reset
重設密碼

**請求**:
```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

## 錯誤回應

### 400 Bad Request
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "請求格式錯誤",
    "validationErrors": {
      "title": ["標題為必填欄位"],
      "email": ["電子郵件格式不正確"]
    }
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "認證失敗，請重新登入"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR", 
    "message": "權限不足，無法執行此操作"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "請求的資源不存在",
    "resource": "Task"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "code": "CONFLICT_ERROR",
    "message": "資源狀態衝突"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "請求頻率過快，請稍後重試",
    "retryAfter": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "伺服器內部錯誤"
  }
}
```

### 503 Service Unavailable
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "服務暫時不可用"
  }
}
```

## 分頁與排序

### 分頁參數
- `limit`: 每頁返回數量 (1-100，預設 50)
- `offset`: 偏移量 (預設 0)

### 排序參數
- `sortBy`: 排序欄位
- `sortOrder`: 排序方向 (`asc` 或 `desc`)

**範例**:
```http
GET /api/tasks?limit=20&offset=40&sortBy=createdAt&sortOrder=desc
```

## 篩選與搜尋

### 篩選參數
各 API 支援相關欄位的篩選，使用查詢參數傳遞。

### 搜尋參數
- `q`: 全文搜尋關鍵字

**範例**:
```http
GET /api/tasks?q=urgent&status=todo&assigneeId=user-1
```

## 欄位選擇

使用 `fields` 參數選擇返回的欄位：

```http
GET /api/tasks?fields=id,title,status,assigneeId
```

## 關聯資料

使用 `include` 參數包含關聯資料：

```http
GET /api/tasks?include=project,assignee
```

## 批量操作

部分 API 支援批量操作：

```http
POST /api/tasks/batch
Content-Type: application/json

{
  "action": "update",
  "tasks": [
    {
      "id": "task-1",
      "status": "done"
    },
    {
      "id": "task-2", 
      "priority": "high"
    }
  ]
}
```

## 資料驗證

### 必填欄位
各 API 的必填欄位會在請求驗證中檢查。

### 資料格式
- 日期時間: ISO 8601 格式 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- 電子郵件: RFC 5322 規範
- URL: 有效的 HTTP/HTTPS URL

### 欄位長度限制
- `title`: 1-200 字元
- `description`: 0-10000 字元
- `name`: 1-100 字元
- `email`: 1-254 字元

---

本文件提供了完整的 API 規格定義，開發時請嚴格按照此規格實作後端服務。