import type { FeatureModuleContract } from "../featureModuleContract";

// Owns search-facing application service contracts.
// Does not own source-of-truth domain records or remote indexing.
export type SearchService = {
  readonly module: "search";
};

export const searchModuleContract = {
  module: "search",
  purpose: "Coordinate local searchable projections, queries, reindexing, and diagnostics.",
  owns: ["search service boundary", "searchable projection coordination", "reindex entry points"],
  doesNotOwn: ["source domain records", "saved-view persistence", "remote indexing services"],
  integrationPoints: ["database search repository", "all searchable modules", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
