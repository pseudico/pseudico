export const RELATIONSHIP_OBJECT_TYPES = [
  "container",
  "item",
  "list_item"
] as const;

export type RelationshipObjectType =
  (typeof RELATIONSHIP_OBJECT_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "related",
  "depends_on",
  "blocked_by",
  "references",
  "belongs_to",
  "follow_up_for"
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function isRelationshipObjectType(
  value: string
): value is RelationshipObjectType {
  return RELATIONSHIP_OBJECT_TYPES.includes(value as RelationshipObjectType);
}

export function isRelationshipType(value: string): value is RelationshipType {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType);
}
