import { describe, expect, it } from "vitest";
import { AttachmentPreviewService } from "../src";

describe("AttachmentPreviewService", () => {
  it("builds image preview metadata with checksum and version state", () => {
    const preview = new AttachmentPreviewService().buildPreview({
      attachment: {
        id: "attachment_1",
        workspaceId: "workspace_1",
        itemId: "item_1",
        originalName: "Mockup.PNG",
        storedName: "Mockup.PNG",
        mimeType: "image/png",
        sizeBytes: 2048,
        checksum: "abcdef1234567890",
        storagePath: "attachments/2026/05/attachment_1/Mockup.PNG",
        description: null,
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T01:00:00.000Z",
        deletedAt: null
      },
      missing: false,
      versionCount: 2,
      latestVersionNumber: 2,
      thumbnailStoragePath: ".cache/attachment-previews/attachment_1/thumbnail.png",
      thumbnailExists: true,
      previewDataUrl: "data:image/png;base64,abc"
    });

    expect(preview).toMatchObject({
      attachmentId: "attachment_1",
      kind: "image",
      iconLabel: "Image",
      extension: "png",
      sizeLabel: "2.0 KB",
      missing: false,
      checksumShort: "abcdef123456",
      versionCount: 2,
      latestVersionNumber: 2,
      thumbnailExists: true
    });
  });

  it("falls back to file type icons for non-image attachments", () => {
    const preview = new AttachmentPreviewService().buildPreview({
      attachment: {
        id: "attachment_2",
        workspaceId: "workspace_1",
        itemId: "item_2",
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 512,
        checksum: null,
        storagePath: "attachments/2026/05/attachment_2/Brief.pdf",
        description: null,
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T01:00:00.000Z",
        deletedAt: null
      },
      missing: true
    });

    expect(preview).toMatchObject({
      kind: "pdf",
      iconLabel: "PDF",
      missing: true,
      checksumShort: null,
      versionCount: 0,
      latestVersionNumber: null,
      previewDataUrl: null
    });
  });
});
