import type { FeatureModuleContract } from "../featureModuleContract";

// Owns Markdown note application operations.
// Does not own rich text editor internals or attachment storage.
export type NoteService = {
  readonly module: "notes";
};

export const notesModuleContract = {
  module: "notes",
  purpose: "Manage Markdown note operations and note search projections.",
  owns: ["note operations", "Markdown content boundary", "note previews"],
  doesNotOwn: ["rich text editor internals", "file attachments", "raw search index implementation"],
  integrationPoints: ["projects", "contacts", "inbox", "search", "metadata", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
