import type { FeatureModuleContract } from "../featureModuleContract";

// Owns category application operations.
// Does not own saved-view storage or team taxonomy behavior.
export type CategoryService = {
  readonly module: "metadata.categories";
};

export const categoriesModuleContract = {
  module: "metadata.categories",
  purpose: "Manage local category operations and assignment contracts.",
  owns: ["category operations", "category assignment contracts", "category search projections"],
  doesNotOwn: ["saved-view storage", "dashboard rendering", "team taxonomy"],
  integrationPoints: ["all content modules", "search", "saved views", "dashboard", "today"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
