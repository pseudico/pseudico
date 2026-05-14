import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import { migrations as defaultMigrations } from "../migrations";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MIGRATIONS_TABLE = "local_work_os_migrations";

export type MigrationDefinition = {
  version: number;
  name: string;
  sql: string | string[];
  checksum?: string;
};

export type AppliedMigration = {
  version: number;
  name: string;
  appliedAt: string;
  checksum: string | null;
};

export type MigrationStatus = {
  currentVersion: number;
  latestVersion: number;
  appliedMigrations: AppliedMigration[];
  pendingMigrations: MigrationDefinition[];
};

export type MigrationBackupInput = {
  backupsDirectoryPath: string;
  label?: string;
};

export type MigrationBackupResult = {
  path: string;
  createdAt: string;
  fromVersion: number;
  toVersion: number;
};

export type RunPendingMigrationsInput = {
  backupBeforeMigration?: MigrationBackupInput;
};

export type MigrationRunResult = {
  appliedMigrations: AppliedMigration[];
  currentVersion: number;
  backup?: MigrationBackupResult;
};

export class MigrationService {
  private readonly connection: DatabaseConnection;
  private readonly migrations: MigrationDefinition[];
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    migrations?: MigrationDefinition[];
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.migrations = validateMigrations(input.migrations ?? defaultMigrations);
    this.now = input.now ?? (() => new Date());
  }

  getCurrentSchemaVersion(): number {
    this.ensureMigrationsTable();

    const row = this.connection.sqlite
      .prepare<[], { version: number | null }>(
        `select max(version) as version from ${MIGRATIONS_TABLE}`
      )
      .get();

    return row?.version ?? 0;
  }

  getMigrationStatus(): MigrationStatus {
    this.ensureMigrationsTable();

    const appliedMigrations = this.getAppliedMigrations();
    this.assertNoFutureMigrations(appliedMigrations);
    const appliedVersions = new Set(
      appliedMigrations.map((migration) => migration.version)
    );
    const pendingMigrations = this.migrations.filter(
      (migration) => !appliedVersions.has(migration.version)
    );

    return {
      currentVersion: appliedMigrations.at(-1)?.version ?? 0,
      latestVersion: this.migrations.at(-1)?.version ?? 0,
      appliedMigrations,
      pendingMigrations
    };
  }

  runPendingMigrations(
    input: RunPendingMigrationsInput = {}
  ): MigrationRunResult {
    this.ensureMigrationsTable();

    const status = this.getMigrationStatus();
    const appliedMigrations: AppliedMigration[] = [];
    let backup: MigrationBackupResult | undefined;

    if (status.pendingMigrations.length === 0) {
      return {
        appliedMigrations,
        currentVersion: status.currentVersion
      };
    }

    if (
      input.backupBeforeMigration !== undefined &&
      status.currentVersion > 0
    ) {
      backup = this.createPreMigrationBackup(
        input.backupBeforeMigration,
        status.currentVersion,
        status.latestVersion
      );
    }

    const applyPending = this.connection.sqlite.transaction(() => {
      for (const migration of status.pendingMigrations) {
        for (const statement of toSqlStatements(migration.sql)) {
          this.connection.sqlite.exec(statement);
        }

        const appliedAt = this.now().toISOString();
        const checksum = migration.checksum ?? null;
        this.connection.sqlite
          .prepare(
            `insert into ${MIGRATIONS_TABLE} (version, name, applied_at, checksum)
             values (?, ?, ?, ?)`
          )
          .run(migration.version, migration.name, appliedAt, checksum);

        appliedMigrations.push({
          version: migration.version,
          name: migration.name,
          appliedAt,
          checksum
        });
      }
    });

    applyPending();

    return {
      appliedMigrations,
      currentVersion:
        appliedMigrations.at(-1)?.version ?? status.currentVersion,
      ...(backup === undefined ? {} : { backup })
    };
  }

  getAppliedMigrations(): AppliedMigration[] {
    this.ensureMigrationsTable();

    return this.connection.sqlite
      .prepare<
        [],
        {
          version: number;
          name: string;
          applied_at: string;
          checksum: string | null;
        }
      >(
        `select version, name, applied_at, checksum
         from ${MIGRATIONS_TABLE}
         order by version asc`
      )
      .all()
      .map((row) => ({
        version: row.version,
        name: row.name,
        appliedAt: row.applied_at,
        checksum: row.checksum
      }));
  }

  private ensureMigrationsTable(): void {
    this.connection.sqlite.exec(`
      create table if not exists ${MIGRATIONS_TABLE} (
        version integer primary key,
        name text not null,
        applied_at text not null,
        checksum text
      );
    `);
  }

  private assertNoFutureMigrations(appliedMigrations: AppliedMigration[]): void {
    const latestVersion = this.migrations.at(-1)?.version ?? 0;
    const futureMigration = appliedMigrations.find(
      (migration) => migration.version > latestVersion
    );

    if (futureMigration === undefined) {
      return;
    }

    throw new Error(
      `Workspace schema version ${futureMigration.version} is newer than this app supports (latest ${latestVersion}); refusing to migrate.`
    );
  }

  private createPreMigrationBackup(
    input: MigrationBackupInput,
    fromVersion: number,
    toVersion: number
  ): MigrationBackupResult {
    const backupsDirectoryPath = resolve(input.backupsDirectoryPath);
    const createdAt = this.now().toISOString();
    const safeTimestamp = createdAt.replace(/[:.]/g, "-");
    const safeLabel = sanitizeBackupLabel(input.label ?? "migration");
    const backupPath = resolve(
      backupsDirectoryPath,
      uniqueBackupFileName(
        backupsDirectoryPath,
        `local-work-os-${safeLabel}-v${fromVersion}-to-v${toVersion}-${safeTimestamp}.sqlite`
      )
    );

    mkdirSync(backupsDirectoryPath, { recursive: true });
    this.connection.sqlite.pragma("wal_checkpoint(FULL)");
    this.connection.sqlite.exec(`vacuum main into ${quoteSqlString(backupPath)}`);

    return {
      path: backupPath,
      createdAt,
      fromVersion,
      toVersion
    };
  }
}

function validateMigrations(
  migrations: MigrationDefinition[]
): MigrationDefinition[] {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  const seen = new Set<number>();

  for (const migration of sorted) {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error("Migration versions must be positive integers.");
    }

    if (migration.name.trim().length === 0) {
      throw new Error("Migration names must be non-empty.");
    }

    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}.`);
    }

    seen.add(migration.version);
  }

  return sorted;
}

function toSqlStatements(sql: string | string[]): string[] {
  return Array.isArray(sql) ? sql : [sql];
}

function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sanitizeBackupLabel(label: string): string {
  const sanitized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length === 0 ? "migration" : sanitized;
}

function uniqueBackupFileName(directoryPath: string, baseName: string): string {
  if (!existsSync(join(directoryPath, baseName))) {
    return baseName;
  }

  const extension = ".sqlite";
  const stem = baseName.endsWith(extension)
    ? baseName.slice(0, -extension.length)
    : baseName;
  let suffix = 2;

  while (existsSync(join(directoryPath, `${stem}-${suffix}${extension}`))) {
    suffix += 1;
  }

  return `${stem}-${suffix}${extension}`;
}
