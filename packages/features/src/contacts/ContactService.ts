import type { FeatureModuleContract } from "../featureModuleContract";

// Owns contact/client container application operations.
// Does not own hosted CRM behavior or project lifecycle internals.
export type ContactService = {
  readonly module: "contacts";
};

export const contactsModuleContract = {
  module: "contacts",
  purpose: "Manage contact/client containers and local CRM-style context.",
  owns: ["contact application operations", "contact profile context", "interaction projections"],
  doesNotOwn: ["project lifecycle", "raw database repositories", "hosted CRM behavior"],
  integrationPoints: ["projects", "metadata", "search", "dashboard", "saved views", "files", "notes"],
  priority: "V1"
} as const satisfies FeatureModuleContract;
