/**
 * API 錯誤類別定義
 * 擴展現有錯誤處理系統支援 HTTP/API 錯誤
 */

import { AxiosError } from 'axios'

/**
 * API 錯誤基類
 */
export abstract class ApiError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(
    message: string,
    public readonly originalError?: AxiosError | Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
  }

  /**
   * 取得錯誤詳細資訊
   */
  getDetails(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      originalError: this.originalError?.message,
      stack: this.stack
    }
  }
}

/**
 * 網路連接錯誤
 */
export class NetworkError extends ApiError {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode = 0

  constructor(originalError?: AxiosError, context?: Record<string, unknown>) {
    super('無法連接到伺服器，請檢查網路連接', originalError, context)
  }
}

/**
 * 請求超時錯誤
 */
export class TimeoutError extends ApiError {
  readonly code = 'TIMEOUT_ERROR'
  readonly statusCode = 408

  constructor(originalError?: AxiosError, context?: Record<string, unknown>) {
    super('請求超時，請稍後再試', originalError, context)
  }
}

/**
 * 認證錯誤
 */
export class AuthenticationError extends ApiError {
  readonly code = 'AUTHENTICATION_ERROR'
  readonly statusCode = 401

  constructor(message = '認證失敗，請重新登入', originalError?: AxiosError, context?: Record<string, unknown>) {
    super(message, originalError, context)
  }
}

/**
 * 授權錯誤
 */
export class AuthorizationError extends ApiError {
  readonly code = 'AUTHORIZATION_ERROR'
  readonly statusCode = 403

  constructor(message = '權限不足，無法執行此操作', originalError?: AxiosError, context?: Record<string, unknown>) {
    super(message, originalError, context)
  }
}

/**
 * 資源不存在錯誤
 */
export class NotFoundError extends ApiError {
  readonly code = 'NOT_FOUND_ERROR'
  readonly statusCode = 404

  constructor(resource?: string, originalError?: AxiosError, context?: Record<string, unknown>) {
    const message = resource ? `找不到請求的${resource}` : '請求的資源不存在'
    super(message, originalError, context)
  }
}

/**
 * 請求格式錯誤
 */
export class BadRequestError extends ApiError {
  readonly code = 'BAD_REQUEST_ERROR'
  readonly statusCode = 400

  constructor(
    message = '請求格式錯誤',
    public readonly validationErrors?: Record<string, string[]>,
    originalError?: AxiosError,
    context?: Record<string, unknown>
  ) {
    super(message, originalError, context)
  }

  getDetails(): Record<string, unknown> {
    return {
      ...super.getDetails(),
      validationErrors: this.validationErrors
    }
  }
}

/**
 * 資源衝突錯誤
 */
export class ConflictError extends ApiError {
  readonly code = 'CONFLICT_ERROR'
  readonly statusCode = 409

  constructor(message = '資源狀態衝突', originalError?: AxiosError, context?: Record<string, unknown>) {
    super(message, originalError, context)
  }
}

/**
 * 請求頻率限制錯誤
 */
export class RateLimitError extends ApiError {
  readonly code = 'RATE_LIMIT_ERROR'
  readonly statusCode = 429

  constructor(
    public readonly retryAfter?: number,
    originalError?: AxiosError,
    context?: Record<string, unknown>
  ) {
    const message = retryAfter 
      ? `請求頻率過快，請在 ${retryAfter} 秒後重試`
      : '請求頻率過快，請稍後重試'
    super(message, originalError, context)
  }

  getDetails(): Record<string, unknown> {
    return {
      ...super.getDetails(),
      retryAfter: this.retryAfter
    }
  }
}

/**
 * 伺服器內部錯誤
 */
export class ServerError extends ApiError {
  readonly code = 'SERVER_ERROR'
  readonly statusCode = 500

  constructor(
    message = '伺服器內部錯誤，請稍後再試',
    originalError?: AxiosError,
    context?: Record<string, unknown>
  ) {
    super(message, originalError, context)
  }
}

/**
 * 服務不可用錯誤
 */
export class ServiceUnavailableError extends ApiError {
  readonly code = 'SERVICE_UNAVAILABLE_ERROR'
  readonly statusCode = 503

  constructor(
    message = '服務暫時不可用，請稍後再試',
    originalError?: AxiosError,
    context?: Record<string, unknown>
  ) {
    super(message, originalError, context)
  }
}

/**
 * API 錯誤工廠類別
 */
export class ApiErrorFactory {
  /**
   * 從 Axios 錯誤建立適當的 API 錯誤
   */
  static fromAxiosError(error: AxiosError, context?: Record<string, unknown>): ApiError {
    // 網路錯誤
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return new TimeoutError(error, context)
      }
      return new NetworkError(error, context)
    }

    const { status, data } = error.response
    const responseData = data as any

    switch (status) {
      case 400:
        return new BadRequestError(
          responseData?.message || '請求格式錯誤',
          responseData?.validationErrors,
          error,
          context
        )
      case 401:
        return new AuthenticationError(
          responseData?.message || '認證失敗，請重新登入',
          error,
          context
        )
      case 403:
        return new AuthorizationError(
          responseData?.message || '權限不足，無法執行此操作',
          error,
          context
        )
      case 404:
        return new NotFoundError(
          responseData?.resource || '資源',
          error,
          context
        )
      case 409:
        return new ConflictError(
          responseData?.message || '資源狀態衝突',
          error,
          context
        )
      case 429:
        return new RateLimitError(
          responseData?.retryAfter,
          error,
          context
        )
      case 503:
        return new ServiceUnavailableError(
          responseData?.message || '服務暫時不可用，請稍後再試',
          error,
          context
        )
      default:
        if (status >= 500) {
          return new ServerError(
            responseData?.message || '伺服器內部錯誤，請稍後再試',
            error,
            context
          )
        }
        // 預設處理未知狀態碼
        return new ServerError(
          `HTTP ${status}: ${responseData?.message || error.message}`,
          error,
          context
        )
    }
  }

  /**
   * 從一般錯誤建立 API 錯誤
   */
  static fromError(error: Error, context?: Record<string, unknown>): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    return new ServerError(
      `未預期錯誤: ${error.message}`,
      error,
      context
    )
  }
}

/**
 * API 錯誤處理器
 */
export class ApiErrorHandler {
  /**
   * 記錄錯誤
   */
  static logError(error: ApiError, additionalContext?: Record<string, unknown>): void {
    const details = error.getDetails()
    const context = { ...details.context, ...additionalContext }

    console.error(`[API Error] ${error.name}:`, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context
    })

    // 在生產環境中，這裡可以整合錯誤監控服務
    // 例如: Sentry, LogRocket, 等等
  }

  /**
   * 處理錯誤並決定是否應該重試
   */
  static shouldRetry(error: ApiError): boolean {
    // 網路錯誤、超時錯誤、5xx 錯誤可以重試
    return (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      error instanceof ServerError ||
      error instanceof ServiceUnavailableError
    )
  }

  /**
   * 取得使用者友善的錯誤訊息
   */
  static getUserFriendlyMessage(error: ApiError): string {
    if (error instanceof NetworkError) {
      return '網路連接失敗，請檢查您的網路連接後重試'
    }
    
    if (error instanceof TimeoutError) {
      return '請求超時，請稍後重試'
    }
    
    if (error instanceof AuthenticationError) {
      return '登入已過期，請重新登入'
    }
    
    if (error instanceof AuthorizationError) {
      return '您沒有權限執行此操作'
    }
    
    if (error instanceof NotFoundError) {
      return '請求的資源不存在'
    }
    
    if (error instanceof RateLimitError) {
      return '操作過於頻繁，請稍後再試'
    }
    
    if (error instanceof ServerError || error instanceof ServiceUnavailableError) {
      return '伺服器暫時無法處理請求，請稍後重試'
    }

    return error.message || '發生未知錯誤，請稍後重試'
  }
}

/**
 * 檢查錯誤類型的輔助函數
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isAuthError(error: unknown): error is AuthenticationError | AuthorizationError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError
}

export function isRetryableError(error: unknown): boolean {
  return isApiError(error) && ApiErrorHandler.shouldRetry(error)
}