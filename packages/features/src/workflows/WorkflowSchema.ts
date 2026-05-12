export const WORKFLOW_DEFINITION_SCHEMA_VERSION = 1;
export const WORKFLOW_DEFINITION_KIND = "local-work-os.workflow";

export type WorkflowItemCreatedTriggerFilters = {
  itemTypes?: string[];
  textIncludes?: string;
  tagSlugs?: string[];
  categoryIds?: string[];
  containerIds?: string[];
};

export type WorkflowTrigger =
  | {
      type: "manual";
    }
  | {
      type: "item_created";
      filters?: WorkflowItemCreatedTriggerFilters;
    };

export type WorkflowAction =
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
    };

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
      return `Create task "${action.title}" in container ${action.containerId}.`;
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
