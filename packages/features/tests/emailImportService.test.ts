import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EmailImportService,
  parseEmailMessage,
  sanitizeEmailBody
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const TIMESTAMP = "2026-05-01T00:00:00.000Z";
const EML_FIXTURE = `From: Alice <alice@example.test>
To: Bob <bob@example.test>
Subject: Follow up @client
Date: Wed, 13 May 2026 10:30:00 +1000
Message-ID: <message-1@example.test>
Content-Type: text/plain; charset=utf-8

Please follow up on the proposal.

Bring @launch notes.`;

const HTML_EML_FIXTURE = `From: Mallory <mallory@example.test>
To: Bob <bob@example.test>
Subject: HTML body
Content-Type: text/html; charset=utf-8

<html><body><script>window.evil = true;</script><p>Hello &amp; welcome</p><style>body{}</style><p>@safe</p></body></html>`;

describe("EmailImportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: TIMESTAMP
    });
    new ContainerRepository(connection).create({
      id: "container_inbox_1",
      workspaceId: "workspace_1",
      type: "inbox",
      name: "Inbox",
      slug: "inbox",
      isSystem: true,
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("parses EML headers, body text, and inline tags for preview", () => {
    const parsed = parseEmailMessage({
      sourcePath: "mail/follow-up.eml",
      fileName: "follow-up.eml",
      raw: EML_FIXTURE
    });

    expect(parsed).toMatchObject({
      subject: "Follow up @client",
      from: "Alice <alice@example.test>",
      to: "Bob <bob@example.test>",
      messageId: "<message-1@example.test>",
      sanitizedBody: expect.stringContaining("Please follow up")
    });
    expect(parsed.inlineTags).toEqual(["client", "launch"]);

    expect(createService().previewMessages([
      {
        sourcePath: "mail/follow-up.eml",
        fileName: "follow-up.eml",
        raw: EML_FIXTURE
      }
    ])).toMatchObject([
      {
        taskTitle: "Email: Follow up @client",
        inlineTags: ["client", "launch"],
        warning: null
      }
    ]);
  });

  it("sanitizes HTML email bodies before creating task content", () => {
    const parsed = parseEmailMessage({
      sourcePath: "mail/html.eml",
      fileName: "html.eml",
      raw: HTML_EML_FIXTURE
    });

    expect(parsed.sanitizedBody).toContain("Hello & welcome");
    expect(parsed.sanitizedBody).toContain("@safe");
    expect(parsed.sanitizedBody).not.toContain("window.evil");
    expect(parsed.sanitizedBody).not.toContain("<script>");
    expect(sanitizeEmailBody("<p>A&nbsp;B</p>", true)).toBe("A B");
  });

  it("imports EML messages as tasks with original emails attached locally", async () => {
    const summary = await createService().importMessagesAsTasks({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      messages: [
        {
          sourcePath: "C:/mail/follow-up.eml",
          fileName: "follow-up.eml",
          raw: EML_FIXTURE,
          copiedOriginal: {
            attachmentId: "attachment_email_original",
            originalName: "follow-up.eml",
            storedName: "follow-up.eml",
            storagePath:
              "attachments/2026/05/attachment_email_original/follow-up.eml",
            sizeBytes: 256,
            checksum: "a".repeat(64),
            mimeType: "message/rfc822"
          }
        }
      ]
    });

    expect(summary).toMatchObject({
      workspaceId: "workspace_1",
      importedCount: 1,
      skippedCount: 0,
      issues: []
    });
    expect(summary.results[0]?.task.item).toMatchObject({
      type: "task",
      title: "Email: Follow up @client",
      body: expect.stringContaining("From: Alice <alice@example.test>")
    });
    expect(summary.results[0]?.task.item.body).toContain("Tags: @client @launch");
    expect(summary.results[0]?.originalAttachment).toMatchObject({
      id: "attachment_email_original",
      itemId: summary.results[0]?.task.item.id,
      mimeType: "message/rfc822",
      description: "Original imported email"
    });
    expect(new AttachmentRepository(connection).listForItem({
      workspaceId: "workspace_1",
      itemId: summary.results[0]!.task.item.id
    })).toHaveLength(1);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.results[0]!.task.item.id
    })).toMatchObject({
      title: "Email: Follow up @client",
      body: expect.stringContaining("proposal")
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      summary.results[0]!.task.item.id
    )).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "task_created", actorType: "importer" })
      ])
    );
    expect(new ActivityLogRepository(connection).listForTarget(
      "attachment",
      "attachment_email_original"
    )).toMatchObject([{ action: "file_attached", actorType: "importer" }]);
  });

  it("continues bulk imports when individual messages are empty or invalid", async () => {
    const summary = await createService().importMessagesAsTasks({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      messages: [
        {
          sourcePath: "C:/mail/empty.eml",
          fileName: "empty.eml",
          raw: "   "
        },
        {
          sourcePath: "C:/mail/html.eml",
          fileName: "html.eml",
          raw: HTML_EML_FIXTURE
        }
      ]
    });

    expect(summary.importedCount).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.issues).toMatchObject([
      { sourcePath: "C:/mail/empty.eml", code: "empty_message" }
    ]);
    expect(summary.results[0]?.task.item.title).toBe("Email: HTML body");
  });
});

function createService(): EmailImportService {
  return new EmailImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-13T01:02:03.000Z")
  });
}
