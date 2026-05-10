import {
  CategoryRepository,
  ContactFieldRepository,
  ContainerRepository,
  MigrationService,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContactLabelBrowserService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("ContactLabelBrowserService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    seedContacts();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("normalizes filters and groups contacts by selected company labels", () => {
    const service = new ContactLabelBrowserService({
      connection,
      now: () => new Date("2026-05-03T00:00:00.000Z")
    });

    const viewModel = service.getViewModel({
      workspaceId: "workspace_1",
      fieldFilters: [
        { label: "Company", value: "ACME" },
        { label: "Company", value: "acme" }
      ],
      tagSlugs: ["vip"],
      groupBy: "company"
    });

    expect(viewModel.generatedAt).toBe("2026-05-03T00:00:00.000Z");
    expect(viewModel.filters.fieldFilters).toEqual([
      { labelKey: "company", valueKey: "acme" }
    ]);
    expect(viewModel.selectedTags.map((tag) => tag.slug)).toEqual(["vip"]);
    expect(viewModel.contacts.map((contact) => contact.name)).toEqual([
      "Alex Chen"
    ]);
    expect(viewModel.groups).toMatchObject([
      {
        key: "Acme",
        contactCount: 1
      }
    ]);
    expect(viewModel.fieldFacets.map((facet) => facet.labelKey)).toContain("email");
  });

  it("rejects invalid tag slugs", () => {
    const service = new ContactLabelBrowserService({ connection });

    expect(() =>
      service.getViewModel({ workspaceId: "workspace_1", tagSlugs: ["bad#tag"] })
    ).toThrow("Tag slugs must contain only letters, numbers, and hyphens.");
  });
});

function seedContacts(): void {
  const timestamp = "2026-05-01T00:00:00.000Z";
  const categories = new CategoryRepository(connection);
  const containers = new ContainerRepository(connection);
  const fields = new ContactFieldRepository(connection);
  const tags = new TagRepository(connection);

  categories.create({
    id: "category_customer",
    workspaceId: "workspace_1",
    name: "Customer",
    slug: "customer",
    color: "#245c55",
    timestamp
  });
  tags.create({
    id: "tag_vip",
    workspaceId: "workspace_1",
    name: "VIP",
    slug: "vip",
    timestamp
  });

  for (const [id, name] of [
    ["contact_alex", "Alex Chen"],
    ["contact_bailey", "Bailey Stone"]
  ] as const) {
    containers.create({
      id,
      workspaceId: "workspace_1",
      type: "contact",
      name,
      slug: name.toLowerCase().replace(" ", "-"),
      categoryId: "category_customer",
      timestamp
    });
  }

  for (const [id, contactId, label, value, type] of [
    ["field_1", "contact_alex", "Company", "Acme", "text"],
    ["field_2", "contact_alex", "Email", "alex@acme.test", "email"],
    ["field_3", "contact_bailey", "Company", "Globex", "text"],
    ["field_4", "contact_bailey", "Email", "bailey@globex.test", "email"]
  ] as const) {
    fields.create({
      id,
      workspaceId: "workspace_1",
      containerId: contactId,
      label,
      value,
      type,
      timestamp
    });
  }

  tags.createTagging({
    id: "tagging_1",
    workspaceId: "workspace_1",
    tagId: "tag_vip",
    targetType: "container",
    targetId: "contact_alex",
    source: "manual",
    timestamp
  });
}
