import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexRepository,
  TaskRepository,
  WorkflowRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GUIDED_WORKFLOW_TEMPLATES,
  HOUSE_RENOVATION_CONTACTS,
  HOUSE_RENOVATION_PROJECT_ID,
  GuidedWorkflowService
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection | undefined;
let idCounter = 0;

const WORKSPACE_ID = "workspace_mpg4xgw1_1twlscuxhd8";
const NOW = "2026-05-24T01:02:03.000Z";

describe("GuidedWorkflowService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    const db = requireConnection();
    new MigrationService({ connection: db }).runPendingMigrations();
    new WorkspaceRepository(db).create({
      id: WORKSPACE_ID,
      name: "House Renovation QA 2026 v2",
      schemaVersion: 1,
      timestamp: "2026-05-24T00:00:00.000Z"
    });
    new ContainerRepository(db).create({
      id: HOUSE_RENOVATION_PROJECT_ID,
      workspaceId: WORKSPACE_ID,
      type: "project",
      name: "House Renovation and Fit-Out 2026",
      slug: "house-renovation-and-fit-out-2026",
      status: "active",
      timestamp: "2026-05-24T00:00:00.000Z"
    });
    for (const contact of HOUSE_RENOVATION_CONTACTS) {
      new ContainerRepository(db).create({
        id: contact.id,
        workspaceId: WORKSPACE_ID,
        type: "contact",
        name: contact.name,
        slug: contact.shortName.toLocaleLowerCase().replace(/\s+/g, "-"),
        status: "active",
        timestamp: "2026-05-24T00:00:00.000Z"
      });
    }
    idCounter = 0;
  });

  afterEach(async () => {
    connection?.close();
    await cleanup?.();
  });

  it("defines only predefined nontechnical beta templates", () => {
    expect(GUIDED_WORKFLOW_TEMPLATES.map((template) => template.id)).toEqual([
      "house_project_review",
      "house_contact_follow_up",
      "house_approval_decision_review"
    ]);
    expect(GUIDED_WORKFLOW_TEMPLATES.flatMap((template) => template.doesNotDo)).toContain(
      "No scripts or cloud actions."
    );
    expect(new GuidedWorkflowService({ connection }).listTemplates()[0]).toMatchObject({
      name: "Project review"
    });
  });

  it("previews project review changes without mutating database rows", () => {
    const service = createService();
    const before = countRows();

    const preview = service.preview({
      workspaceId: WORKSPACE_ID,
      templateId: "house_project_review",
      projectId: HOUSE_RENOVATION_PROJECT_ID
    });

    expect(preview.canRun).toBe(true);
    expect(preview.plannedChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          objectType: "note",
          title: "Workflow review: House Renovation and Fit-Out 2026"
        }),
        expect.objectContaining({
          operation: "create",
          objectType: "task",
          title: "Review open balcony approvals @review @balcony"
        })
      ])
    );
    expect(countRows()).toEqual(before);
  });

  it("executes project review through services with activity, search, and run history", async () => {
    const service = createService();

    const result = await service.execute({
      workspaceId: WORKSPACE_ID,
      templateId: "house_project_review",
      projectId: HOUSE_RENOVATION_PROJECT_ID,
      confirmed: true
    });

    expect(result.status).toBe("completed");
    expect(result.partialFailure).toBe(false);
    expect(result.actionResults).toHaveLength(5);
    const db = requireConnection();
    expect(new TaskRepository(db).listByContainer(HOUSE_RENOVATION_PROJECT_ID)).toHaveLength(4);
    expect(new ItemRepository(db).listByContainer(HOUSE_RENOVATION_PROJECT_ID).map((item) => item.title)).toContain(
      "Workflow review: House Renovation and Fit-Out 2026"
    );
    expect(new SearchIndexRepository(db).search(WORKSPACE_ID, "Workflow review")).toHaveLength(1);
    expect(new SearchIndexRepository(db).search(WORKSPACE_ID, "budget-risk")).toHaveLength(1);
    expect(
      new ActivityLogRepository(db)
        .listRecent(WORKSPACE_ID, 25)
        .map((event) => event.action)
    ).toContain("workflow_run_completed");
    expect(new WorkflowRepository(db).listRuns({ workspaceId: WORKSPACE_ID })).toHaveLength(1);
    expect(service.listRunHistory({ workspaceId: WORKSPACE_ID })).toMatchObject([
      {
        templateId: "house_project_review",
        status: "completed",
        plannedChangeCount: 5,
        completedChangeCount: 5
      }
    ]);
  });

  it("executes contact follow-up and links created objects to the selected contact", async () => {
    const service = createService();
    const terry = HOUSE_RENOVATION_CONTACTS.find((contact) => contact.shortName === "Terry")!;

    const result = await service.execute({
      workspaceId: WORKSPACE_ID,
      templateId: "house_contact_follow_up",
      projectId: HOUSE_RENOVATION_PROJECT_ID,
      contactId: terry.id,
      confirmed: true
    });

    expect(result.status).toBe("completed");
    expect(result.preview.contactName).toBe("Terry");
    expect(result.actionResults.map((action) => action.status)).toEqual([
      "created",
      "created",
      "linked",
      "linked"
    ]);
    const db = requireConnection();
    expect(new SearchIndexRepository(db).search(WORKSPACE_ID, "Balcony screen fabrication notes")).toHaveLength(1);
    expect(new RelationshipRepository(db).listOutgoingRelationships({
      workspaceId: WORKSPACE_ID,
      target: { type: "item", id: result.actionResults[0].targetId! }
    })).toMatchObject([
      {
        targetType: "container",
        targetId: terry.id,
        relationType: "follow_up_for"
      }
    ]);
    expect(service.listRunHistory({ workspaceId: WORKSPACE_ID })[0]).toMatchObject({
      templateId: "house_contact_follow_up",
      contactName: "Terry",
      completedChangeCount: 4
    });
  });

  it("records a failed run without creating project data when preview is blocked", async () => {
    const service = createService();

    const result = await service.execute({
      workspaceId: WORKSPACE_ID,
      templateId: "house_approval_decision_review",
      projectId: "missing_project",
      confirmed: true
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("Guided workflow preview has blocking issues.");
    const db = requireConnection();
    expect(new ItemRepository(db).listByContainer(HOUSE_RENOVATION_PROJECT_ID)).toEqual([]);
    expect(new WorkflowRepository(db).listRuns({ workspaceId: WORKSPACE_ID })).toMatchObject([
      { status: "failed" }
    ]);
  });
});

function createService(): GuidedWorkflowService {
  return new GuidedWorkflowService({
    connection: requireConnection(),
    idFactory,
    now: () => new Date(NOW)
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function countRows(): Record<string, number> {
  return {
    items: count("items"),
    taskDetails: count("task_details"),
    noteDetails: count("note_details"),
    workflowRuns: count("workflow_runs"),
    activities: count("activity_log"),
    search: count("search_index"),
    relationships: count("relationships")
  };
}

function count(table: string): number {
  const row = requireConnection().sqlite.prepare(`select count(*) as count from ${table}`).get() as {
    count: number;
  };
  return row.count;
}

function requireConnection(): DatabaseConnection {
  if (connection === undefined) {
    throw new Error("Test database connection was not initialized.");
  }

  return connection;
}
