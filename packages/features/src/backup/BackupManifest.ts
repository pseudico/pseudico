export type BackupManifestAttachment = {
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

export type BackupKind = "manual" | "automatic" | "pre_migration";

export type BackupManifest = {
  id: string;
  kind: BackupKind;
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
  database: {
    sourceRelativePath: string;
    backupRelativePath: string;
    sizeBytes: number;
    checksum: string | null;
  };
  attachments: BackupManifestAttachment[];
  attachmentCount: number;
  totalAttachmentBytes: number;
};

export type CreateBackupManifestInput = {
  id: string;
  kind?: BackupKind;
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
  database: BackupManifest["database"];
  attachments: BackupManifestAttachment[];
};

export function createBackupManifest(
  input: CreateBackupManifestInput
): BackupManifest {
  const attachments = [...input.attachments].sort((left, right) =>
    left.storagePath.localeCompare(right.storagePath)
  );

  return {
    id: input.id,
    kind: input.kind ?? "manual",
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    createdAt: input.createdAt,
    database: input.database,
    attachments,
    attachmentCount: attachments.length,
    totalAttachmentBytes: attachments.reduce(
      (total, attachment) => total + attachment.sizeBytes,
      0
    )
  };
}
