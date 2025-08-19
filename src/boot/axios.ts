import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance, type AxiosError } from 'axios';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// API 響應格式介面
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    version?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  links?: {
    self?: string
    first?: string
    last?: string
    next?: string
    prev?: string
  }
}

// 創建 API 實例
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api/v1' 
    : process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default defineBoot(({ app }) => {
  // 請求攔截器 - 自動添加認證令牌
  api.interceptors.request.use(
    (config) => {
      // 從 localStorage 獲取認證令牌
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // 添加請求 ID 用於追蹤
      config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 響應攔截器 - 統一處理響應格式和錯誤
  api.interceptors.response.use(
    (response) => {
      // 如果後端已經返回標準格式，直接返回
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data
      }

      // 包裝成標準格式
      const apiResponse: ApiResponse = {
        success: true,
        data: response.data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      }
      
      return apiResponse
    },
    (error: AxiosError) => {
      console.error('API Error:', error)

      // 統一錯誤處理
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: getErrorCode(error),
          message: getErrorMessage(error),
          details: error.response?.data
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      }

      // 處理特殊狀態碼
      if (error.response?.status === 401) {
        // 未授權，清除本地令牌
        localStorage.removeItem('auth_token')
        // 可以在這裡添加重新導向到登入頁面的邏輯
      }

      // 返回錯誤響應而不是拋出異常，讓呼叫方統一處理
      return Promise.resolve(errorResponse)
    }
  )

  // 為 Vue 組件提供全域屬性
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
});

/**
 * 獲取錯誤代碼
 */
function getErrorCode(error: AxiosError): string {
  if (error.response) {
    return `HTTP_${error.response.status}`
  }
  if (error.code) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

/**
 * 獲取錯誤訊息
 */
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as any
    if (data.message) return data.message
    if (data.error?.message) return data.error.message
  }
  
  if (error.message) return error.message
  return 'Unknown error occurred'
}

export { api }
export type { ApiResponse }
