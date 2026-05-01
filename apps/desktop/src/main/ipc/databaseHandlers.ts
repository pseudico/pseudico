import {
  ActivityLogRepository,
  ContainerRepository,
  DashboardRepository,
  DatabaseHealthService,
  WorkspaceRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiOk,
  type ApiResult,
  type DatabaseHealthStatus
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

export async function handleGetDatabaseHealthStatus(
  workspaceService: Pick<WorkspaceFileSystemService, "getCurrentWorkspace">
): Promise<ApiResult<DatabaseHealthStatus>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiOk(disconnectedHealth("No workspace is open.", null));
  }

  const databasePath = resolveWorkspaceDatabasePath(workspace.rootPath);
  let connection: DatabaseConnection | null = null;

  try {
    connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    const report = await new DatabaseHealthService({
      connection
    }).getHealthReport();

    if (!report.connected || report.schemaVersion === null) {
      return apiOk({
        ...disconnectedHealth(
          report.error ?? "Database is not connected.",
          databasePath
        ),
        connected: report.connected,
        schemaVersion: report.schemaVersion
      });
    }

    return apiOk({
      connected: true,
      schemaVersion: report.schemaVersion,
      workspaceExists:
        new WorkspaceRepository(connection).findById(workspace.id) !== null,
      inboxExists:
        new ContainerRepository(connection).findSystemInbox(workspace.id) !==
        null,
      defaultDashboardExists:
        new DashboardRepository(connection).findDefaultDashboard(workspace.id) !==
        null,
      activityLogAvailable:
        new ActivityLogRepository(connection).findWorkspaceCreated(
          workspace.id
        ) !== null,
      searchIndexAvailable: isSearchIndexAvailable(connection),
      databasePath,
      error: null
    });
  } catch (error) {
    return apiOk(
      disconnectedHealth(
        error instanceof Error ? error.message : "Database health check failed.",
        databasePath
      )
    );
  } finally {
    connection?.close();
  }
}

function disconnectedHealth(
  error: string,
  databasePath: string | null
): DatabaseHealthStatus {
  return {
    connected: false,
    schemaVersion: null,
    workspaceExists: false,
    inboxExists: false,
    defaultDashboardExists: false,
    activityLogAvailable: false,
    searchIndexAvailable: false,
    databasePath,
    error
  };
}

function isSearchIndexAvailable(connection: DatabaseConnection): boolean {
  const table = connection.sqlite
    .prepare<[string], { name: string }>(
      `select name
       from sqlite_master
       where type = 'table'
         and name = ?
       limit 1`
    )
    .get("search_index");

  return table !== undefined;
}
