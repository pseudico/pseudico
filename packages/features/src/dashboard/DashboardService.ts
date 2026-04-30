import type { FeatureModuleContract } from "../featureModuleContract";

// Owns dashboard-facing application service contracts.
// Does not own source domain writes or renderer layout implementation.
export type DashboardService = {
  readonly module: "dashboard";
};

export const dashboardModuleContract = {
  module: "dashboard",
  purpose: "Coordinate workspace overview widgets and project health summary projections.",
  owns: ["dashboard service boundary", "workspace overview projections", "saved-view widget coordination"],
  doesNotOwn: ["source domain writes", "saved-view query storage", "renderer layout implementation"],
  integrationPoints: ["projects", "tasks", "search", "saved views", "today", "metadata", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
