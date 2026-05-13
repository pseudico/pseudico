export const corePackageName = "@local-work-os/core";

export {
  ActionRegistry,
  createActionRegistry,
  normalizeActionQuery,
  resolveAction
} from "./actions/ActionRegistry";
export type {
  ActionDescriptor,
  ActionDisabledState,
  ActionMatchOptions,
  ActionShortcut,
  ResolvedAction
} from "./actions/ActionRegistry";
export {
  CONTEXT_MENU_ACTION_IDS,
  CONTEXT_MENU_TARGET_TYPES,
  createContextMenuActionRegistry,
  defaultContextMenuActions,
  resolveContextMenuActions
} from "./actions/ContextMenuActions";
export {
  DRAG_PAYLOAD_TYPES,
  LOCAL_WORK_OS_DRAG_MIME_TYPE,
  createSequentialSortOrders,
  encodeDragPayload,
  isDragPayload,
  moveIdBeforeTarget,
  parseDragPayload
} from "./actions/DragDrop";
export type {
  ContainerTabDragPayload,
  DragPayloadType,
  ExternalFileDragPayload,
  ItemDragPayload,
  ListItemDragPayload,
  LocalWorkOsDragPayload
} from "./actions/DragDrop";
export type {
  ContextMenuActionContext,
  ContextMenuActionDescriptor,
  ContextMenuActionId,
  ContextMenuTarget,
  ContextMenuTargetType,
  ResolvedContextMenuAction,
  ResolveContextMenuActionsOptions
} from "./actions/ContextMenuActions";
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
export {
  createListEditorState,
  moveListEditorSelection,
  reduceListEditorState,
  resolveListEditorKeyboardCommand
} from "./lists/ListEditorStateMachine";
export type {
  ListEditorItemSnapshot,
  ListEditorKeyboardCommand,
  ListEditorKeyboardEventLike,
  ListEditorKeyboardTarget,
  ListEditorState,
  ListEditorStateEvent
} from "./lists/ListEditorStateMachine";
export {
  RELATIONSHIP_OBJECT_TYPES,
  RELATIONSHIP_TYPES,
  isRelationshipObjectType,
  isRelationshipType
} from "./entities/Relationship";
export type {
  RelationshipObjectType,
  RelationshipType
} from "./entities/Relationship";
export { NOTE_FORMATS, isNoteFormat } from "./entities/Note";
export type { NoteFormat } from "./entities/Note";
export {
  ATTACHMENT_STORAGE_ROOT,
  createAttachmentStorageRelativePath,
  createAttachmentVersionStorageRelativePath
} from "./entities/Attachment";
export type {
  AttachmentRecord,
  AttachmentVersionRecord,
  AttachmentStorageLayout
} from "./entities/Attachment";
export { CONTAINER_MEDIA_ROLES, isContainerMediaRole } from "./entities/ContainerMedia";
export type { ContainerMediaRecord, ContainerMediaRole } from "./entities/ContainerMedia";
export { isSupportedLinkProtocol } from "./entities/Link";
export type { LinkProtocol, LinkRecord } from "./entities/Link";
export {
  CONTACT_FIELD_TYPES,
  CONTACT_STATUSES,
  isContactFieldType,
  isContactStatus
} from "./entities/Contact";
export type { ContactFieldType, ContactStatus } from "./entities/Contact";
export {
  TAGGING_SOURCES,
  TAGGING_TARGET_TYPES,
  isTaggingSource,
  isTaggingTargetType
} from "./entities/Tag";
export type { TaggingSource, TaggingTargetType } from "./entities/Tag";
export {
  INSPECTOR_TARGET_TYPES,
  createInspectorTargetKey,
  inspectorTargetToTaggingTargetType,
  isInspectorTarget,
  isInspectorTargetType
} from "./entities/Inspector";
export type { InspectorTarget, InspectorTargetType } from "./entities/Inspector";
export {
  normalizeWikilinkTitle,
  parseUniqueWikilinkTitles,
  parseWikilinks
} from "./services/wikilinkParser";
export type { ParsedWikilink } from "./services/wikilinkParser";
export {
  normalizeExternalLinkUrl,
  parseExternalLinks
} from "./services/linkParser";
export type { ExternalLinkKind, ExternalLinkToken } from "./services/linkParser";
export {
  ALLOWED_EXTERNAL_URL_PROTOCOLS,
  areSafeLocalFilePaths,
  isAllowedExternalUrlProtocol,
  isSafeLocalFilePath,
  validateExternalOpenUrl
} from "./services/electronSecurity";
export type {
  AllowedExternalUrlProtocol,
  ExternalUrlValidationResult
} from "./services/electronSecurity";
export {
  WORKSPACE_ENCRYPTION_GATE_IDS,
  WORKSPACE_ENCRYPTION_MODES,
  WORKSPACE_KEY_STORAGE_MODES,
  createWorkspaceEncryptionPrototypePlan,
  isWorkspaceEncryptionMode,
  isWorkspaceKeyStorageMode
} from "./services/workspaceEncryption";
export type {
  WorkspaceEncryptionGate,
  WorkspaceEncryptionGateId,
  WorkspaceEncryptionMode,
  WorkspaceEncryptionPrototypeInput,
  WorkspaceEncryptionPrototypePlan,
  WorkspaceKeyStorageMode
} from "./services/workspaceEncryption";
export {
  normalizeTagName,
  parseInlineTagSlugs,
  parseInlineTags,
  slugifyTagName
} from "./services/tagParser";
export type { ParsedInlineTag } from "./services/tagParser";
export {
  formatDateRangeInputValue,
  formatDateRangeLabel,
  getLocalTimeZone,
  parseDateRangeInput
} from "./services/dateRangeParser";
export type { DateRangeParserOptions, ParsedDateRange } from "./services/dateRangeParser";
export {
  isDateExpressionCandidate,
  parseDateExpression,
  resolveDateExpression
} from "./services/dateExpressionParser";
export type {
  DateExpressionBoundary,
  DateExpressionOffsetUnit,
  DateExpressionOperation,
  DateExpressionResolverOptions,
  ParsedDateExpression,
  ResolvedDateExpression
} from "./services/dateExpressionParser";
export {
  createTimelineDateScale,
  createTimelineZoomRange,
  mapTimelineRangeToScale
} from "./services/timelineDateScale";
export type {
  TimelineDateScale,
  TimelineRangePlacement,
  TimelineScaleRange,
  TimelineScaleTick,
  TimelineZoomLevel
} from "./services/timelineDateScale";
export {
  NaturalDateParser,
  createNaturalDateParser,
  parseQuickTaskNaturalDate
} from "./services/naturalDateParser";
export type {
  NaturalDateParserOptions,
  NaturalDateParseResult,
  NaturalDateToken,
  NaturalDateTokenKind
} from "./services/naturalDateParser";
export { createLocalId } from "./ids";
export {
  createIsoTimestamp,
  createLocalDayRange,
  createLocalDayWindowRange,
  createRelativeLocalDayRange,
  formatLocalDate
} from "./time";
export type { Clock, LocalDateInput, LocalDayRange } from "./time";

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

export {
  ShortcutRegistry,
  createShortcutRegistry,
  formatShortcutBinding,
  getShortcutEventTargetKind,
  matchesShortcutBinding,
  normalizeShortcutKey
} from "./shortcuts/ShortcutRegistry";
export type {
  RegisteredShortcut,
  ShortcutBinding,
  ShortcutCategory,
  ShortcutDescriptor,
  ShortcutEventTargetKind,
  ShortcutKeyboardEventLike,
  ShortcutMatchContext,
  ShortcutModifier,
  ShortcutScope
} from "./shortcuts/ShortcutRegistry";
export { APP_SHORTCUT_IDS, defaultShortcutDescriptors } from "./shortcuts/defaultShortcuts";
export type { AppShortcutId } from "./shortcuts/defaultShortcuts";
