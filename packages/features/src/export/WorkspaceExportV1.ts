import type {
  AttachmentRecord,
  CategoryRecord,
  ContainerRecord,
  ContainerTabRecord,
  DailyPlanItemRecord,
  DailyPlanRecord,
  DashboardRecord,
  DashboardWidgetRecord,
  ItemRecord,
  LinkRecord,
  ListDetailsRecord,
  ListItemRecord,
  NoteDetailsRecord,
  RelationshipRecord,
  SavedViewRecord,
  TagRecord,
  TaggingRecord,
  TaskRecord,
  WorkspaceRecord
} from "@local-work-os/db";

export const WORKSPACE_EXPORT_SCHEMA_VERSION = 1;

export type WorkspaceExportAttachmentManifestEntry = {
  id: string;
  itemId: string;
  originalName: string;
  storedName: string;
  mimeType: string | null;
  sizeBytes: number;
  checksum: string | null;
  storagePath: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceExportAttachmentManifest = {
  attachments: WorkspaceExportAttachmentManifestEntry[];
  attachmentCount: number;
  totalAttachmentBytes: number;
};

export type WorkspaceExportV1 = {
  schemaVersion: typeof WORKSPACE_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  workspace: WorkspaceRecord;
  data: {
    containers: ContainerRecord[];
    containerTabs: ContainerTabRecord[];
    items: ItemRecord[];
    taskDetails: TaskRecord[];
    noteDetails: NoteDetailsRecord[];
    listDetails: ListDetailsRecord[];
    listItems: ListItemRecord[];
    linkDetails: LinkRecord[];
    tags: TagRecord[];
    taggings: TaggingRecord[];
    categories: CategoryRecord[];
    relationships: RelationshipRecord[];
    savedViews: SavedViewRecord[];
    dashboards: DashboardRecord[];
    dashboardWidgets: DashboardWidgetRecord[];
    dailyPlans: DailyPlanRecord[];
    dailyPlanItems: DailyPlanItemRecord[];
  };
  attachmentManifest: WorkspaceExportAttachmentManifest;
};

export function createAttachmentManifest(
  attachments: AttachmentRecord[]
): WorkspaceExportAttachmentManifest {
  const manifestAttachments = [...attachments]
    .sort(
      (left, right) =>
        left.storagePath.localeCompare(right.storagePath) ||
        left.id.localeCompare(right.id)
    )
    .map(toAttachmentManifestEntry);

  return {
    attachments: manifestAttachments,
    attachmentCount: manifestAttachments.length,
    totalAttachmentBytes: manifestAttachments.reduce(
      (total, attachment) => total + attachment.sizeBytes,
      0
    )
  };
}

function toAttachmentManifestEntry(
  attachment: AttachmentRecord
): WorkspaceExportAttachmentManifestEntry {
  return {
    id: attachment.id,
    itemId: attachment.itemId,
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    storagePath: attachment.storagePath,
    description: attachment.description,
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt
  };
}
