import {
  createDatabaseConnection,
  type DatabaseConnection
} from "../connection/createDatabaseConnection";
import { migrations as defaultMigrations } from "../migrations";
import {
  MigrationService,
  type MigrationDefinition
} from "./MigrationService";

export type DatabaseHealthReport = {
  connected: boolean;
  databasePath: string | null;
  schemaVersion: number | null;
  migrationTableAvailable: boolean;
  pendingMigrationCount: number | null;
  error: string | null;
};

export class DatabaseHealthService {
  private readonly connection: DatabaseConnection | null;
  private readonly databasePath: string | null;
  private readonly migrations: MigrationDefinition[];

  constructor(input: {
    connection?: DatabaseConnection | null;
    databasePath?: string | null;
    migrations?: MigrationDefinition[];
  } = {}) {
    this.connection = input.connection ?? null;
    this.databasePath = input.databasePath ?? input.connection?.databasePath ?? null;
    this.migrations = input.migrations ?? defaultMigrations;
  }

  async getHealthReport(): Promise<DatabaseHealthReport> {
    if (this.connection !== null) {
      return this.readHealthFromConnection(this.connection);
    }

    if (this.databasePath === null) {
      return disconnectedReport("No database connection or path is available.");
    }

    let connection: DatabaseConnection | null = null;

    try {
      connection = await createDatabaseConnection({
        databasePath: this.databasePath,
        fileMustExist: true
      });

      return this.readHealthFromConnection(connection);
    } catch (error) {
      return disconnectedReport(
        error instanceof Error ? error.message : "Database health check failed.",
        this.databasePath
      );
    } finally {
      connection?.close();
    }
  }

  private readHealthFromConnection(
    connection: DatabaseConnection
  ): DatabaseHealthReport {
    try {
      const migrationService = new MigrationService({
        connection,
        migrations: this.migrations
      });
      const status = migrationService.getMigrationStatus();

      return {
        connected: connection.sqlite.open,
        databasePath: connection.databasePath,
        schemaVersion: status.currentVersion,
        migrationTableAvailable: true,
        pendingMigrationCount: status.pendingMigrations.length,
        error: null
      };
    } catch (error) {
      return {
        connected: false,
        databasePath: connection.databasePath,
        schemaVersion: null,
        migrationTableAvailable: false,
        pendingMigrationCount: null,
        error:
          error instanceof Error ? error.message : "Database health check failed."
      };
    }
  }
}

function disconnectedReport(
  error: string,
  databasePath: string | null = null
): DatabaseHealthReport {
  return {
    connected: false,
    databasePath,
    schemaVersion: null,
    migrationTableAvailable: false,
    pendingMigrationCount: null,
    error
  };
}
