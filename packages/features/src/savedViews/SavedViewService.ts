import type { FeatureModuleContract } from "../featureModuleContract";

// Owns saved view, collection, and smart-list application contracts.
// Does not own search index implementation or dashboard layout.
export type SavedViewService = {
  readonly module: "savedViews";
};

export const savedViewsModuleContract = {
  module: "savedViews",
  purpose: "Manage saved query definitions, collections, smart lists, and diagnostics.",
  owns: ["saved query operations", "collection contracts", "smart-list filter contracts"],
  doesNotOwn: ["search index implementation", "dashboard widget layout", "metadata mutation rules"],
  integrationPoints: ["search", "metadata", "tasks", "projects", "contacts", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
