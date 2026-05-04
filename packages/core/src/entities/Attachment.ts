export type AttachmentRecord = {
  id: string;
  workspaceId: string;
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
  deletedAt: string | null;
};

export type AttachmentStorageLayout = {
  year: string;
  month: string;
  attachmentId: string;
};

export const ATTACHMENT_STORAGE_ROOT = "attachments";

export function createAttachmentStorageRelativePath(input: {
  layout: AttachmentStorageLayout;
  storedName: string;
}): string {
  return [
    ATTACHMENT_STORAGE_ROOT,
    input.layout.year,
    input.layout.month,
    input.layout.attachmentId,
    input.storedName
  ].join("/");
}
