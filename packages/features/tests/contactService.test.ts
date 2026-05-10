import {
  ActivityLogRepository,
  ContactFieldRepository,
  ContainerRepository,
  ContainerTabRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContactService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ContactService", () => {
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
      schemaVersion: 2,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates a contact with profile fields, a Main tab, activity events, and search projection", async () => {
    const result = await createService().createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen",
      description: "Main client stakeholder",
      fields: [
        {
          label: "Email",
          value: "alex@example.com",
          type: "email",
          sortOrder: 10
        },
        {
          label: "Office",
          value: "Sydney",
          type: "address",
          sortOrder: 20
        }
      ]
    });

    expect(result.contact).toMatchObject({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "contact",
      name: "Alex Chen",
      slug: "alex-chen",
      description: "Main client stakeholder",
      status: "active",
      isSystem: false
    });
    expect(result.defaultTab).toMatchObject({
      id: "container_tab_2",
      containerId: "container_1",
      name: "Main",
      isDefault: true
    });
    expect(result.fields).toMatchObject([
      {
        id: "contact_field_3",
        label: "Email",
        value: "alex@example.com",
        type: "email"
      },
      {
        id: "contact_field_4",
        label: "Office",
        value: "Sydney",
        type: "address"
      }
    ]);
    expect(result.searchRecord).toMatchObject({
      id: "search_8",
      targetType: "container",
      targetId: "container_1",
      title: "Alex Chen",
      isDeleted: false
    });
    expect(result.searchRecord.body).toContain("alex@example.com");
    expect(result.searchRecord.body).toContain("Sydney");
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      contactFieldLabels: ["Email", "Office"],
      contactFieldValues: ["alex@example.com", "Sydney"],
      contactFieldTypes: ["email", "address"]
    });
    expect(new ContainerRepository(connection).getById("container_1")).toEqual(
      result.contact
    );
    expect(new ContainerTabRepository(connection).findDefaultTab("container_1"))
      .toEqual(result.defaultTab);
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      "container_1"
    )).toMatchObject([{ action: "container_created" }]);
    expect(new ActivityLogRepository(connection).listForTarget(
      "contact_field",
      "contact_field_3"
    )).toMatchObject([{ action: "contact_field_created" }]);
  });

  it("updates contact fields, refreshes search, and records field activity", async () => {
    const service = createService();
    const created = await service.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen"
    });
    const field = await service.addContactField({
      contactId: created.contact.id,
      label: "Email",
      value: "old@example.com",
      type: "email"
    });

    const updatedField = await service.updateContactField({
      fieldId: field.id,
      value: "new@example.com",
      sortOrder: 30
    });

    expect(updatedField).toMatchObject({
      value: "new@example.com",
      sortOrder: 30
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: created.contact.id
    })?.body).toContain("new@example.com");
    expect(new ActivityLogRepository(connection).listForTarget(
      "contact_field",
      field.id
    )).toMatchObject([
      { action: "contact_field_created" },
      { action: "contact_field_updated" }
    ]);
  });

  it("deletes contact fields from active lists and search projection", async () => {
    const service = createService();
    const created = await service.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen",
      fields: [
        {
          label: "Email",
          value: "alex@example.com",
          type: "email"
        }
      ]
    });

    const deleted = await service.deleteContactField(created.fields[0].id);

    expect(deleted.deletedAt).toBe("2026-05-01T00:00:00.000Z");
    expect(new ContactFieldRepository(connection).listForContact({
      workspaceId: "workspace_1",
      containerId: created.contact.id
    })).toEqual([]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: created.contact.id
    })?.body).not.toContain("alex@example.com");
    expect(new ActivityLogRepository(connection).listForTarget(
      "contact_field",
      deleted.id
    )).toMatchObject([
      { action: "contact_field_created" },
      { action: "contact_field_deleted" }
    ]);
  });

  it("updates and archives contacts without returning archived contacts in lists", async () => {
    const service = createService();
    const created = await service.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen",
      description: "Client"
    });

    const updated = await service.updateContact({
      contactId: created.contact.id,
      name: "Alex Chen Revised",
      description: "Vendor",
      status: "waiting"
    });
    const archived = await service.archiveContact(created.contact.id);

    expect(updated).toMatchObject({
      name: "Alex Chen Revised",
      description: "Vendor",
      status: "waiting"
    });
    expect(archived).toMatchObject({
      status: "archived",
      archivedAt: "2026-05-01T00:00:00.000Z"
    });
    expect(service.listContacts("workspace_1")).toEqual([]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: created.contact.id
    })).toMatchObject({
      title: "Alex Chen Revised",
      body: "Vendor"
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      created.contact.id
    )).toMatchObject([
      { action: "container_created" },
      { action: "container_updated" },
      { action: "container_archived" }
    ]);
  });

  it("generates workspace-unique contact slugs", async () => {
    const service = createService();

    const first = await service.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen"
    });
    const second = await service.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen"
    });

    expect(first.contact.slug).toBe("alex-chen");
    expect(second.contact.slug).toBe("alex-chen-2");
  });
});

function createService(): ContactService {
  return new ContactService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}
