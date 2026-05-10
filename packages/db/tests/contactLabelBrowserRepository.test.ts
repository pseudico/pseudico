import {
  CategoryRepository,
  ContactFieldRepository,
  ContactLabelBrowserRepository,
  ContainerRepository,
  TagRepository,
  type DatabaseConnection
} from "../src";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let db: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ContactLabelBrowserRepository", () => {
  beforeEach(async () => {
    db = await createRepositoryTestDatabase();
    connection = db.connection;
    seedWorkspace(connection);
    seedContactLabels();
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it("returns custom field, company, role, location, email domain, tag, and category facets", () => {
    const repository = new ContactLabelBrowserRepository(connection);

    expect(
      repository
        .listFieldFacets({ workspaceId: "workspace_1" })
        .map((facet) => [facet.labelKey, facet.valueKey, facet.contactCount])
    ).toContainEqual(["company", "acme", 2]);
    expect(
      repository
        .listCompanyFacets({ workspaceId: "workspace_1" })
        .map((facet) => [facet.valueKey, facet.contactCount])
    ).toEqual([
      ["acme", 2],
      ["globex", 1]
    ]);
    expect(
      repository
        .listEmailDomainFacets({ workspaceId: "workspace_1" })
        .map((facet) => [facet.valueKey, facet.contactCount])
    ).toEqual([
      ["acme.test", 2],
      ["globex.test", 1]
    ]);
    expect(
      repository
        .listTagFacets({ workspaceId: "workspace_1" })
        .map((facet) => [facet.slug, facet.contactCount])
    ).toEqual([
      ["client", 2],
      ["vip", 2]
    ]);
    expect(
      repository
        .listCategoryFacets({ workspaceId: "workspace_1" })
        .map((facet) => [facet.slug, facet.contactCount])
    ).toEqual([["customer", 2]]);
  });

  it("narrows contacts by field, company, role, location, email domain, tag, category, and status", () => {
    const repository = new ContactLabelBrowserRepository(connection);

    expect(
      repository
        .listContacts({
          workspaceId: "workspace_1",
          fieldFilters: [{ labelKey: "company", valueKey: "acme" }],
          tagSlugs: ["vip"]
        })
        .map((contact) => contact.name)
    ).toEqual(["Alex Chen"]);

    expect(
      repository
        .listContacts({
          workspaceId: "workspace_1",
          company: "acme",
          role: "buyer",
          location: "sydney",
          emailDomain: "acme.test",
          categoryId: "category_customer",
          status: "waiting"
        })
        .map((contact) => contact.name)
    ).toEqual(["Bailey Stone"]);
  });

  it("excludes archived contacts unless archived status is selected", () => {
    const repository = new ContactLabelBrowserRepository(connection);

    expect(
      repository
        .listContacts({ workspaceId: "workspace_1", company: "acme" })
        .map((contact) => contact.name)
    ).toEqual(["Alex Chen", "Bailey Stone"]);

    expect(
      repository
        .listContacts({
          workspaceId: "workspace_1",
          company: "acme",
          status: "archived"
        })
        .map((contact) => contact.name)
    ).toEqual(["Archived Acme"]);
  });
});

function seedContactLabels(): void {
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

  for (const [id, name, slug] of [
    ["tag_client", "Client", "client"],
    ["tag_vip", "VIP", "vip"]
  ] as const) {
    tags.create({ id, workspaceId: "workspace_1", name, slug, timestamp });
  }

  for (const contact of [
    ["contact_alex", "Alex Chen", "alex-chen", "active"],
    ["contact_bailey", "Bailey Stone", "bailey-stone", "waiting"],
    ["contact_casey", "Casey Park", "casey-park", "active"],
    ["contact_archived", "Archived Acme", "archived-acme", "active"]
  ] as const) {
    containers.create({
      id: contact[0],
      workspaceId: "workspace_1",
      type: "contact",
      name: contact[1],
      slug: contact[2],
      status: contact[3],
      categoryId: contact[0] === "contact_casey" ? null : "category_customer",
      timestamp
    });
  }
  containers.archive("contact_archived", "2026-05-02T00:00:00.000Z");

  for (const [id, contactId, label, value, type] of [
    ["field_1", "contact_alex", "Company", "Acme", "text"],
    ["field_2", "contact_alex", "Role", "Decision Maker", "text"],
    ["field_3", "contact_alex", "Office", "Melbourne", "address"],
    ["field_4", "contact_alex", "Email", "alex@acme.test", "email"],
    ["field_5", "contact_bailey", "Company", "Acme", "text"],
    ["field_6", "contact_bailey", "Role", "Buyer", "text"],
    ["field_7", "contact_bailey", "Location", "Sydney", "address"],
    ["field_8", "contact_bailey", "Email", "bailey@acme.test", "email"],
    ["field_9", "contact_casey", "Company", "Globex", "text"],
    ["field_10", "contact_casey", "Role", "Buyer", "text"],
    ["field_11", "contact_casey", "Email", "casey@globex.test", "email"],
    ["field_12", "contact_archived", "Company", "Acme", "text"]
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

  for (const [id, tagId, contactId] of [
    ["tagging_1", "tag_client", "contact_alex"],
    ["tagging_2", "tag_vip", "contact_alex"],
    ["tagging_3", "tag_client", "contact_bailey"],
    ["tagging_4", "tag_vip", "contact_casey"]
  ] as const) {
    tags.createTagging({
      id,
      workspaceId: "workspace_1",
      tagId,
      targetType: "container",
      targetId: contactId,
      source: "manual",
      timestamp
    });
  }
}
