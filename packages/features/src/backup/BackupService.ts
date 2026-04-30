import type { FeatureModuleContract } from "../featureModuleContract";

// Owns backup orchestration application contracts.
// Does not own renderer filesystem access or migration implementation.
export type BackupService = {
  readonly module: "backup";
};

export const backupModuleContract = {
  module: "backup",
  purpose: "Coordinate local backup snapshots, integrity checks, and backup-before-migration flows.",
  owns: ["backup orchestration", "backup integrity reports", "backup-before-migration coordination"],
  doesNotOwn: ["renderer filesystem access", "export formats", "database migrations"],
  integrationPoints: ["workspace", "files", "database services", "Electron main/preload IPC"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
