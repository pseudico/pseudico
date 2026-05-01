export const ITEM_TYPES = [
  "task",
  "list",
  "note",
  "file",
  "link",
  "heading",
  "location",
  "comment"
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_STATUSES = [
  "active",
  "waiting",
  "completed",
  "archived"
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export function isItemType(value: string): value is ItemType {
  return ITEM_TYPES.includes(value as ItemType);
}

export function isItemStatus(value: string): value is ItemStatus {
  return ITEM_STATUSES.includes(value as ItemStatus);
}
