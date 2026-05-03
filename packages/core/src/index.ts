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
export {
  ITEM_STATUSES,
  ITEM_TYPES,
  isItemStatus,
  isItemType
} from "./entities/Item";
export type { ItemStatus, ItemType } from "./entities/Item";
export {
  TASK_STATUSES,
  isTaskStatus,
  taskStatusToItemStatus
} from "./entities/Task";
export type { TaskDateRange, TaskStatus } from "./entities/Task";
export {
  LIST_DISPLAY_MODES,
  LIST_ITEM_STATUSES,
  LIST_PROGRESS_MODES,
  isListDisplayMode,
  isListItemStatus,
  isListProgressMode
} from "./entities/List";
export type {
  ListDisplayMode,
  ListItemStatus,
  ListProgressMode
} from "./entities/List";
export { NOTE_FORMATS, isNoteFormat } from "./entities/Note";
export type { NoteFormat } from "./entities/Note";
export {
  TAGGING_SOURCES,
  TAGGING_TARGET_TYPES,
  isTaggingSource,
  isTaggingTargetType
} from "./entities/Tag";
export type { TaggingSource, TaggingTargetType } from "./entities/Tag";
export {
  normalizeTagName,
  parseInlineTagSlugs,
  parseInlineTags,
  slugifyTagName
} from "./services/tagParser";
export type { ParsedInlineTag } from "./services/tagParser";
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
