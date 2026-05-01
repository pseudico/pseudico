import { afterEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  makeTestIds,
  seedTestData,
  type TestDatabaseHandle
} from "@local-work-os/test-utils";
import {
  ActivityLogRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  DatabaseHealthService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "../src";

let testDatabase: TestDatabaseHandle | null = null;
let connection: DatabaseConnection | null = null;

describe("database bootstrap integration", () => {
  afterEach(async () => {
    connection?.close();
    connection = null;
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it("bootstraps a temp workspace database with Inbox, activity, and health", async () => {
    testDatabase = await createTestDatabase();
    const ids = makeTestIds();
    const seed = seedTestData({
      workspaceId: testDatabase.manifest.id,
      workspaceName: testDatabase.manifest.name
    });

    const bootstrap = await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(seed.timestamp)
    }).bootstrapWorkspaceDatabase({
      databasePath: testDatabase.databasePath,
      workspaceId: seed.workspaceId,
      workspaceName: seed.workspaceName
    });

    expect(bootstrap.schemaVersion).toBe(1);
    expect(bootstrap.seed.systemInbox.created).toBe(true);
    expect(bootstrap.seed.workspaceCreatedActivity.created).toBe(true);

    connection = await createDatabaseConnection({
      databasePath: testDatabase.databasePath,
      fileMustExist: true
    });

    const workspace = new WorkspaceRepository(connection).findById(
      seed.workspaceId
    );
    const inbox = new ContainerRepository(connection).findSystemInbox(
      seed.workspaceId
    );
    const activity = new ActivityLogRepository(connection).findWorkspaceCreated(
      seed.workspaceId
    );
    const health = await new DatabaseHealthService({
      connection
    }).getHealthReport();

    expect(workspace).toMatchObject({
      id: seed.workspaceId,
      name: seed.workspaceName,
      schemaVersion: 1
    });
    expect(inbox).toMatchObject({
      workspaceId: seed.workspaceId,
      type: "inbox",
      name: "Inbox",
      isSystem: true
    });
    expect(activity).toMatchObject({
      workspaceId: seed.workspaceId,
      actorType: "system",
      action: "workspace_created",
      targetType: "workspace",
      targetId: seed.workspaceId
    });
    expect(health).toMatchObject({
      connected: true,
      schemaVersion: 1,
      migrationTableAvailable: true,
      pendingMigrationCount: 0,
      error: null
    });
  });
});
