import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type * as schema from "../schema";

export type TransactionHandle = {
  connection: DatabaseConnection;
  sqlite: DatabaseConnection["sqlite"];
  drizzle: BetterSQLite3Database<typeof schema>;
};

export class TransactionService {
  private readonly connection: DatabaseConnection;

  constructor(input: { connection: DatabaseConnection }) {
    this.connection = input.connection;
  }

  async runInTransaction<T>(
    fn: (tx: TransactionHandle) => T | Promise<T>
  ): Promise<T> {
    if (this.connection.sqlite.inTransaction) {
      return await fn(this.createHandle());
    }

    this.connection.sqlite.exec("begin immediate");

    try {
      const result = await fn(this.createHandle());
      this.connection.sqlite.exec("commit");
      return result;
    } catch (error) {
      this.connection.sqlite.exec("rollback");
      throw error;
    }
  }

  private createHandle(): TransactionHandle {
    return {
      connection: this.connection,
      sqlite: this.connection.sqlite,
      drizzle: this.connection.drizzle
    };
  }
}
