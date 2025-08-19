/**
 * API 服務層 - 基於 Quasar axios boot
 * 提供統一的 API 呼叫介面
 */

import { api } from 'boot/axios'
import type { ApiResponse } from 'boot/axios'

/**
 * 基礎 API 服務類別
 */
export class ApiService {
  /**
   * GET 請求
   */
  static async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return api.get(endpoint, { params })
  }

  /**
   * POST 請求
   */
  static async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return api.post(endpoint, data)
  }

  /**
   * PUT 請求
   */
  static async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return api.put(endpoint, data)
  }

  /**
   * PATCH 請求
   */
  static async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return api.patch(endpoint, data)
  }

  /**
   * DELETE 請求
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return api.delete(endpoint)
  }
}

/**
 * 用戶相關 API
 */
class UserApiService extends ApiService {
  static async getUsers(): Promise<ApiResponse<any[]>> {
    return this.get('/users')
  }

  static async getUser(id: string): Promise<ApiResponse<any>> {
    return this.get(`/users/${id}`)
  }

  static async createUser(userData: any): Promise<ApiResponse<any>> {
    return this.post('/users', userData)
  }

  static async updateUser(id: string, userData: any): Promise<ApiResponse<any>> {
    return this.put(`/users/${id}`, userData)
  }

  static async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/users/${id}`)
  }

  static async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/users/me')
  }

  static async updateCurrentUser(userData: any): Promise<ApiResponse<any>> {
    return this.patch('/users/me', userData)
  }
}

/**
 * 專案相關 API
 */
class ProjectApiService extends ApiService {
  static async getProjects(): Promise<ApiResponse<any[]>> {
    return this.get('/projects')
  }

  static async getProject(id: string): Promise<ApiResponse<any>> {
    return this.get(`/projects/${id}`)
  }

  static async createProject(projectData: any): Promise<ApiResponse<any>> {
    return this.post('/projects', projectData)
  }

  static async updateProject(id: string, projectData: any): Promise<ApiResponse<any>> {
    return this.put(`/projects/${id}`, projectData)
  }

  static async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/projects/${id}`)
  }

  static async getProjectMembers(projectId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/projects/${projectId}/members`)
  }

  static async addProjectMember(projectId: string, memberData: any): Promise<ApiResponse<any>> {
    return this.post(`/projects/${projectId}/members`, memberData)
  }

  static async removeProjectMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return this.delete(`/projects/${projectId}/members/${userId}`)
  }
}

/**
 * 任務相關 API (當後端實作後啟用)
 */
class TaskApiService extends ApiService {
  static async getTasks(projectId?: string): Promise<ApiResponse<any[]>> {
    const params = projectId ? { projectId } : undefined
    return this.get('/tasks', params)
  }

  static async getTask(id: string): Promise<ApiResponse<any>> {
    return this.get(`/tasks/${id}`)
  }

  static async createTask(taskData: any): Promise<ApiResponse<any>> {
    return this.post('/tasks', taskData)
  }

  static async updateTask(id: string, taskData: any): Promise<ApiResponse<any>> {
    return this.put(`/tasks/${id}`, taskData)
  }

  static async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/tasks/${id}`)
  }

  static async getTaskComments(taskId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/tasks/${taskId}/comments`)
  }

  static async addTaskComment(taskId: string, commentData: any): Promise<ApiResponse<any>> {
    return this.post(`/tasks/${taskId}/comments`, commentData)
  }

  static async getTaskAttachments(taskId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/tasks/${taskId}/attachments`)
  }

  static async uploadTaskAttachment(taskId: string, file: File): Promise<ApiResponse<any>> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

/**
 * 認證相關 API
 */
class AuthApiService extends ApiService {
  static async register(userData: any): Promise<ApiResponse<any>> {
    return this.post('/auth/register', userData)
  }

  static async login(credentials: any): Promise<ApiResponse<any>> {
    return this.post('/auth/login', credentials)
  }

  static async logout(): Promise<ApiResponse<void>> {
    return this.post('/auth/logout')
  }

  static async refreshToken(): Promise<ApiResponse<any>> {
    return this.post('/auth/refresh')
  }

  static async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.post('/auth/forgot-password', { email })
  }

  static async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return this.post('/auth/reset-password', { token, password })
  }
}

/**
 * 健康檢查 API
 */
class HealthApiService extends ApiService {
  static async getHealth(): Promise<ApiResponse<any>> {
    return this.get('/health')
  }

  static async getMetrics(): Promise<ApiResponse<any>> {
    return this.get('/metrics')
  }

  static async getInfo(): Promise<ApiResponse<any>> {
    return this.get('/info')
  }
}

// 匯出所有服務
export {
  ApiService as default,
  UserApiService,
  ProjectApiService,
  TaskApiService,
  AuthApiService,
  HealthApiService
}