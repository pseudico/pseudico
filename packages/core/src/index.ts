export const corePackageName = "@local-work-os/core";

export { LocalWorkOsError } from "./errors";
export type { LocalWorkOsErrorCode } from "./errors";
export { ActivityAction } from "./events/ActivityAction";
export type { ActivityAction as ActivityActionValue } from "./events/ActivityAction";
export type {
  ActivityActorType,
  ActivityTargetType,
  DomainEvent
} from "./events/DomainEvent";
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
