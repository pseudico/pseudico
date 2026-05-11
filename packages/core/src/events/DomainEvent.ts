import type { ActivityAction } from "./ActivityAction";

export type ActivityActorType = "system" | "local_user" | "importer";

export type ActivityTargetType =
  | "workspace"
  | "container"
  | "container_tab"
  | "contact_field"
  | "item"
  | "list_item"
  | "comment"
  | "tag"
  | "category"
  | "relationship"
  | "dashboard"
  | "dashboard_widget"
  | "saved_view"
  | "attachment"
  | "search_index"
  | "backup"
  | "export"
  | "template"
  | "workflow";

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

