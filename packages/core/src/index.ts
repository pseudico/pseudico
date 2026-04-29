export const corePackageName = "@local-work-os/core";

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
