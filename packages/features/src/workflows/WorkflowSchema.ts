export const WORKFLOW_DEFINITION_SCHEMA_VERSION = 1;
export const WORKFLOW_DEFINITION_KIND = "local-work-os.workflow";

export type WorkflowItemCreatedTriggerFilters = {
  itemTypes?: string[];
  textIncludes?: string;
  tagSlugs?: string[];
  categoryIds?: string[];
  containerIds?: string[];
};

export type WorkflowFileImportedTriggerFilters = {
  extensions?: string[];
  mimeTypes?: string[];
  nameIncludes?: string;
  minSizeBytes?: number;
  maxSizeBytes?: number;
  containerIds?: string[];
};

export type WorkflowMetadataTriggerFilters = {
  targetTypes?: string[];
  targetIds?: string[];
  tagIds?: string[];
  tagSlugs?: string[];
  categoryIds?: string[];
};

export type WorkflowTrigger =
  | {
      type: "manual";
    }
  | {
      type: "item_created";
      filters?: WorkflowItemCreatedTriggerFilters;
    }
  | {
      type: "file_imported";
      filters?: WorkflowFileImportedTriggerFilters;
    }
  | {
      type: "tag_added" | "tag_removed" | "category_assigned";
      filters?: WorkflowMetadataTriggerFilters;
    };

export type WorkflowActionConditionOperator =
  | "exists"
  | "not_exists"
  | "eq"
  | "not_eq"
  | "contains";

export type WorkflowActionCondition = {
  left: string;
  op: WorkflowActionConditionOperator;
  right?: string;
};

type WorkflowActionBase = {
  condition?: WorkflowActionCondition;
};

export type WorkflowAction = WorkflowActionBase &
  (
  | {
      type: "add_tag";
      targetType: "item";
      targetId: string;
      tagName: string;
    }
  | {
      type: "set_category";
      targetType: "item" | "container";
      targetId: string;
      categoryId: string | null;
    }
  | {
      type: "move_item";
      itemId: string;
      targetContainerId: string;
      targetContainerTabId?: string | null;
    }
  | {
      type: "create_task";
      containerId: string;
      title: string;
      body?: string | null;
      categoryId?: string | null;
      containerTabId?: string | null;
      dueAt?: string | null;
      startAt?: string | null;
      priority?: number | null;
    }
  | {
      type: "update_task";
      itemId: string;
      title?: string;
      body?: string | null;
      categoryId?: string | null;
      containerTabId?: string | null;
      dueAt?: string | null;
      startAt?: string | null;
      priority?: number | null;
      status?: "open" | "done" | "waiting" | "someday" | "deferred" | "cancelled";
    }
  | {
      type: "create_list";
      containerId: string;
      title: string;
      body?: string | null;
      categoryId?: string | null;
      containerTabId?: string | null;
      displayMode?: "checklist" | "pipeline";
      showCompleted?: boolean;
      progressMode?: "count" | "manual" | "none";
    }
  | {
      type: "update_list";
      listId: string;
      title?: string;
      body?: string | null;
      categoryId?: string | null;
      containerTabId?: string | null;
      displayMode?: "checklist" | "pipeline";
      showCompleted?: boolean;
      progressMode?: "count" | "manual" | "none";
    }
  | {
      type: "add_list_item";
      listId: string;
      title: string;
      body?: string | null;
      status?: "open" | "done" | "waiting" | "cancelled";
      depth?: number;
      sortOrder?: number;
      listItemParentId?: string | null;
      startAt?: string | null;
      dueAt?: string | null;
    }
  | {
      type: "update_list_item";
      listItemId: string;
      title?: string;
      body?: string | null;
      status?: "open" | "done" | "waiting" | "cancelled";
      depth?: number;
      sortOrder?: number;
      listItemParentId?: string | null;
      startAt?: string | null;
      dueAt?: string | null;
    }
  | {
      type: "create_note";
      containerId: string;
      title: string;
      content: string;
      categoryId?: string | null;
      containerTabId?: string | null;
      format?: "markdown";
    }
  | {
      type: "update_note";
      noteId: string;
      title?: string;
      content?: string;
      categoryId?: string | null;
      containerTabId?: string | null;
    }
  | {
      type: "create_container_from_template";
      templateId: string;
      name?: string | null;
      baseDate?: string | null;
    }
  );

export type WorkflowDefinitionSchemaV1 = {
  kind: typeof WORKFLOW_DEFINITION_KIND;
  version: typeof WORKFLOW_DEFINITION_SCHEMA_VERSION;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
};

export type WorkflowDefinitionSchema = WorkflowDefinitionSchemaV1;

export type WorkflowActionType = WorkflowAction["type"];

export type WorkflowTriggerType = WorkflowTrigger["type"];

export type WorkflowActionRegistryEntry = {
  type: WorkflowActionType;
  label: string;
  description: string;
  localOnly: true;
  previewable: true;
  targetTypes: readonly string[];
};

export type WorkflowTriggerRegistryEntry = {
  type: WorkflowTriggerType;
  label: string;
  description: string;
  localOnly: true;
};

export type WorkflowValidationSeverity = "error" | "warning";

export type WorkflowValidationIssue = {
  severity: WorkflowValidationSeverity;
  path: string;
  message: string;
};

export type WorkflowValidationResult = {
  valid: boolean;
  canEnable: boolean;
  schemaVersion: number | null;
  issues: WorkflowValidationIssue[];
};

export type WorkflowEditorSkeletonState = {
  title: string;
  schemaVersionLabel: string;
  canEnable: boolean;
  statusLabel: string;
  issues: WorkflowValidationIssue[];
  actionSummaries: string[];
};

export const WORKFLOW_TRIGGER_REGISTRY: readonly WorkflowTriggerRegistryEntry[] = [
  {
    type: "manual",
    label: "Manual run",
    description: "Run only when the user explicitly starts the workflow in this workspace.",
    localOnly: true
  },
  {
    type: "item_created",
    label: "Item created",
    description: "Run locally after a new item matches configured item filters.",
    localOnly: true
  },
  {
    type: "file_imported",
    label: "File imported",
    description: "Run locally after an imported file matches file metadata filters.",
    localOnly: true
  },
  {
    type: "tag_added",
    label: "Tag added",
    description: "Run locally after a tag is added to a matching local target.",
    localOnly: true
  },
  {
    type: "tag_removed",
    label: "Tag removed",
    description: "Run locally after a tag is removed from a matching local target.",
    localOnly: true
  },
  {
    type: "category_assigned",
    label: "Category assigned",
    description: "Run locally after a category is assigned to a matching local target.",
    localOnly: true
  }
] as const;

export const WORKFLOW_ACTION_REGISTRY: readonly WorkflowActionRegistryEntry[] = [
  {
    type: "add_tag",
    label: "Add tag",
    description: "Apply a local tag to an item through the metadata service.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item"]
  },
  {
    type: "set_category",
    label: "Set category",
    description: "Set or clear a local category on an item or container.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item", "container"]
  },
  {
    type: "move_item",
    label: "Move item",
    description: "Move an item to another local container or tab.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item"]
  },
  {
    type: "create_task",
    label: "Create task",
    description: "Create a local task in a selected container.",
    localOnly: true,
    previewable: true,
    targetTypes: ["container"]
  },
  {
    type: "update_task",
    label: "Update task",
    description: "Update local task fields through the task service.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item"]
  },
  {
    type: "create_list",
    label: "Create list",
    description: "Create a local checklist in a selected container.",
    localOnly: true,
    previewable: true,
    targetTypes: ["container"]
  },
  {
    type: "update_list",
    label: "Update list",
    description: "Update local checklist metadata and display settings.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item"]
  },
  {
    type: "add_list_item",
    label: "Add list item",
    description: "Add a local row to a checklist.",
    localOnly: true,
    previewable: true,
    targetTypes: ["list"]
  },
  {
    type: "update_list_item",
    label: "Update list item",
    description: "Update a local checklist row.",
    localOnly: true,
    previewable: true,
    targetTypes: ["list_item"]
  },
  {
    type: "create_note",
    label: "Create note",
    description: "Create a local Markdown note in a selected container.",
    localOnly: true,
    previewable: true,
    targetTypes: ["container"]
  },
  {
    type: "update_note",
    label: "Update note",
    description: "Update a local Markdown note through the note service.",
    localOnly: true,
    previewable: true,
    targetTypes: ["item"]
  },
  {
    type: "create_container_from_template",
    label: "Create container from template",
    description: "Create a local project or contact from a saved container template.",
    localOnly: true,
    previewable: true,
    targetTypes: ["template"]
  }
] as const;

const actionTypes = new Set<string>(WORKFLOW_ACTION_REGISTRY.map((entry) => entry.type));
const triggerTypes = new Set<string>(WORKFLOW_TRIGGER_REGISTRY.map((entry) => entry.type));

export function createWorkflowDefinitionSchema(
  actions: readonly WorkflowAction[],
  trigger: WorkflowTrigger = { type: "manual" }
): WorkflowDefinitionSchemaV1 {
  return {
    kind: WORKFLOW_DEFINITION_KIND,
    version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
    trigger,
    actions: [...actions]
  };
}

export function parseWorkflowDefinitionSchema(value: string): WorkflowDefinitionSchema {
  const parsed = JSON.parse(value) as unknown;

  if (Array.isArray(parsed)) {
    return createWorkflowDefinitionSchema(parseWorkflowActionsFromUnknown(parsed));
  }

  const validation = validateWorkflowDefinitionSchema(parsed);
  if (!validation.valid) {
    throw new Error(
      `Workflow definition is invalid: ${validation.issues.map((issue) => issue.message).join(" ")}`
    );
  }

  return parsed as WorkflowDefinitionSchema;
}

export function stringifyWorkflowDefinitionSchema(
  definition: WorkflowDefinitionSchema
): string {
  const validation = validateWorkflowDefinitionSchema(definition);
  if (!validation.valid) {
    throw new Error(
      `Workflow definition is invalid: ${validation.issues.map((issue) => issue.message).join(" ")}`
    );
  }

  return JSON.stringify(definition);
}

export function parseWorkflowActions(actionsJson: string): WorkflowAction[] {
  return parseWorkflowDefinitionSchema(actionsJson).actions;
}

export function stringifyWorkflowActions(actions: readonly WorkflowAction[]): string {
  return stringifyWorkflowDefinitionSchema(createWorkflowDefinitionSchema(actions));
}

export function validateWorkflowDefinitionSchema(value: unknown): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  let schemaVersion: number | null = null;

  if (!isRecord(value)) {
    return buildValidationResult(null, [error("$", "Workflow definition must be an object.")]);
  }

  if (value.kind !== WORKFLOW_DEFINITION_KIND) {
    issues.push(error("kind", `Workflow definition kind must be ${WORKFLOW_DEFINITION_KIND}.`));
  }

  if (typeof value.version !== "number") {
    issues.push(error("version", "Workflow definition version is required."));
  } else {
    schemaVersion = value.version;
    if (value.version !== WORKFLOW_DEFINITION_SCHEMA_VERSION) {
      issues.push(
        error(
          "version",
          `Unsupported workflow schema version ${value.version}; expected ${WORKFLOW_DEFINITION_SCHEMA_VERSION}.`
        )
      );
    }
  }

  if (!isRecord(value.trigger) || typeof value.trigger.type !== "string") {
    issues.push(error("trigger.type", "Workflow trigger type is required."));
  } else if (!triggerTypes.has(value.trigger.type)) {
    issues.push(error("trigger.type", `Unsupported or non-local workflow trigger: ${value.trigger.type}.`));
  } else if (value.trigger.type === "item_created") {
    issues.push(...validateItemCreatedTrigger(value.trigger, "trigger"));
  } else if (value.trigger.type === "file_imported") {
    issues.push(...validateFileImportedTrigger(value.trigger, "trigger"));
  } else if (
    value.trigger.type === "tag_added" ||
    value.trigger.type === "tag_removed" ||
    value.trigger.type === "category_assigned"
  ) {
    issues.push(...validateMetadataTrigger(value.trigger, "trigger"));
  }

  if (!Array.isArray(value.actions) || value.actions.length === 0) {
    issues.push(error("actions", "Workflow actions must be a non-empty array."));
  } else {
    value.actions.forEach((action, index) => {
      issues.push(...validateWorkflowAction(action, `actions[${index}]`));
    });
  }

  return buildValidationResult(schemaVersion, issues);
}

export function validateWorkflowActions(actions: readonly WorkflowAction[]): WorkflowValidationResult {
  return validateWorkflowDefinitionSchema(createWorkflowDefinitionSchema(actions));
}

export function getWorkflowActionRegistryEntry(
  type: string
): WorkflowActionRegistryEntry | null {
  return WORKFLOW_ACTION_REGISTRY.find((entry) => entry.type === type) ?? null;
}

export function getWorkflowTriggerRegistryEntry(
  type: string
): WorkflowTriggerRegistryEntry | null {
  return WORKFLOW_TRIGGER_REGISTRY.find((entry) => entry.type === type) ?? null;
}

export function createWorkflowEditorSkeletonState(input: {
  name?: string;
  definition: unknown;
}): WorkflowEditorSkeletonState {
  const validation = validateWorkflowDefinitionSchema(input.definition);
  const actions = validation.valid && isRecord(input.definition) && Array.isArray(input.definition.actions)
    ? (input.definition.actions as WorkflowAction[])
    : [];

  return {
    title: input.name?.trim() || "Untitled workflow",
    schemaVersionLabel:
      validation.schemaVersion === null
        ? "No schema version"
        : `Workflow schema v${validation.schemaVersion}`,
    canEnable: validation.canEnable,
    statusLabel: validation.canEnable
      ? "Ready to enable"
      : "Cannot enable until validation issues are fixed",
    issues: validation.issues,
    actionSummaries: actions.map(summarizeWorkflowAction)
  };
}

export function summarizeWorkflowAction(action: WorkflowAction): string {
  switch (action.type) {
    case "add_tag":
      return `Add tag "${action.tagName}" to item ${action.targetId}.`;
    case "set_category":
      return action.categoryId === null
        ? `Clear category from ${action.targetType} ${action.targetId}.`
        : `Set category ${action.categoryId} on ${action.targetType} ${action.targetId}.`;
    case "move_item":
      return `Move item ${action.itemId} to container ${action.targetContainerId}.`;
    case "create_task":
      return [
        `Create task "${action.title}" in container ${action.containerId}`,
        action.startAt === undefined || action.startAt === null ? null : `start ${action.startAt}`,
        action.dueAt === undefined || action.dueAt === null ? null : `due ${action.dueAt}`
      ].filter(Boolean).join("; ") + ".";
    case "update_task":
      return `Update task ${action.itemId}.`;
    case "create_list":
      return `Create list "${action.title}" in container ${action.containerId}.`;
    case "update_list":
      return `Update list ${action.listId}.`;
    case "add_list_item":
      return `Add list item "${action.title}" to list ${action.listId}.`;
    case "update_list_item":
      return `Update list item ${action.listItemId}.`;
    case "create_note":
      return `Create note "${action.title}" in container ${action.containerId}.`;
    case "update_note":
      return `Update note ${action.noteId}.`;
    case "create_container_from_template":
      return [
        `Create project/contact from template ${action.templateId}`,
        action.name === undefined || action.name === null ? null : `name ${action.name}`,
        action.baseDate === undefined || action.baseDate === null ? null : `base date ${action.baseDate}`
      ].filter(Boolean).join("; ") + ".";
  }
}

function parseWorkflowActionsFromUnknown(value: unknown): WorkflowAction[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Workflow actions must be a non-empty array.");
  }

  const issues = value.flatMap((action, index) => validateWorkflowAction(action, `actions[${index}]`));
  if (issues.some((issue) => issue.severity === "error")) {
    throw new Error("Workflow actions contain unsupported or invalid actions.");
  }

  return value as WorkflowAction[];
}

function validateWorkflowAction(value: unknown, path: string): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  if (!isRecord(value) || typeof value.type !== "string") {
    return [error(path, "Workflow action type is required.")];
  }

  if (!actionTypes.has(value.type)) {
    return [error(`${path}.type`, `Unsupported or non-local workflow action: ${value.type}.`)];
  }

  if (value.condition !== undefined) {
    issues.push(...validateWorkflowActionCondition(value.condition, `${path}.condition`));
  }

  switch (value.type) {
    case "add_tag":
      requireEqual(value.targetType, "item", `${path}.targetType`, issues);
      requireNonEmptyString(value.targetId, `${path}.targetId`, issues);
      requireNonEmptyString(value.tagName, `${path}.tagName`, issues);
      break;
    case "set_category":
      requireOneOf(value.targetType, ["item", "container"], `${path}.targetType`, issues);
      requireNonEmptyString(value.targetId, `${path}.targetId`, issues);
      requireNullableString(value.categoryId, `${path}.categoryId`, issues);
      break;
    case "move_item":
      requireNonEmptyString(value.itemId, `${path}.itemId`, issues);
      requireNonEmptyString(value.targetContainerId, `${path}.targetContainerId`, issues);
      if (value.targetContainerTabId !== undefined && value.targetContainerTabId !== null) {
        requireNonEmptyString(value.targetContainerTabId, `${path}.targetContainerTabId`, issues);
      }
      break;
    case "create_task":
      requireNonEmptyString(value.containerId, `${path}.containerId`, issues);
      requireNonEmptyString(value.title, `${path}.title`, issues);
      if (value.body !== undefined && value.body !== null && typeof value.body !== "string") {
        issues.push(error(`${path}.body`, "Task body must be a string when provided."));
      }
      if (value.categoryId !== undefined) requireNullableString(value.categoryId, `${path}.categoryId`, issues);
      if (value.containerTabId !== undefined) requireNullableString(value.containerTabId, `${path}.containerTabId`, issues);
      if (value.dueAt !== undefined) requireNullableString(value.dueAt, `${path}.dueAt`, issues);
      if (value.startAt !== undefined) requireNullableString(value.startAt, `${path}.startAt`, issues);
      if (value.priority !== undefined && value.priority !== null && typeof value.priority !== "number") {
        issues.push(error(`${path}.priority`, "Task priority must be a number when provided."));
      }
      break;
    case "update_task":
      requireNonEmptyString(value.itemId, `${path}.itemId`, issues);
      validateOptionalItemFields(value, path, issues, "Task");
      if (value.dueAt !== undefined) requireNullableString(value.dueAt, `${path}.dueAt`, issues);
      if (value.startAt !== undefined) requireNullableString(value.startAt, `${path}.startAt`, issues);
      if (value.priority !== undefined && value.priority !== null && typeof value.priority !== "number") {
        issues.push(error(`${path}.priority`, "Task priority must be a number when provided."));
      }
      if (value.status !== undefined) {
        requireOneOf(
          value.status,
          ["open", "done", "waiting", "someday", "deferred", "cancelled"],
          `${path}.status`,
          issues
        );
      }
      requireAtLeastOne(value, path, issues, [
        "title",
        "body",
        "categoryId",
        "containerTabId",
        "dueAt",
        "startAt",
        "priority",
        "status"
      ]);
      break;
    case "create_list":
      requireNonEmptyString(value.containerId, `${path}.containerId`, issues);
      requireNonEmptyString(value.title, `${path}.title`, issues);
      validateOptionalListFields(value, path, issues, "List");
      break;
    case "update_list":
      requireNonEmptyString(value.listId, `${path}.listId`, issues);
      validateOptionalListFields(value, path, issues, "List");
      requireAtLeastOne(value, path, issues, [
        "title",
        "body",
        "categoryId",
        "containerTabId",
        "displayMode",
        "showCompleted",
        "progressMode"
      ]);
      break;
    case "add_list_item":
      requireNonEmptyString(value.listId, `${path}.listId`, issues);
      requireNonEmptyString(value.title, `${path}.title`, issues);
      validateOptionalListItemFields(value, path, issues, "List item");
      break;
    case "update_list_item":
      requireNonEmptyString(value.listItemId, `${path}.listItemId`, issues);
      validateOptionalListItemFields(value, path, issues, "List item");
      requireAtLeastOne(value, path, issues, [
        "title",
        "body",
        "status",
        "depth",
        "sortOrder",
        "listItemParentId",
        "startAt",
        "dueAt"
      ]);
      break;
    case "create_note":
      requireNonEmptyString(value.containerId, `${path}.containerId`, issues);
      requireNonEmptyString(value.title, `${path}.title`, issues);
      requireNonEmptyString(value.content, `${path}.content`, issues);
      validateOptionalNoteFields(value, path, issues, "Note");
      break;
    case "update_note":
      requireNonEmptyString(value.noteId, `${path}.noteId`, issues);
      validateOptionalNoteFields(value, path, issues, "Note");
      requireAtLeastOne(value, path, issues, [
        "title",
        "content",
        "categoryId",
        "containerTabId"
      ]);
      break;
    case "create_container_from_template":
      requireNonEmptyString(value.templateId, `${path}.templateId`, issues);
      if (value.name !== undefined) requireNullableString(value.name, `${path}.name`, issues);
      if (value.baseDate !== undefined) requireNullableString(value.baseDate, `${path}.baseDate`, issues);
      break;
  }

  return issues;
}

function validateWorkflowActionCondition(
  value: unknown,
  path: string
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  if (!isRecord(value)) {
    return [error(path, "Workflow action condition must be an object.")];
  }

  requireNonEmptyString(value.left, `${path}.left`, issues);
  requireOneOf(
    value.op,
    ["exists", "not_exists", "eq", "not_eq", "contains"],
    `${path}.op`,
    issues
  );

  if (
    value.op !== "exists" &&
    value.op !== "not_exists" &&
    !isNonEmptyString(value.right)
  ) {
    issues.push(error(`${path}.right`, "Condition right side must be a non-empty string for this operator."));
  }

  if (
    (value.op === "exists" || value.op === "not_exists") &&
    value.right !== undefined &&
    typeof value.right !== "string"
  ) {
    issues.push(error(`${path}.right`, "Condition right side must be a string when provided."));
  }

  return issues;
}

function validateItemCreatedTrigger(
  value: Record<string, unknown>,
  path: string
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  if (value.filters === undefined) {
    return issues;
  }

  if (!isRecord(value.filters)) {
    return [error(`${path}.filters`, "Item-created trigger filters must be an object.")];
  }

  requireOptionalStringArray(value.filters.itemTypes, `${path}.filters.itemTypes`, issues);
  requireOptionalStringArray(value.filters.tagSlugs, `${path}.filters.tagSlugs`, issues);
  requireOptionalStringArray(value.filters.categoryIds, `${path}.filters.categoryIds`, issues);
  requireOptionalStringArray(value.filters.containerIds, `${path}.filters.containerIds`, issues);

  if (
    value.filters.textIncludes !== undefined &&
    !isNonEmptyString(value.filters.textIncludes)
  ) {
    issues.push(error(`${path}.filters.textIncludes`, "Must be a non-empty string when provided."));
  }

  return issues;
}

function validateFileImportedTrigger(
  value: Record<string, unknown>,
  path: string
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  if (value.filters === undefined) {
    return issues;
  }

  if (!isRecord(value.filters)) {
    return [error(`${path}.filters`, "File-imported trigger filters must be an object.")];
  }

  requireOptionalStringArray(value.filters.extensions, `${path}.filters.extensions`, issues);
  requireOptionalStringArray(value.filters.mimeTypes, `${path}.filters.mimeTypes`, issues);
  requireOptionalStringArray(value.filters.containerIds, `${path}.filters.containerIds`, issues);

  if (
    value.filters.nameIncludes !== undefined &&
    !isNonEmptyString(value.filters.nameIncludes)
  ) {
    issues.push(error(`${path}.filters.nameIncludes`, "Must be a non-empty string when provided."));
  }

  requireOptionalNonNegativeInteger(
    value.filters.minSizeBytes,
    `${path}.filters.minSizeBytes`,
    issues
  );
  requireOptionalNonNegativeInteger(
    value.filters.maxSizeBytes,
    `${path}.filters.maxSizeBytes`,
    issues
  );

  if (
    typeof value.filters.minSizeBytes === "number" &&
    typeof value.filters.maxSizeBytes === "number" &&
    value.filters.minSizeBytes > value.filters.maxSizeBytes
  ) {
    issues.push(error(`${path}.filters.maxSizeBytes`, "Must be greater than or equal to minSizeBytes."));
  }

  return issues;
}

function validateMetadataTrigger(
  value: Record<string, unknown>,
  path: string
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  if (value.filters === undefined) {
    return issues;
  }

  if (!isRecord(value.filters)) {
    return [error(`${path}.filters`, "Metadata trigger filters must be an object.")];
  }

  requireOptionalStringArray(value.filters.targetTypes, `${path}.filters.targetTypes`, issues);
  requireOptionalStringArray(value.filters.targetIds, `${path}.filters.targetIds`, issues);
  requireOptionalStringArray(value.filters.tagIds, `${path}.filters.tagIds`, issues);
  requireOptionalStringArray(value.filters.tagSlugs, `${path}.filters.tagSlugs`, issues);
  requireOptionalStringArray(value.filters.categoryIds, `${path}.filters.categoryIds`, issues);

  return issues;
}

function validateOptionalItemFields(
  value: Record<string, unknown>,
  path: string,
  issues: WorkflowValidationIssue[],
  label: string
): void {
  if (value.title !== undefined) requireNonEmptyString(value.title, `${path}.title`, issues);
  if (value.body !== undefined && value.body !== null && typeof value.body !== "string") {
    issues.push(error(`${path}.body`, `${label} body must be a string when provided.`));
  }
  if (value.categoryId !== undefined) requireNullableString(value.categoryId, `${path}.categoryId`, issues);
  if (value.containerTabId !== undefined) requireNullableString(value.containerTabId, `${path}.containerTabId`, issues);
}

function validateOptionalListFields(
  value: Record<string, unknown>,
  path: string,
  issues: WorkflowValidationIssue[],
  label: string
): void {
  validateOptionalItemFields(value, path, issues, label);
  if (value.displayMode !== undefined) {
    requireOneOf(value.displayMode, ["checklist", "pipeline"], `${path}.displayMode`, issues);
  }
  if (value.progressMode !== undefined) {
    requireOneOf(value.progressMode, ["count", "manual", "none"], `${path}.progressMode`, issues);
  }
  if (value.showCompleted !== undefined && typeof value.showCompleted !== "boolean") {
    issues.push(error(`${path}.showCompleted`, `${label} showCompleted must be a boolean when provided.`));
  }
}

function validateOptionalListItemFields(
  value: Record<string, unknown>,
  path: string,
  issues: WorkflowValidationIssue[],
  label: string
): void {
  if (value.title !== undefined) requireNonEmptyString(value.title, `${path}.title`, issues);
  if (value.body !== undefined && value.body !== null && typeof value.body !== "string") {
    issues.push(error(`${path}.body`, `${label} body must be a string when provided.`));
  }
  if (value.status !== undefined) {
    requireOneOf(
      value.status,
      ["open", "done", "waiting", "cancelled"],
      `${path}.status`,
      issues
    );
  }
  if (value.depth !== undefined && typeof value.depth !== "number") {
    issues.push(error(`${path}.depth`, `${label} depth must be a number when provided.`));
  }
  if (value.sortOrder !== undefined && typeof value.sortOrder !== "number") {
    issues.push(error(`${path}.sortOrder`, `${label} sortOrder must be a number when provided.`));
  }
  if (value.listItemParentId !== undefined) requireNullableString(value.listItemParentId, `${path}.listItemParentId`, issues);
  if (value.startAt !== undefined) requireNullableString(value.startAt, `${path}.startAt`, issues);
  if (value.dueAt !== undefined) requireNullableString(value.dueAt, `${path}.dueAt`, issues);
}

function validateOptionalNoteFields(
  value: Record<string, unknown>,
  path: string,
  issues: WorkflowValidationIssue[],
  label: string
): void {
  validateOptionalItemFields(value, path, issues, label);
  if (value.content !== undefined) requireNonEmptyString(value.content, `${path}.content`, issues);
  if (value.format !== undefined) requireEqual(value.format, "markdown", `${path}.format`, issues);
}

function requireAtLeastOne(
  value: Record<string, unknown>,
  path: string,
  issues: WorkflowValidationIssue[],
  keys: readonly string[]
): void {
  if (keys.every((key) => value[key] === undefined)) {
    issues.push(error(path, `At least one field must be provided: ${keys.join(", ")}.`));
  }
}

function requireOptionalStringArray(
  value: unknown,
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((entry) => !isNonEmptyString(entry))) {
    issues.push(error(path, "Must be an array of non-empty strings when provided."));
  }
}

function requireOptionalNonNegativeInteger(
  value: unknown,
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || (value as number) < 0) {
    issues.push(error(path, "Must be a non-negative integer when provided."));
  }
}

function buildValidationResult(
  schemaVersion: number | null,
  issues: WorkflowValidationIssue[]
): WorkflowValidationResult {
  const hasErrors = issues.some((issue) => issue.severity === "error");
  return {
    valid: !hasErrors,
    canEnable: !hasErrors,
    schemaVersion,
    issues
  };
}

function requireEqual(
  value: unknown,
  expected: string,
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (value !== expected) {
    issues.push(error(path, `Expected ${expected}.`));
  }
}

function requireOneOf(
  value: unknown,
  allowed: readonly string[],
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push(error(path, `Expected one of: ${allowed.join(", ")}.`));
  }
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(error(path, "Must be a non-empty string."));
  }
}

function requireNullableString(
  value: unknown,
  path: string,
  issues: WorkflowValidationIssue[]
): void {
  if (value !== null && !isNonEmptyString(value)) {
    issues.push(error(path, "Must be null or a non-empty string."));
  }
}

function error(path: string, message: string): WorkflowValidationIssue {
  return { severity: "error", path, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
