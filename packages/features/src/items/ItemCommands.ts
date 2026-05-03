import type { ActivityActorType, ItemStatus, ItemType } from "@local-work-os/core";
import type {
  ActivityLogRecord,
  ItemRecord,
  ListItemsFilter,
  SearchIndexRecord
} from "@local-work-os/db";

export type ItemServiceIdFactory = (prefix: string) => string;

export type CreateItemInput = {
  workspaceId: string;
  containerId: string;
  type: ItemType;
  title: string;
  actorType?: ActivityActorType;
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  pinned?: boolean;
  sortOrder?: number;
  status?: ItemStatus;
};

export type UpdateItemInput = {
  itemId: string;
  actorType?: ActivityActorType;
  body?: string | null;
  categoryId?: string | null;
  completedAt?: string | null;
  containerTabId?: string | null;
  pinned?: boolean;
  sortOrder?: number;
  status?: ItemStatus;
  title?: string;
};

export type MoveItemInput = {
  itemId: string;
  targetContainerId: string;
  actorType?: ActivityActorType;
  targetContainerTabId?: string | null;
  sortOrder?: number;
};

export type ListItemsByContainerInput = ListItemsFilter & {
  containerId: string;
};

export type ListItemsByContainerTabInput = ListItemsFilter & {
  containerId: string;
  containerTabId: string;
};

export type ItemMutationResult = {
  item: ItemRecord;
  searchRecord: SearchIndexRecord;
};

export type ItemInspectorSnapshot = {
  item: ItemRecord;
  activity: ActivityLogRecord[];
};
