import type { FeatureModuleContract } from "../featureModuleContract";

// Owns project container application operations.
// Does not own raw DB access or item type internals.
export type ProjectService = {
  readonly module: "projects";
};

export const projectsModuleContract = {
  module: "projects",
  purpose: "Manage project container behavior and project-level work context.",
  owns: ["project application operations", "project summaries", "project item feed coordination"],
  doesNotOwn: ["raw database repositories", "contact-specific fields", "item type internals"],
  integrationPoints: ["metadata", "search", "tasks", "lists", "notes", "files", "links", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
