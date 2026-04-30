export {
  createDatabaseConnection,
  type CreateDatabaseConnectionInput,
  type DatabaseConnection
} from "./connection/createDatabaseConnection";
export {
  WORKSPACE_DATABASE_FILE_NAME,
  WORKSPACE_DATABASE_RELATIVE_PATH,
  resolveWorkspaceDataPath,
  resolveWorkspaceDatabasePath
} from "./connection/databasePath";
export {
  MigrationService,
  type AppliedMigration,
  type MigrationDefinition,
  type MigrationRunResult,
  type MigrationStatus
} from "./services/MigrationService";
export {
  DatabaseHealthService,
  type DatabaseHealthReport
} from "./services/DatabaseHealthService";
export { migrations } from "./migrations";
export * as schema from "./schema";
