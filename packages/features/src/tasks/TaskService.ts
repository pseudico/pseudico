import type { FeatureModuleContract } from "../featureModuleContract";

// Owns task-specific application operations.
// Does not own container persistence or calendar rendering.
export type TaskService = {
  readonly module: "tasks";
};

export const tasksModuleContract = {
  module: "tasks",
  purpose: "Manage task lifecycle behavior and task-specific projections.",
  owns: ["task lifecycle operations", "task date/status rules", "task projections"],
  doesNotOwn: ["container persistence", "calendar rendering", "reminder scheduling internals"],
  integrationPoints: ["projects", "contacts", "inbox", "metadata", "search", "today", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
