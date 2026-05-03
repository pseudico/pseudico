import type { ActivityAction } from "./ActivityAction";

export type ActivityActorType = "system" | "local_user" | "importer";

export type ActivityTargetType =
  | "workspace"
  | "container"
  | "item"
  | "list_item"
  | "tag"
  | "category"
  | "relationship"
  | "saved_view"
  | "attachment"
  | "search_index"
  | "backup"
  | "export";

export type DomainEvent<TBefore = unknown, TAfter = unknown> = {
  workspaceId: string;
  actorType: ActivityActorType;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string;
  summary?: string;
  before?: TBefore | null;
  after?: TAfter | null;
};

