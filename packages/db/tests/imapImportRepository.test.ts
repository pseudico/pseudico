import {
  ContainerRepository,
  ImapImportRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "../src";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

const NOW = "2026-05-13T00:00:00.000Z";

describe("ImapImportRepository", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: NOW
    });
    new ContainerRepository(connection).create({
      id: "container_inbox_1",
      workspaceId: "workspace_1",
      type: "inbox",
      name: "Inbox",
      slug: "inbox",
      isSystem: true,
      timestamp: NOW
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("records IMAP jobs and duplicate prevention markers", () => {
    const repository = new ImapImportRepository(connection);
    const job = repository.createJob({
      id: "imap_job_1",
      workspaceId: "workspace_1",
      accountKey: "ada@mail.example:993",
      mailbox: "INBOX",
      filterJson: '{"mode":"unread","limit":10}',
      startedAt: NOW,
      timestamp: NOW
    });

    expect(job).toMatchObject({
      id: "imap_job_1",
      status: "running",
      importedCount: 0,
      skippedDuplicateCount: 0
    });

    const imported = repository.createImportedMessage({
      id: "imap_message_1",
      workspaceId: "workspace_1",
      accountKey: "ada@mail.example:993",
      mailbox: "INBOX",
      messageUid: "42",
      messageId: "<message-42@example.test>",
      itemId: null,
      importedAt: NOW,
      timestamp: NOW
    });

    expect(repository.findImportedMessage({
      workspaceId: "workspace_1",
      accountKey: "ada@mail.example:993",
      mailbox: "INBOX",
      messageUid: "42"
    })).toEqual(imported);
    expect(repository.findImportedMessage({
      workspaceId: "workspace_1",
      accountKey: "ada@mail.example:993",
      mailbox: "INBOX",
      messageUid: "different",
      messageId: "<message-42@example.test>"
    })).toEqual(imported);

    expect(repository.completeJob({
      jobId: job.id,
      status: "completed",
      finishedAt: "2026-05-13T00:05:00.000Z",
      importedCount: 1,
      skippedDuplicateCount: 2
    })).toMatchObject({
      status: "completed",
      importedCount: 1,
      skippedDuplicateCount: 2
    });
    expect(repository.listJobs({ workspaceId: "workspace_1" })).toHaveLength(1);
  });
});
