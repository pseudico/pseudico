import { useMemo } from "react";

export type VirtualizedFeedItem<TItem> = {
  item: TItem;
  index: number;
  key: string;
};

export type VirtualizedFeedInput<TItem> = {
  items: readonly TItem[];
  getKey: (item: TItem, index: number) => string;
  estimatedItemHeight: number;
  viewportHeight: number;
  scrollOffset: number;
  overscan?: number;
  minItems?: number;
};

export type VirtualizedFeedResult<TItem> = {
  isVirtualized: boolean;
  virtualItems: VirtualizedFeedItem<TItem>[];
  beforeHeight: number;
  afterHeight: number;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
};

const DEFAULT_OVERSCAN = 4;
const DEFAULT_MIN_ITEMS = 80;

export function useVirtualizedFeed<TItem>({
  items,
  getKey,
  estimatedItemHeight,
  viewportHeight,
  scrollOffset,
  overscan = DEFAULT_OVERSCAN,
  minItems = DEFAULT_MIN_ITEMS
}: VirtualizedFeedInput<TItem>): VirtualizedFeedResult<TItem> {
  return useMemo(() => {
    const itemHeight = normalizePositiveInteger(estimatedItemHeight, 72);
    const visibleHeight = normalizePositiveInteger(viewportHeight, itemHeight * 10);
    const safeScrollOffset = Math.max(0, scrollOffset);
    const safeOverscan = normalizeNonNegativeInteger(overscan, DEFAULT_OVERSCAN);
    const safeMinItems = normalizePositiveInteger(minItems, DEFAULT_MIN_ITEMS);
    const isVirtualized = items.length > safeMinItems;

    if (!isVirtualized) {
      return {
        isVirtualized,
        virtualItems: items.map((item, index) => ({
          item,
          index,
          key: getKey(item, index)
        })),
        beforeHeight: 0,
        afterHeight: 0,
        totalHeight: items.length * itemHeight,
        startIndex: 0,
        endIndex: items.length
      };
    }

    const rawStart = Math.floor(safeScrollOffset / itemHeight) - safeOverscan;
    const startIndex = Math.max(0, rawStart);
    const visibleCount = Math.ceil(visibleHeight / itemHeight) + safeOverscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return {
      isVirtualized,
      virtualItems: items.slice(startIndex, endIndex).map((item, offset) => {
        const index = startIndex + offset;
        return { item, index, key: getKey(item, index) };
      }),
      beforeHeight: startIndex * itemHeight,
      afterHeight: Math.max(0, (items.length - endIndex) * itemHeight),
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex
    };
  }, [
    estimatedItemHeight,
    getKey,
    items,
    minItems,
    overscan,
    scrollOffset,
    viewportHeight
  ]);
}

function normalizePositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : fallback;
}

function normalizeNonNegativeInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}
