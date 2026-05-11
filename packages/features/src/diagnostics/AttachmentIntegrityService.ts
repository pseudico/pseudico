import type { AttachmentRecord } from "@local-work-os/core";
import { AttachmentRepository, type DatabaseConnection } from "@local-work-os/db";

export type DuplicateAttachmentGroup = {
  checksum: string;
  attachments: AttachmentRecord[];
};

// Owns attachment-focused diagnostics that can be reused by workspace audits.
export class AttachmentIntegrityService {
  readonly module = "attachment-integrity";

  private readonly connection: DatabaseConnection;

  constructor(input: { connection: DatabaseConnection }) {
    this.connection = input.connection;
  }

  listDuplicateChecksumGroups(workspaceId: string): DuplicateAttachmentGroup[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    const groups = new Map<string, AttachmentRecord[]>();

    for (const attachment of new AttachmentRepository(
      this.connection
    ).listByWorkspace({ workspaceId })) {
      const checksum = attachment.checksum?.trim().toLowerCase();

      if (checksum === undefined || checksum.length === 0) {
        continue;
      }

      groups.set(checksum, [...(groups.get(checksum) ?? []), attachment]);
    }

    return [...groups.entries()]
      .filter(([, attachments]) => attachments.length > 1)
      .map(([checksum, attachments]) => ({ checksum, attachments }));
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
