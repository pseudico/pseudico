import {
  ActivityLogRepository,
  ContainerRepository,
  ImapImportRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ImapImportService,
  type ImapClientAdapter,
  type ImapCredentialStore,
  type ImapImportSettings
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-13T00:00:00.000Z";
const EML_ONE = `From: Ada <ada@example.test>
To: Bob <bob@example.test>
Subject: IMAP first @mail
Date: Wed, 13 May 2026 10:30:00 +1000
Message-ID: <imap-1@example.test>
Content-Type: text/plain; charset=utf-8

Please turn this into a local task.`;
const EML_TWO = `From: Ada <ada@example.test>
To: Bob <bob@example.test>
Subject: IMAP second
Date: Wed, 13 May 2026 10:40:00 +1000
Message-ID: <imap-2@example.test>
Content-Type: text/plain; charset=utf-8

Second task body.`;

describe("ImapImportService", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("saves non-secret IMAP settings and tests the adapter connection", async () => {
    const service = createService({
      client: clientAdapter([]),
      credentialStore: memoryCredentialStore()
    });

    const settings = await service.saveSettings({
      workspaceId: "workspace_1",
      displayName: "Local test mailbox",
      host: "imap.example.test",
      port: 993,
      secure: true,
      username: "ada@example.test",
      mailbox: "INBOX",
      enabled: true,
      filter: { mode: "label", label: "LocalWork", limit: 10 },
      password: "not-persisted-in-sqlite"
    });

    expect(settings.accountKey).toBe("ada@example.test@imap.example.test:993");
    expect(service.getSettings("workspace_1")).toMatchObject({
      displayName: "Local test mailbox",
      credentialStorage: "manual_session",
      filter: { mode: "label", label: "LocalWork", limit: 10 }
    });
    const row = connection.sqlite
      .prepare<[], { value_json: string }>("select value_json from app_settings limit 1")
      .get();
    expect(row?.value_json).not.toContain("not-persisted-in-sqlite");

    await expect(service.testConnection({ workspaceId: "workspace_1" })).resolves.toMatchObject({
      ok: true,
      capabilities: ["IMAP4rev1"]
    });
  });

  it("imports unread or labelled IMAP messages as tasks and skips duplicates on rerun", async () => {
    const service = createService({
      client: clientAdapter([
        { uid: "1", raw: EML_ONE, messageId: "<imap-1@example.test>" },
        { uid: "2", raw: EML_TWO, messageId: "<imap-2@example.test>" }
      ]),
      credentialStore: memoryCredentialStore()
    });
    const settings = await saveDefaultSettings(service);

    const firstRun = await service.importMessages({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      settings
    });

    expect(firstRun.job).toMatchObject({
      status: "completed",
      importedCount: 2,
      skippedDuplicateCount: 0
    });
    expect(firstRun.emailSummary.importedCount).toBe(2);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: firstRun.emailSummary.results[0]!.task.item.id
    })).toMatchObject({ title: "Email: IMAP first @mail" });

    const secondRun = await service.importMessages({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      settings
    });

    expect(secondRun.job).toMatchObject({
      status: "completed",
      importedCount: 0,
      skippedDuplicateCount: 2
    });
    expect(secondRun.skippedDuplicates.map((message) => message.uid)).toEqual(["1", "2"]);
    expect(new ImapImportRepository(connection).listJobs({ workspaceId: "workspace_1" })).toHaveLength(2);
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "imap_import_completed", actorType: "importer" })
      ])
    );
  });
});

async function saveDefaultSettings(service: ImapImportService): Promise<ImapImportSettings> {
  return await service.saveSettings({
    workspaceId: "workspace_1",
    displayName: "Local test mailbox",
    host: "imap.example.test",
    port: 993,
    secure: true,
    username: "ada@example.test",
    mailbox: "INBOX",
    enabled: true,
    filter: { mode: "unread", limit: 50 },
    password: "secret"
  });
}

function createService(input: {
  client: ImapClientAdapter;
  credentialStore: ImapCredentialStore;
}): ImapImportService {
  return new ImapImportService({
    connection,
    client: input.client,
    credentialStore: input.credentialStore,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-13T01:02:03.000Z")
  });
}

function clientAdapter(messages: Parameters<ImapClientAdapter["fetchMessages"]>[2] extends never ? never : Array<{ uid: string; raw: string; messageId: string }>): ImapClientAdapter {
  return {
    async testConnection(settings) {
      return {
        ok: true,
        accountKey: settings.accountKey,
        message: `Connected to ${settings.host}.`,
        capabilities: ["IMAP4rev1"]
      };
    },
    async fetchMessages(_settings, _credential, filter) {
      return messages.slice(0, filter.limit ?? messages.length);
    }
  };
}

function memoryCredentialStore(): ImapCredentialStore {
  const credentials = new Map<string, { password: string }>();
  return {
    kind: "manual_session",
    async get(accountKey) {
      return credentials.get(accountKey) ?? null;
    },
    async save(accountKey, credential) {
      credentials.set(accountKey, credential);
    }
  };
}
