import type { FeatureModuleContract } from "../featureModuleContract";

// Owns Today/Tomorrow planning application contracts.
// Does not own task persistence internals or calendar rendering.
export type TodayService = {
  readonly module: "today";
};

export const todayModuleContract = {
  module: "today",
  purpose: "Coordinate daily planning, due/overdue projections, ordering, and rollover.",
  owns: ["daily planning operations", "due/overdue projections", "rollover coordination"],
  doesNotOwn: ["task persistence internals", "calendar rendering", "reminder scheduling internals"],
  integrationPoints: ["tasks", "metadata", "saved views", "dashboard", "timeline", "calendar"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
