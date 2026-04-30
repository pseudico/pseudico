import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as schema from "../schema";

export type CreateDatabaseConnectionInput = {
  databasePath: string;
  readonly?: boolean;
  fileMustExist?: boolean;
};

export type DatabaseConnection = {
  databasePath: string;
  sqlite: Database.Database;
  drizzle: BetterSQLite3Database<typeof schema>;
  close: () => void;
};

function normalizeDatabasePath(databasePath: string): string {
  const trimmed = databasePath.trim();

  if (trimmed.length === 0) {
    throw new Error("databasePath must be a non-empty local path.");
  }

  return resolve(trimmed);
}

export async function createDatabaseConnection(
  input: CreateDatabaseConnectionInput
): Promise<DatabaseConnection> {
  const databasePath = normalizeDatabasePath(input.databasePath);

  if (input.fileMustExist !== true) {
    await mkdir(dirname(databasePath), { recursive: true });
  }

  const sqlite = new Database(databasePath, {
    fileMustExist: input.fileMustExist ?? false,
    readonly: input.readonly ?? false
  });

  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");

  return {
    databasePath,
    sqlite,
    drizzle: drizzle(sqlite, { schema }),
    close: () => {
      if (sqlite.open) {
        sqlite.close();
      }
    }
  };
}
