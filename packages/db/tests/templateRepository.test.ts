import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TemplateRepository,
  type DatabaseConnection
} from "../src";
import {
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  createRepositoryTestDatabase,
  seedWorkspace,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let database: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("TemplateRepository", () => {
  beforeEach(async () => {
    database = await createRepositoryTestDatabase();
    connection = database.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await database.cleanup();
  });

  it("persists and lists list templates by workspace", () => {
    const repository = new TemplateRepository(connection);
    const json = JSON.stringify({ version: 1, kind: "list", list: { title: "Checklist" } });

    const created = repository.create({
      id: "template_1",
      workspaceId: "workspace_1",
      kind: "list",
      name: "Launch checklist",
      description: "Reusable launch steps",
      sourceType: "list",
      sourceId: "item_list_1",
      templateJson: json,
      timestamp: TEST_TIMESTAMP
    });

    expect(created).toMatchObject({
      id: "template_1",
      workspaceId: "workspace_1",
      kind: "list",
      name: "Launch checklist",
      description: "Reusable launch steps",
      sourceType: "list",
      sourceId: "item_list_1",
      templateJson: json,
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP,
      deletedAt: null
    });
    expect(repository.getById("template_1")).toEqual(created);
    expect(
      repository.listByWorkspace({ workspaceId: "workspace_1", kind: "list" })
    ).toEqual([created]);
  });

  it("keeps templates scoped to their workspace", () => {
    const repository = new TemplateRepository(connection);
    seedWorkspace(connection, "workspace_2");
    repository.create({
      id: "template_1",
      workspaceId: "workspace_1",
      kind: "list",
      name: "Workspace one",
      templateJson: "{}",
      timestamp: TEST_TIMESTAMP
    });
    repository.create({
      id: "template_2",
      workspaceId: "workspace_2",
      kind: "list",
      name: "Workspace two",
      templateJson: "{}",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(
      repository.listByWorkspace({ workspaceId: "workspace_1" }).map((template) => template.id)
    ).toEqual(["template_1"]);
    expect(
      repository.listByWorkspace({ workspaceId: "workspace_2" }).map((template) => template.id)
    ).toEqual(["template_2"]);
  });

  it("persists project and contact templates after the container-template migration", () => {
    const repository = new TemplateRepository(connection);

    const projectTemplate = repository.create({
      id: "template_project_1",
      workspaceId: "workspace_1",
      kind: "project",
      name: "Client launch project",
      sourceType: "project",
      sourceId: "container_project_1",
      templateJson: JSON.stringify({ version: 1, kind: "project" }),
      timestamp: TEST_TIMESTAMP
    });
    const contactTemplate = repository.create({
      id: "template_contact_1",
      workspaceId: "workspace_1",
      kind: "contact",
      name: "Client contact",
      sourceType: "contact",
      sourceId: "container_contact_1",
      templateJson: JSON.stringify({ version: 1, kind: "contact" }),
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(repository.listByWorkspace({ workspaceId: "workspace_1", kind: "project" })).toEqual([
      projectTemplate
    ]);
    expect(repository.listByWorkspace({ workspaceId: "workspace_1", kind: "contact" })).toEqual([
      contactTemplate
    ]);
  });
});
