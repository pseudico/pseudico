import {
  createDatabaseConnection,
  type DatabaseConnection
} from "../connection/createDatabaseConnection";
import {
  MigrationService,
  type MigrationDefinition,
  type MigrationRunResult
} from "./MigrationService";
import {
  WorkspaceSeedService,
  type IdFactory,
  type WorkspaceSeedResult
} from "./WorkspaceSeedService";

export type BootstrapWorkspaceDatabaseInput = {
  databasePath: string;
  workspaceId: string;
  workspaceName: string;
};

export type DatabaseBootstrapResult = {
  databasePath: string;
  workspaceId: string;
  schemaVersion: number;
  migrations: MigrationRunResult;
  seed: WorkspaceSeedResult;
};

export class DatabaseBootstrapService {
  private readonly migrations: MigrationDefinition[] | undefined;
  private readonly now: (() => Date) | undefined;
  private readonly idFactory: IdFactory | undefined;

  constructor(input: {
    migrations?: MigrationDefinition[];
    now?: () => Date;
    idFactory?: IdFactory;
  } = {}) {
    this.migrations = input.migrations;
    this.now = input.now;
    this.idFactory = input.idFactory;
  }

  async bootstrapWorkspaceDatabase(
    input: BootstrapWorkspaceDatabaseInput
  ): Promise<DatabaseBootstrapResult> {
    const connection = await createDatabaseConnection({
      databasePath: input.databasePath
    });

    try {
      return this.bootstrapConnection(connection, input);
    } finally {
      connection.close();
    }
  }

  bootstrapConnection(
    connection: DatabaseConnection,
    input: Omit<BootstrapWorkspaceDatabaseInput, "databasePath"> & {
      databasePath?: string;
    }
  ): DatabaseBootstrapResult {
    const migrationService = new MigrationService({
      connection,
      ...(this.migrations === undefined ? {} : { migrations: this.migrations }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
    const migrations = migrationService.runPendingMigrations();
    const seedService = new WorkspaceSeedService({
      connection,
      ...(this.now === undefined ? {} : { now: this.now }),
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory })
    });
    const seed = seedService.ensureWorkspaceSeed({
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      schemaVersion: migrations.currentVersion
    });

    return {
      databasePath: input.databasePath ?? connection.databasePath,
      workspaceId: seed.workspace.record.id,
      schemaVersion: migrations.currentVersion,
      migrations,
      seed
    };
  }
}
