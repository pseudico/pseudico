import type { FeatureModuleContract } from "../featureModuleContract";

// Owns file item and attachment application operations.
// Does not own direct renderer filesystem access.
export type FileAttachmentService = {
  readonly module: "files";
};

export const filesModuleContract = {
  module: "files",
  purpose: "Manage local attachment item behavior and attachment metadata workflows.",
  owns: ["file item operations", "attachment metadata contracts", "missing-file behavior"],
  doesNotOwn: ["direct renderer filesystem access", "arbitrary path access", "backup implementation"],
  integrationPoints: ["Electron main/preload IPC", "workspace", "search", "backup", "export"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
