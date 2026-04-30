import type { FeatureModuleContract } from "../featureModuleContract";

// Owns workspace-facing application operations.
// Does not own raw filesystem or database access; those stay behind IPC,
// repositories, or services.
export type WorkspaceService = {
  readonly module: "workspace";
};

export const workspaceModuleContract = {
  module: "workspace",
  purpose: "Coordinate local workspace identity, metadata, health, and maintenance entry points.",
  owns: ["workspace application boundary", "workspace health summaries", "maintenance entry points"],
  doesNotOwn: ["raw filesystem access", "database schema", "product content records"],
  integrationPoints: ["Electron main/preload IPC", "database services", "backup and export"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
