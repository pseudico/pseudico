import {
  apiOk,
  type ApiResult,
  type DatabaseHealthStatus
} from "../../preload/api";

export function handleGetDatabaseHealthStatus(): ApiResult<DatabaseHealthStatus> {
  return apiOk({
    connected: false,
    schemaVersion: null,
    workspaceExists: false,
    inboxExists: false,
    activityLogAvailable: false,
    searchIndexAvailable: false,
    databasePath: null
  });
}
