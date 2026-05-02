export const LIST_DISPLAY_MODES = ["checklist", "pipeline"] as const;

export type ListDisplayMode = (typeof LIST_DISPLAY_MODES)[number];

export const LIST_PROGRESS_MODES = ["count", "manual", "none"] as const;

export type ListProgressMode = (typeof LIST_PROGRESS_MODES)[number];

export const LIST_ITEM_STATUSES = [
  "open",
  "done",
  "waiting",
  "cancelled"
] as const;

export type ListItemStatus = (typeof LIST_ITEM_STATUSES)[number];

export function isListDisplayMode(value: string): value is ListDisplayMode {
  return LIST_DISPLAY_MODES.includes(value as ListDisplayMode);
}

export function isListProgressMode(value: string): value is ListProgressMode {
  return LIST_PROGRESS_MODES.includes(value as ListProgressMode);
}

export function isListItemStatus(value: string): value is ListItemStatus {
  return LIST_ITEM_STATUSES.includes(value as ListItemStatus);
}
