import type { FeatureModuleContract } from "../featureModuleContract";

// Owns quick capture and triage operations.
// Does not own type-specific item persistence or search internals.
export type InboxService = {
  readonly module: "inbox";
};

export const inboxModuleContract = {
  module: "inbox",
  purpose: "Capture and triage work before it is filed into a durable context.",
  owns: ["quick capture", "inbox triage", "movement out of Inbox"],
  doesNotOwn: ["project/contact persistence", "item type internals", "search index implementation"],
  integrationPoints: ["tasks", "notes", "files", "links", "metadata", "today", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
