import type { FeatureModuleContract } from "../featureModuleContract";

// Owns tag application operations.
// Does not own saved-view storage or external taxonomy systems.
export type TagService = {
  readonly module: "metadata.tags";
};

export const tagsModuleContract = {
  module: "metadata.tags",
  purpose: "Manage local tag operations and tagging contracts.",
  owns: ["tag operations", "tagging contracts", "tag search projections"],
  doesNotOwn: ["saved-view storage", "dashboard rendering", "external taxonomy"],
  integrationPoints: ["all content modules", "search", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
