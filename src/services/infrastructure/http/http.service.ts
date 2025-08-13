/**
 * HTTP 服務實作
 * 提供基於 Axios 的 HTTP 客戶端功能，包含請求/回應攔截器
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

export interface HttpRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean
  retryCount?: number
}

export interface HttpResponse<T = any> extends AxiosResponse<T> {
  data: T
}

export interface HttpServiceConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  authTokenKey?: string
}

/**
 * HTTP 服務介面
 */
export interface IHttpService {
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  setAuthToken(token: string): void
  clearAuthToken(): void
}

/**
 * HTTP 服務實作類別
 */
export class HttpService implements IHttpService {
  private axiosInstance: AxiosInstance
  private config: HttpServiceConfig
  private authToken: string | null = null

  constructor(config: HttpServiceConfig) {
    this.config = config
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * GET 請求
   */
  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosInstance.get<T>(url, config) as Promise<HttpResponse<T>>
  }

  /**
   * POST 請求
   */
  async post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config) as Promise<HttpResponse<T>>
  }

  /**
   * PUT 請求
   */
  async put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config) as Promise<HttpResponse<T>>
  }

  /**
   * PATCH 請求
   */
  async patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config) as Promise<HttpResponse<T>>
  }

  /**
   * DELETE 請求
   */
  async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosInstance.delete<T>(url, config) as Promise<HttpResponse<T>>
  }

  /**
   * 設定認證令牌
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * 清除認證令牌
   */
  clearAuthToken(): void {
    this.authToken = null
  }

  /**
   * 設定攔截器
   */
  private setupInterceptors(): void {
    // 請求攔截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 注入認證令牌
        if (this.authToken && !config.skipAuth) {
          const tokenKey = this.config.authTokenKey || 'Authorization'
          config.headers = config.headers || {}
          config.headers[tokenKey] = `Bearer ${this.authToken}`
        }

        // 加入時間戳避免快取
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }

        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        })

        return config
      },
      (error) => {
        console.error('[HTTP] Request Error:', error)
        return Promise.reject(error)
      }
    )

    // 回應攔截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`[HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`)
        return response
      },
      async (error: AxiosError) => {
        const config = error.config as HttpRequestConfig

        console.error(`[HTTP] ${error.response?.status || 'Network Error'} ${config?.method?.toUpperCase()} ${config?.url}`, {
          error: error.message,
          response: error.response?.data
        })

        // 實作重試機制
        if (this.shouldRetry(error) && config && !config.retryCount) {
          config.retryCount = 0
        }

        if (config && config.retryCount !== undefined && config.retryCount < this.config.retryAttempts) {
          config.retryCount++
          console.log(`[HTTP] Retrying request (${config.retryCount}/${this.config.retryAttempts})`)
          
          // 等待後重試
          await this.delay(this.config.retryDelay * config.retryCount)
          return this.axiosInstance(config)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 判斷是否應該重試
   */
  private shouldRetry(error: AxiosError): boolean {
    // 網路錯誤或 5xx 伺服器錯誤才重試
    return (
      !error.response || 
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNABORTED' ||
      (error.response.status >= 500 && error.response.status <= 599)
    )
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 取得當前配置
   */
  getConfig(): HttpServiceConfig {
    return { ...this.config }
  }

  /**
   * 更新基礎 URL
   */
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL
    this.axiosInstance.defaults.baseURL = baseURL
  }

  /**
   * 檢查服務是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { skipAuth: true })
      return response.status === 200
    } catch (error) {
      console.warn('[HTTP] Health check failed:', error)
      return false
    }
  }
}

/**
 * HTTP 服務工廠函數
 */
export function createHttpService(config?: Partial<HttpServiceConfig>): HttpService {
  const defaultConfig: HttpServiceConfig = {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    timeout: 10000, // 10 秒
    retryAttempts: 3,
    retryDelay: 1000, // 1 秒
    authTokenKey: 'Authorization'
  }

  return new HttpService({ ...defaultConfig, ...config })
}