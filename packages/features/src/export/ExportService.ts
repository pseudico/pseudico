import type { FeatureModuleContract } from "../featureModuleContract";

// Owns export orchestration application contracts.
// Does not own backup lifecycle or direct renderer filesystem writes.
export type ExportService = {
  readonly module: "export";
};

export const exportModuleContract = {
  module: "export",
  purpose: "Coordinate local JSON, Markdown, CSV/TSV, and manifest exports.",
  owns: ["export orchestration", "portable output contracts", "export validation"],
  doesNotOwn: ["backup lifecycle", "import/restore behavior", "direct renderer filesystem writes"],
  integrationPoints: ["workspace", "projects", "contacts", "tasks", "notes", "files", "links", "metadata"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
