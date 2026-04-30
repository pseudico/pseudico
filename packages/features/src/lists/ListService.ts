import type { FeatureModuleContract } from "../featureModuleContract";

// Owns checklist and structured-list application operations.
// Does not own project lifecycle or list UI rendering.
export type ListService = {
  readonly module: "lists";
};

export const listsModuleContract = {
  module: "lists",
  purpose: "Manage checklist and structured-list application behavior.",
  owns: ["list operations", "list row ordering", "list progress rules"],
  doesNotOwn: ["project lifecycle", "general task lifecycle", "pipeline UI rendering"],
  integrationPoints: ["projects", "contacts", "tasks", "metadata", "search"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
