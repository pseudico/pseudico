import type { ActivityActorType } from "@local-work-os/core";
import type {
  ContainerRecord,
  ContainerTabRecord,
  SearchIndexRecord
} from "@local-work-os/db";

export type ProjectStatus = "active" | "waiting" | "completed" | "archived";
export type ProjectMutableStatus = Exclude<ProjectStatus, "archived">;

export type ProjectRecord = Omit<ContainerRecord, "status" | "type"> & {
  status: ProjectStatus;
  type: "project";
};

export type CreateProjectInput = {
  workspaceId: string;
  name: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateProjectResult = {
  project: ProjectRecord;
  defaultTab: ContainerTabRecord;
  searchRecord: SearchIndexRecord;
};

export type UpdateProjectInput = {
  projectId: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ProjectMutableStatus;
};
