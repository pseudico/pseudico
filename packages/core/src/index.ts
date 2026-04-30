export const corePackageName = "@local-work-os/core";

export { LocalWorkOsError } from "./errors";
export type { LocalWorkOsErrorCode } from "./errors";
export { createLocalId } from "./ids";
export { createIsoTimestamp } from "./time";

export type LocalOnlyBoundary = {
  cloudSync: false;
  hostedAccounts: false;
  telemetry: false;
};

export const localOnlyBoundary: LocalOnlyBoundary = {
  cloudSync: false,
  hostedAccounts: false,
  telemetry: false
};
