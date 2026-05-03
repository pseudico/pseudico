export const TAGGING_TARGET_TYPES = ["container", "item", "list_item"] as const;

export type TaggingTargetType = (typeof TAGGING_TARGET_TYPES)[number];

export const TAGGING_SOURCES = ["inline", "manual", "imported"] as const;

export type TaggingSource = (typeof TAGGING_SOURCES)[number];

export function isTaggingTargetType(value: string): value is TaggingTargetType {
  return TAGGING_TARGET_TYPES.includes(value as TaggingTargetType);
}

export function isTaggingSource(value: string): value is TaggingSource {
  return TAGGING_SOURCES.includes(value as TaggingSource);
}
