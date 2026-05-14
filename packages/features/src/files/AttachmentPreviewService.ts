import type { AttachmentRecord } from "@local-work-os/core";

export type AttachmentPreviewKind =
  | "image"
  | "pdf"
  | "text"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "unknown";

export type AttachmentPreviewSummary = {
  attachmentId: string;
  kind: AttachmentPreviewKind;
  iconLabel: string;
  extension: string | null;
  mimeType: string | null;
  sizeBytes: number;
  sizeLabel: string;
  updatedAt: string;
  missing: boolean;
  checksum: string | null;
  checksumShort: string | null;
  versionCount: number;
  latestVersionNumber: number | null;
  thumbnailStoragePath: string | null;
  thumbnailExists: boolean;
  previewDataUrl: string | null;
};

export class AttachmentPreviewService {
  readonly module = "files";

  buildPreview(input: {
    attachment: AttachmentRecord;
    missing: boolean;
    versionCount?: number;
    latestVersionNumber?: number | null;
    thumbnailStoragePath?: string | null;
    thumbnailExists?: boolean;
    previewDataUrl?: string | null;
  }): AttachmentPreviewSummary {
    const kind = classifyAttachment(input.attachment);
    const checksum = input.attachment.checksum;

    return {
      attachmentId: input.attachment.id,
      kind,
      iconLabel: getIconLabel(kind),
      extension: getExtension(input.attachment.originalName),
      mimeType: input.attachment.mimeType,
      sizeBytes: input.attachment.sizeBytes,
      sizeLabel: formatFileSize(input.attachment.sizeBytes),
      updatedAt: input.attachment.updatedAt,
      missing: input.missing,
      checksum,
      checksumShort:
        checksum === null || checksum.length <= 12
          ? checksum
          : checksum.slice(0, 12),
      versionCount: input.versionCount ?? 0,
      latestVersionNumber: input.latestVersionNumber ?? null,
      thumbnailStoragePath: input.thumbnailStoragePath ?? null,
      thumbnailExists: input.thumbnailExists ?? false,
      previewDataUrl: input.previewDataUrl ?? null
    };
  }
}

function classifyAttachment(attachment: AttachmentRecord): AttachmentPreviewKind {
  const mimeType = attachment.mimeType?.toLowerCase() ?? "";
  const extension = getExtension(attachment.originalName);

  if (mimeType.startsWith("image/")) return "image";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension ?? "")) {
    return "image";
  }
  if (mimeType === "application/pdf" || extension === "pdf") return "pdf";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";

  if (["md", "markdown", "txt", "csv", "tsv", "json", "html"].includes(extension ?? "")) {
    return "text";
  }

  if (["doc", "docx", "rtf", "odt"].includes(extension ?? "")) {
    return "document";
  }

  if (["xls", "xlsx", "ods"].includes(extension ?? "")) {
    return "spreadsheet";
  }

  if (["ppt", "pptx", "odp"].includes(extension ?? "")) {
    return "presentation";
  }

  if (["zip", "7z", "rar", "tar", "gz"].includes(extension ?? "")) {
    return "archive";
  }

  return "unknown";
}

function getIconLabel(kind: AttachmentPreviewKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "text":
      return "Text";
    case "document":
      return "Document";
    case "spreadsheet":
      return "Sheet";
    case "presentation":
      return "Slides";
    case "archive":
      return "Archive";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    default:
      return "File";
  }
}

function getExtension(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");

  if (index < 0 || index === normalized.length - 1) {
    return null;
  }

  return normalized.slice(index + 1);
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
