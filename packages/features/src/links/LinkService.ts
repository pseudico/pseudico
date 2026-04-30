import type { FeatureModuleContract } from "../featureModuleContract";

// Owns URL/link item application operations.
// Does not own hosted preview services or browser extension implementation.
export type LinkService = {
  readonly module: "links";
};

export const linksModuleContract = {
  module: "links",
  purpose: "Manage URL/link item behavior and local link metadata contracts.",
  owns: ["link item operations", "URL normalization contracts", "local link metadata"],
  doesNotOwn: ["hosted preview services", "browser extension implementation", "notes/files search internals"],
  integrationPoints: ["projects", "contacts", "inbox", "search", "metadata"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
