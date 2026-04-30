import type { MigrationDefinition } from "../services/MigrationService";

// Product schema migrations start in LWO-M1-005. This empty list still lets
// the runner create migration bookkeeping and report version 0 on new DBs.
export const migrations: MigrationDefinition[] = [];
