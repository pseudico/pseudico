import {
  isTaggingTargetType,
  type TaggingTargetType
} from "./Tag";

export const INSPECTOR_TARGET_TYPES = ["container", "item", "list_item"] as const;

export type InspectorTargetType = (typeof INSPECTOR_TARGET_TYPES)[number];

export type InspectorTarget = {
  type: InspectorTargetType;
  id: string;
};

export function isInspectorTargetType(
  value: string
): value is InspectorTargetType {
  return INSPECTOR_TARGET_TYPES.includes(value as InspectorTargetType);
}

export function isInspectorTarget(value: unknown): value is InspectorTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    typeof value.type === "string" &&
    typeof value.id === "string" &&
    isInspectorTargetType(value.type) &&
    value.id.trim().length > 0
  );
}

export function inspectorTargetToTaggingTargetType(
  target: InspectorTarget
): TaggingTargetType {
  if (!isTaggingTargetType(target.type)) {
    throw new Error(`Unsupported inspector target type: ${target.type}.`);
  }

  return target.type;
}

export function createInspectorTargetKey(target: InspectorTarget): string {
  return `${target.type}:${target.id}`;
}
