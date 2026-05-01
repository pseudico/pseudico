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
export {
  DatabaseBootstrapService,
  type BootstrapWorkspaceDatabaseInput,
  type DatabaseBootstrapResult
} from "./services/DatabaseBootstrapService";
export {
  ActivityLogService,
  type ActivityLogIdFactory,
  type LogActivityEventInput
} from "./services/ActivityLogService";
export {
  TransactionService,
  type TransactionHandle
} from "./services/TransactionService";
export {
  SearchIndexService,
  type RebuildWorkspaceIndexResult,
  type SearchIndexIdFactory,
  type SearchIndexTargetType,
  type SearchProjectionInput,
  type SearchWorkspaceInput
} from "./services/SearchIndexService";
export {
  DEFAULT_SORT_ORDER_STEP,
  SortOrderService
} from "./services/SortOrderService";
export { migrations } from "./migrations";
export * from "./repositories";
export * as schema from "./schema";
export {
  DEFAULT_APP_SETTINGS,
  DEFAULT_DASHBOARD_WIDGET_TYPES,
  WorkspaceSeedService,
  type IdFactory,
  type SeedRowStatus,
  type WorkspaceSeedInput,
  type WorkspaceSeedResult
} from "./services/WorkspaceSeedService";
