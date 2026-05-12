import { isItemType, isTaskStatus } from "@local-work-os/core";

export const SAVED_VIEW_QUERY_VERSION = 1;

export type SavedViewQueryMatch = "all" | "any";

export type SavedViewQueryTarget = "container" | "item";

export type SavedViewQueryCondition =
  | {
      field: "itemType";
      operator: "is" | "in";
      value: string | string[];
    }
  | {
      field: "containerType";
      operator: "is" | "in";
      value: string | string[];
    }
  | {
      field: "container";
      operator: "is" | "in";
      value: string | string[];
    }
  | {
      field: "tag";
      operator: "has" | "hasAny";
      value: string | string[];
    }
  | {
      field: "category";
      operator: "is" | "in" | "isEmpty" | "isNotEmpty";
      value?: string | string[];
    }
  | {
      field: "status";
      operator: "is" | "in";
      value: string | string[];
    }
  | {
      field: "taskStatus";
      operator: "is" | "in";
      value: string | string[];
    }
  | {
      field: "taskPriority";
      operator: "is" | "in";
      value: number | number[];
    }
  | {
      field: "dueDate";
      operator: "before" | "after" | "on" | "between" | "isEmpty" | "isNotEmpty";
      value?: string | { from: string; to: string };
    }
  | {
      field: "text";
      operator: "contains";
      value: string;
    }
  | {
      field: "attachment";
      operator: "has" | "none";
    }
  | {
      field: "pinned";
      operator: "is";
      value: boolean;
    }
  | {
      field: "archived";
      operator: "is";
      value: boolean;
    };

export type SavedViewGroupBy =
  | "none"
  | "targetType"
  | "type"
  | "container"
  | "category"
  | "status"
  | "dueDate";

export type SavedViewSortField =
  | "title"
  | "type"
  | "container"
  | "category"
  | "status"
  | "dueAt"
  | "createdAt"
  | "updatedAt";

export type SavedViewSortDirection = "asc" | "desc";

export type SavedViewSort = {
  field: SavedViewSortField;
  direction?: SavedViewSortDirection;
};

export type SavedViewQueryV1 = {
  version: 1;
  match: SavedViewQueryMatch;
  conditions: SavedViewQueryCondition[];
  targets?: SavedViewQueryTarget[];
  groupBy?: SavedViewGroupBy;
  sort?: SavedViewSort[];
  limit?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type SavedViewQuery = SavedViewQueryV1;

export type SavedViewQueryValidationResult =
  | { ok: true; query: SavedViewQuery }
  | { ok: false; errors: string[] };

export type SavedViewQueryMigrationResult =
  | { ok: true; query: SavedViewQuery; migrated: boolean; messages: string[] }
  | { ok: false; errors: string[] };

const CONTAINER_TYPES = ["inbox", "project", "contact"] as const;
const CONDITION_FIELDS = [
  "itemType",
  "containerType",
  "container",
  "tag",
  "category",
  "status",
  "taskStatus",
  "taskPriority",
  "dueDate",
  "text",
  "attachment",
  "pinned",
  "archived"
] as const;
const GROUP_BY_VALUES = [
  "none",
  "targetType",
  "type",
  "container",
  "category",
  "status",
  "dueDate"
] as const;
const SORT_FIELDS = [
  "title",
  "type",
  "container",
  "category",
  "status",
  "dueAt",
  "createdAt",
  "updatedAt"
] as const;

export function validateSavedViewQuery(
  input: unknown
): SavedViewQueryValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["query must be an object."] };
  }

  if (input.version !== SAVED_VIEW_QUERY_VERSION) {
    errors.push("query.version must be 1.");
  }

  if (input.match !== "all" && input.match !== "any") {
    errors.push("query.match must be all or any.");
  }

  if (!Array.isArray(input.conditions)) {
    errors.push("query.conditions must be an array.");
  } else {
    input.conditions.forEach((condition, index) => {
      validateCondition(condition, `conditions[${index}]`, errors);
    });
  }

  if (input.targets !== undefined) {
    if (!Array.isArray(input.targets) || input.targets.length === 0) {
      errors.push("query.targets must be a non-empty array when provided.");
    } else {
      for (const target of input.targets) {
        if (target !== "container" && target !== "item") {
          errors.push("query.targets can only include container or item.");
        }
      }
    }
  }

  if (
    input.groupBy !== undefined &&
    !isOneOf(input.groupBy, GROUP_BY_VALUES)
  ) {
    errors.push("query.groupBy is not supported.");
  }

  if (input.sort !== undefined) {
    if (!Array.isArray(input.sort)) {
      errors.push("query.sort must be an array when provided.");
    } else {
      input.sort.forEach((sort, index) => {
        validateSort(sort, `sort[${index}]`, errors);
      });
    }
  }

  if (
    input.limit !== undefined &&
    (typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 500)
  ) {
    errors.push("query.limit must be an integer between 1 and 500.");
  }

  if (
    input.includeArchived !== undefined &&
    typeof input.includeArchived !== "boolean"
  ) {
    errors.push("query.includeArchived must be a boolean.");
  }

  if (
    input.includeDeleted !== undefined &&
    typeof input.includeDeleted !== "boolean"
  ) {
    errors.push("query.includeDeleted must be a boolean.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, query: input as SavedViewQuery };
}

export function parseSavedViewQueryJson(queryJson: string): SavedViewQuery {
  let parsed: unknown;

  try {
    parsed = JSON.parse(queryJson);
  } catch {
    throw new Error("Saved view query_json must be valid JSON.");
  }

  const validation = validateSavedViewQuery(parsed);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return validation.query;
}

export function migrateSavedViewQuery(input: unknown): SavedViewQueryMigrationResult {
  const migrated = migrateLegacyQueryShape(input);
  const validation = validateSavedViewQuery(migrated.query);

  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  return {
    ok: true,
    query: validation.query,
    migrated: migrated.migrated,
    messages: migrated.messages
  };
}

export function stringifySavedViewQuery(query: SavedViewQuery): string {
  const validation = validateSavedViewQuery(query);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return JSON.stringify(query);
}

function validateCondition(
  condition: unknown,
  path: string,
  errors: string[]
): void {
  if (!isRecord(condition)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (!isOneOf(condition.field, CONDITION_FIELDS)) {
    errors.push(`${path}.field is not supported.`);
    return;
  }

  if (condition.field === "itemType") {
    validateSetCondition(condition, path, errors, isItemType, "item type");
  } else if (condition.field === "containerType") {
    validateSetCondition(
      condition,
      path,
      errors,
      (value) => isOneOf(value, CONTAINER_TYPES),
      "container type"
    );
  } else if (condition.field === "container") {
    validateSetCondition(condition, path, errors, isNonEmptyString, "container id");
  } else if (condition.field === "tag") {
    if (condition.operator !== "has" && condition.operator !== "hasAny") {
      errors.push(`${path}.operator must be has or hasAny.`);
    }
    validateStringOrStringArray(condition.value, `${path}.value`, errors);
  } else if (condition.field === "category") {
    validateCategoryCondition(condition, path, errors);
  } else if (condition.field === "status") {
    validateSetCondition(condition, path, errors, isNonEmptyString, "status");
  } else if (condition.field === "taskStatus") {
    validateSetCondition(condition, path, errors, isTaskStatus, "task status");
  } else if (condition.field === "taskPriority") {
    validatePriorityCondition(condition, path, errors);
  } else if (condition.field === "dueDate") {
    validateDueDateCondition(condition, path, errors);
  } else if (condition.field === "attachment") {
    if (condition.operator !== "has" && condition.operator !== "none") {
      errors.push(`${path}.operator must be has or none.`);
    }
  } else if (condition.field === "pinned" || condition.field === "archived") {
    if (condition.operator !== "is") {
      errors.push(`${path}.operator must be is.`);
    }
    if (typeof condition.value !== "boolean") {
      errors.push(`${path}.value must be a boolean.`);
    }
  } else {
    if (condition.operator !== "contains") {
      errors.push(`${path}.operator must be contains.`);
    }
    if (typeof condition.value !== "string" || condition.value.trim().length === 0) {
      errors.push(`${path}.value must be a non-empty string.`);
    }
  }
}

function migrateLegacyQueryShape(input: unknown): {
  query: unknown;
  migrated: boolean;
  messages: string[];
} {
  if (!isRecord(input)) {
    return { query: input, migrated: false, messages: [] };
  }

  if (input.version === SAVED_VIEW_QUERY_VERSION) {
    return { query: input, migrated: false, messages: [] };
  }

  if (input.version === undefined && Array.isArray(input.conditions)) {
    return {
      query: {
        ...input,
        version: SAVED_VIEW_QUERY_VERSION,
        match: input.match === "any" ? "any" : "all"
      },
      migrated: true,
      messages: ["Added missing saved-view query version."]
    };
  }

  const legacyFilters = Array.isArray(input.filters) ? input.filters : [];

  if (input.version === 0 || legacyFilters.length > 0) {
    const conditions = legacyFilters
      .map(migrateLegacyFilter)
      .filter((condition): condition is SavedViewQueryCondition => condition !== null);
    const targets: SavedViewQueryTarget[] = [];

    if (input.includeContainers !== false) {
      targets.push("container");
    }

    if (input.includeItems !== false) {
      targets.push("item");
    }

    return {
      query: {
        version: SAVED_VIEW_QUERY_VERSION,
        match: input.match === "any" || input.operator === "any" ? "any" : "all",
        conditions,
        targets: targets.length === 0 ? ["container", "item"] : targets,
        includeArchived: input.includeArchived === true
      },
      migrated: true,
      messages: ["Migrated legacy saved-view query filters to version 1."]
    };
  }

  return { query: input, migrated: false, messages: [] };
}

function migrateLegacyFilter(filter: unknown): SavedViewQueryCondition | null {
  if (!isRecord(filter)) {
    return null;
  }

  const field = filter.field ?? filter.type;
  const value = filter.value ?? filter.id ?? filter.slug;

  if (field === "tag" || field === "tagSlug") {
    return { field: "tag", operator: "has", value: value as string | string[] };
  }

  if (field === "category" || field === "categoryId") {
    return { field: "category", operator: "is", value: value as string | string[] };
  }

  if (field === "container" || field === "containerId") {
    return { field: "container", operator: "is", value: value as string | string[] };
  }

  if (field === "itemType" || field === "type") {
    return { field: "itemType", operator: "is", value: value as string | string[] };
  }

  if (field === "text" || field === "search") {
    return { field: "text", operator: "contains", value: String(value ?? "") };
  }

  return null;
}

function validatePriorityCondition(
  condition: Record<string, unknown>,
  path: string,
  errors: string[]
): void {
  if (condition.operator !== "is" && condition.operator !== "in") {
    errors.push(`${path}.operator must be is or in.`);
  }

  const values = normalizeNumberValues(condition.value);

  if (values.length === 0) {
    errors.push(`${path}.value must include at least one task priority.`);
    return;
  }

  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      errors.push(`${path}.value includes unsupported task priority: ${value}.`);
    }
  }
}

function validateSetCondition(
  condition: Record<string, unknown>,
  path: string,
  errors: string[],
  isAllowedValue: (value: string) => boolean,
  label: string
): void {
  if (condition.operator !== "is" && condition.operator !== "in") {
    errors.push(`${path}.operator must be is or in.`);
  }

  const values = normalizeStringValues(condition.value);

  if (values.length === 0) {
    errors.push(`${path}.value must include at least one ${label}.`);
    return;
  }

  for (const value of values) {
    if (!isAllowedValue(value)) {
      errors.push(`${path}.value includes unsupported ${label}: ${value}.`);
    }
  }
}

function validateCategoryCondition(
  condition: Record<string, unknown>,
  path: string,
  errors: string[]
): void {
  if (condition.operator === "isEmpty" || condition.operator === "isNotEmpty") {
    return;
  }

  if (condition.operator !== "is" && condition.operator !== "in") {
    errors.push(`${path}.operator must be is, in, isEmpty, or isNotEmpty.`);
  }

  validateStringOrStringArray(condition.value, `${path}.value`, errors);
}

function validateDueDateCondition(
  condition: Record<string, unknown>,
  path: string,
  errors: string[]
): void {
  if (condition.operator === "isEmpty" || condition.operator === "isNotEmpty") {
    return;
  }

  if (
    condition.operator !== "before" &&
    condition.operator !== "after" &&
    condition.operator !== "on" &&
    condition.operator !== "between"
  ) {
    errors.push(`${path}.operator must be before, after, on, between, isEmpty, or isNotEmpty.`);
    return;
  }

  if (condition.operator === "between") {
    if (
      !isRecord(condition.value) ||
      typeof condition.value.from !== "string" ||
      typeof condition.value.to !== "string"
    ) {
      errors.push(`${path}.value must include from and to strings.`);
    }
    return;
  }

  if (typeof condition.value !== "string" || condition.value.trim().length === 0) {
    errors.push(`${path}.value must be a non-empty date string.`);
  }
}

function validateStringOrStringArray(
  value: unknown,
  path: string,
  errors: string[]
): void {
  if (typeof value === "string" && value.trim().length > 0) {
    return;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  ) {
    return;
  }

  errors.push(`${path} must be a non-empty string or string array.`);
}

function validateSort(sort: unknown, path: string, errors: string[]): void {
  if (!isRecord(sort)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (!isOneOf(sort.field, SORT_FIELDS)) {
    errors.push(`${path}.field is not supported.`);
  }

  if (
    sort.direction !== undefined &&
    sort.direction !== "asc" &&
    sort.direction !== "desc"
  ) {
    errors.push(`${path}.direction must be asc or desc.`);
  }
}

function normalizeStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length === 0 ? [] : [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeNumberValues(value: unknown): number[] {
  if (typeof value === "number") {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is number => typeof entry === "number");
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<const TValue extends readonly string[]>(
  value: unknown,
  values: TValue
): value is TValue[number] {
  return typeof value === "string" && values.includes(value);
}
