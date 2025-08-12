/**
 * Repository 層統一錯誤處理
 * 定義標準錯誤類別和錯誤處理邏輯
 */

/**
 * Repository 錯誤基礎類別
 */
export abstract class RepositoryError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = this.constructor.name
    
    // 確保錯誤堆疊正確顯示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * 記錄未找到錯誤
 */
export class RecordNotFoundError extends RepositoryError {
  readonly code = 'RECORD_NOT_FOUND'
  readonly statusCode = 404

  constructor(entityName: string, id: string, cause?: Error) {
    super(`${entityName} 記錄未找到: ${id}`, cause)
  }
}

/**
 * 記錄已存在錯誤
 */
export class RecordAlreadyExistsError extends RepositoryError {
  readonly code = 'RECORD_ALREADY_EXISTS'
  readonly statusCode = 409

  constructor(entityName: string, identifier: string, cause?: Error) {
    super(`${entityName} 記錄已存在: ${identifier}`, cause)
  }
}

/**
 * 資料驗證錯誤
 */
export class ValidationError extends RepositoryError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly constraint: string,
    cause?: Error
  ) {
    super(`資料驗證失敗 - 欄位: ${field}, 值: ${value}, 約束: ${constraint}`, cause)
  }
}

/**
 * 資料庫操作錯誤
 */
export class DatabaseOperationError extends RepositoryError {
  readonly code = 'DATABASE_OPERATION_ERROR'
  readonly statusCode = 500

  constructor(operation: string, entityName: string, cause?: Error) {
    super(`資料庫操作失敗 - 操作: ${operation}, 實體: ${entityName}`, cause)
  }
}

/**
 * 資料序列化錯誤
 */
export class SerializationError extends RepositoryError {
  readonly code = 'SERIALIZATION_ERROR'
  readonly statusCode = 500

  constructor(entityName: string, cause?: Error) {
    super(`資料序列化失敗 - 實體: ${entityName}`, cause)
  }
}

/**
 * 約束違反錯誤（如外鍵約束）
 */
export class ConstraintViolationError extends RepositoryError {
  readonly code = 'CONSTRAINT_VIOLATION'
  readonly statusCode = 409

  constructor(
    public readonly constraintName: string,
    public readonly constraintType: 'unique' | 'foreign_key' | 'check' | 'not_null',
    cause?: Error
  ) {
    super(`約束違反 - 約束名稱: ${constraintName}, 類型: ${constraintType}`, cause)
  }
}

/**
 * 並發衝突錯誤
 */
export class ConcurrencyError extends RepositoryError {
  readonly code = 'CONCURRENCY_ERROR'
  readonly statusCode = 409

  constructor(entityName: string, id: string, cause?: Error) {
    super(`並發操作衝突 - 實體: ${entityName}, ID: ${id}`, cause)
  }
}

/**
 * 錯誤處理工具類別
 */
export class RepositoryErrorHandler {
  /**
   * 包裝原始錯誤為 Repository 錯誤
   */
  static wrapError(error: unknown, context: {
    operation: string
    entityName: string
    id?: string
  }): RepositoryError {
    if (error instanceof RepositoryError) {
      return error
    }

    if (error instanceof Error) {
      // 根據錯誤訊息內容判斷錯誤類型
      const message = error.message.toLowerCase()
      
      if (message.includes('not found') || message.includes('不存在')) {
        return new RecordNotFoundError(context.entityName, context.id || 'unknown', error)
      }
      
      if (message.includes('already exists') || message.includes('已存在')) {
        return new RecordAlreadyExistsError(context.entityName, context.id || 'unknown', error)
      }
      
      if (message.includes('validation') || message.includes('驗證')) {
        return new ValidationError('unknown', 'unknown', error.message, error)
      }
      
      if (message.includes('constraint') || message.includes('約束')) {
        return new ConstraintViolationError('unknown', 'unique', error)
      }
      
      if (message.includes('serializ') || message.includes('序列化')) {
        return new SerializationError(context.entityName, error)
      }
      
      // 預設為資料庫操作錯誤
      return new DatabaseOperationError(context.operation, context.entityName, error)
    }

    // 未知錯誤類型
    return new DatabaseOperationError(
      context.operation,
      context.entityName,
      new Error(String(error))
    )
  }

  /**
   * 記錄錯誤到控制台（可擴展到其他記錄系統）
   */
  static logError(error: RepositoryError, additionalContext?: Record<string, unknown>): void {
    const logData = {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause?.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...additionalContext
    }

    // 根據錯誤嚴重程度選擇記錄等級
    if (error.statusCode >= 500) {
      console.error('[Repository Error]', logData)
    } else if (error.statusCode >= 400) {
      console.warn('[Repository Warning]', logData)
    } else {
      console.info('[Repository Info]', logData)
    }
  }

  /**
   * 判斷是否為可重試的錯誤
   */
  static isRetryable(error: RepositoryError): boolean {
    return error instanceof DatabaseOperationError || 
           error instanceof ConcurrencyError
  }

  /**
   * 判斷是否為用戶錯誤（4xx）
   */
  static isUserError(error: RepositoryError): boolean {
    return error.statusCode >= 400 && error.statusCode < 500
  }

  /**
   * 判斷是否為系統錯誤（5xx）
   */
  static isSystemError(error: RepositoryError): boolean {
    return error.statusCode >= 500
  }
}

/**
 * Repository 錯誤類型聯合
 */
export type AnyRepositoryError = 
  | RecordNotFoundError 
  | RecordAlreadyExistsError 
  | ValidationError 
  | DatabaseOperationError 
  | SerializationError 
  | ConstraintViolationError 
  | ConcurrencyError

/**
 * 錯誤代碼常數
 */
export const ERROR_CODES = {
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  RECORD_ALREADY_EXISTS: 'RECORD_ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_OPERATION_ERROR: 'DATABASE_OPERATION_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  CONCURRENCY_ERROR: 'CONCURRENCY_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]