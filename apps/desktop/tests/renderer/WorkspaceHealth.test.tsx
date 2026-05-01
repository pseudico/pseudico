import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  DatabaseHealthStatus,
  WorkspaceSummary
} from "../../src/preload/api";
import { WorkspaceHealthSummary } from "../../src/renderer/pages/WorkspaceHealthPanel";

const workspace: WorkspaceSummary = {
  id: "workspace_test",
  name: "Test Workspace",
  rootPath: "C:\\Work\\Test Workspace",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const healthyDatabase: DatabaseHealthStatus = {
  connected: true,
  schemaVersion: 1,
  workspaceExists: true,
  inboxExists: true,
  defaultDashboardExists: true,
  activityLogAvailable: true,
  searchIndexAvailable: true,
  databasePath: "C:\\Work\\Test Workspace\\data\\local-work-os.sqlite",
  error: null
};

describe("WorkspaceHealthSummary", () => {
  it("renders healthy workspace and database details from mocked preload data", () => {
    const html = renderToString(
      <WorkspaceHealthSummary
        error={null}
        health={healthyDatabase}
        loading={false}
        workspace={workspace}
      />
    );

    expect(html).toContain("Workspace health");
    expect(html).toContain("Test Workspace");
    expect(html).toContain("Connected");
    expect(html).toContain("Schema version");
    expect(html).toContain("Inbox");
    expect(html).toContain("Activity log");
    expect(html).toContain("Search index");
  });

  it("renders database error state without crashing", () => {
    const html = renderToString(
      <WorkspaceHealthSummary
        error="Database health check failed."
        health={{
          ...healthyDatabase,
          connected: false,
          schemaVersion: null,
          workspaceExists: false,
          inboxExists: false,
          defaultDashboardExists: false,
          activityLogAvailable: false,
          searchIndexAvailable: false,
          error: "Database health check failed."
        }}
        loading={false}
        workspace={workspace}
      />
    );

    expect(html).toContain("Database health check failed.");
    expect(html).toContain("Disconnected");
    expect(html).toContain("Schema version");
    expect(html).toContain("No");
  });
});
