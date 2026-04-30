import type { FeatureModuleContract } from "../featureModuleContract";

// Owns timeline projection application contracts.
// Does not own task persistence internals or calendar rendering.
export type TimelineService = {
  readonly module: "timeline";
};

export const timelineModuleContract = {
  module: "timeline",
  purpose: "Project dated work and project ranges into timeline-oriented views.",
  owns: ["timeline projections", "date-range grouping contracts", "rescheduling coordination contracts"],
  doesNotOwn: ["task date persistence", "calendar rendering", "reminder scheduling"],
  integrationPoints: ["tasks", "projects", "contacts", "metadata", "saved views", "calendar", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
