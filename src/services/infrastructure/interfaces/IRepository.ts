/**
 * 統一 Repository 基礎介面
 * 定義所有資料存取的標準操作
 */

export interface IRepository<T, TKey = string> {
  /**
   * 根據 ID 查找單一記錄
   */
  findById(id: TKey): Promise<T | null>

  /**
   * 查找所有記錄
   */
  findAll(): Promise<T[]>

  /**
   * 根據條件查找記錄
   */
  findBy(criteria: Partial<T>): Promise<T[]>

  /**
   * 根據條件查找單一記錄
   */
  findOneBy(criteria: Partial<T>): Promise<T | null>

  /**
   * 建立新記錄
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>

  /**
   * 更新記錄
   */
  update(id: TKey, updates: Partial<T>): Promise<T>

  /**
   * 刪除記錄
   */
  delete(id: TKey): Promise<void>

  /**
   * 批量建立記錄
   */
  createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>

  /**
   * 批量更新記錄
   */
  updateMany(updates: Array<{ id: TKey; data: Partial<T> }>): Promise<T[]>

  /**
   * 批量刪除記錄
   */
  deleteMany(ids: TKey[]): Promise<void>

  /**
   * 計算符合條件的記錄數量
   */
  count(criteria?: Partial<T>): Promise<number>

  /**
   * 檢查記錄是否存在
   */
  exists(id: TKey): Promise<boolean>

  /**
   * 分頁查詢
   */
  paginate(
    page: number,
    pageSize: number,
    criteria?: Partial<T>
  ): Promise<{
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>
}