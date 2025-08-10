/**
 * 虛擬滾動 Composable
 * 用於處理大量資料的高效渲染
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  buffer?: number // 緩衝區項目數量
}

export interface VirtualScrollItem<T = any> {
  index: number
  data: T
  top: number
  height: number
}

export function useVirtualScroll<T>(
  items: () => T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, buffer = 5 } = options

  // 狀態
  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement>()

  // 計算屬性
  const totalItems = computed(() => items().length)
  const totalHeight = computed(() => totalItems.value * itemHeight)
  const visibleCount = computed(() => Math.ceil(containerHeight / itemHeight))

  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight)
    return Math.max(0, index - buffer)
  })

  const endIndex = computed(() => {
    const index = startIndex.value + visibleCount.value + buffer * 2
    return Math.min(totalItems.value - 1, index)
  })

  const visibleItems = computed((): VirtualScrollItem<T>[] => {
    const result: VirtualScrollItem<T>[] = []
    const itemsArray = items()

    for (let i = startIndex.value; i <= endIndex.value; i++) {
      if (i >= 0 && i < itemsArray.length && itemsArray[i] !== undefined) {
        result.push({
          index: i,
          data: itemsArray[i]!,
          top: i * itemHeight,
          height: itemHeight
        })
      }
    }

    return result
  })

  const offsetTop = computed(() => startIndex.value * itemHeight)

  // 方法
  function handleScroll(event: Event): void {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  function scrollToIndex(index: number): void {
    if (!containerRef.value) return

    const targetScrollTop = Math.max(0, index * itemHeight - containerHeight / 2)
    containerRef.value.scrollTop = targetScrollTop
  }

  function scrollToTop(): void {
    if (!containerRef.value) return
    containerRef.value.scrollTop = 0
  }

  function scrollToBottom(): void {
    if (!containerRef.value) return
    containerRef.value.scrollTop = totalHeight.value
  }

  // 生命周期
  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    // 狀態
    containerRef,
    scrollTop,

    // 計算屬性
    totalHeight,
    visibleItems,
    offsetTop,
    startIndex,
    endIndex,

    // 方法
    scrollToIndex,
    scrollToTop,
    scrollToBottom
  }
}

/**
 * 表格虛擬滾動 Composable
 * 專門用於表格數據的虛擬滾動
 */
export function useTableVirtualScroll<T>(
  rows: () => T[],
  rowHeight: number = 50,
  containerHeight: number = 400
) {
  return useVirtualScroll(rows, {
    itemHeight: rowHeight,
    containerHeight,
    buffer: 10
  })
}

/**
 * 列表虛擬滾動 Composable
 * 專門用於列表數據的虛擬滾動
 */
export function useListVirtualScroll<T>(
  items: () => T[],
  itemHeight: number = 60,
  containerHeight: number = 400
) {
  return useVirtualScroll(items, {
    itemHeight,
    containerHeight,
    buffer: 5
  })
}