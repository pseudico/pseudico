import type { FeatureModuleContract } from "../featureModuleContract";

// Owns calendar projection application contracts.
// Does not own external live calendar sync or task lifecycle internals.
export type CalendarService = {
  readonly module: "calendar";
};

export const calendarModuleContract = {
  module: "calendar",
  purpose: "Project local dated work into month, week, and day calendar views.",
  owns: ["calendar projections", "date query contracts", "local calendar import coordination contracts"],
  doesNotOwn: ["external live calendar sync", "task lifecycle internals", "timeline rendering"],
  integrationPoints: ["tasks", "timeline", "metadata", "today", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
