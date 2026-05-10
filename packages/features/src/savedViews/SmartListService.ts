import {
  createLocalId,
  isItemType,
  isTaskStatus,
  type ActivityActorType,
  type ItemType,
  type TaskStatus
} from "@local-work-os/core";
import {
  SavedViewRepository,
  type DatabaseConnection,
  type SavedViewRecord
} from "@local-work-os/db";
import {
  SavedViewService,
  type SavedViewMutationResult,
  type SavedViewServiceIdFactory
} from "./SavedViewService";
import {
  parseSavedViewQueryJson,
  validateSavedViewQuery,
  type SavedViewQuery,
  type SavedViewQueryCondition,
  type SavedViewQueryMatch,
  type SavedViewQueryTarget
} from "./SavedViewQuery";
import type { SavedViewEvaluationResult } from "./QueryEvaluator";

export type SmartListContainerType = "inbox" | "project" | "contact";

export type SmartListDueFilter =
  | "any"
  | "overdue"
  | "today"
  | "tomorrow"
  | "next7Days"
  | "next30Days"
  | "noDueDate"
  | "hasDueDate"
  | "customRange";

export type SmartListCriteriaForm = {
  match?: SavedViewQueryMatch;
  includeItems?: boolean;
  includeContainers?: boolean;
  itemTypes?: ItemType[];
  containerTypes?: SmartListContainerType[];
  tagSlugs?: string[];
  categoryIds?: string[];
  categoryMode?: "any" | "is" | "isEmpty" | "isNotEmpty";
  taskStatuses?: TaskStatus[];
  taskPriorities?: number[];
  dueFilter?: SmartListDueFilter;
  customDueFrom?: string;
  customDueTo?: string;
};

export type SmartListSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  criteria: SmartListCriteriaForm | null;
  query: SavedViewQuery;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SmartListPreviewResult = SavedViewEvaluationResult & {
  query: SavedViewQuery;
};

export type CreateSmartListInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  criteria: SmartListCriteriaForm;
  actorType?: ActivityActorType;
  isFavorite?: boolean;
};

export type UpdateSmartListInput = {
  smartListId: string;
  name?: string;
  description?: string | null;
  criteria?: SmartListCriteriaForm;
  actorType?: ActivityActorType;
  isFavorite?: boolean;
};

export type PreviewSmartListInput = {
  workspaceId: string;
  criteria: SmartListCriteriaForm;
  limit?: number;
  offset?: number;
};

export class SmartListService {
  readonly module = "savedViews.smartLists";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: SavedViewServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SavedViewServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  listSmartLists(workspaceId: string): SmartListSummary[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new SavedViewRepository(this.connection)
      .listByWorkspace(workspaceId, { type: "smart_list" })
      .map(toSmartListSummary);
  }

  async createSmartList(
    input: CreateSmartListInput
  ): Promise<SavedViewMutationResult & { smartList: SmartListSummary }> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.name, "name");
    const criteria = normalizeCriteria(input.criteria);
    const query = mapFormToSavedViewQuery(criteria, this.now());
    const result = await this.savedViewService().createSavedView({
      workspaceId: input.workspaceId,
      type: "smart_list",
      name: input.name,
      query,
      display: createSmartListDisplay(criteria),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.isFavorite === undefined ? {} : { isFavorite: input.isFavorite }),
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });

    return {
      ...result,
      smartList: toSmartListSummary(result.savedView)
    };
  }

  async updateSmartList(
    input: UpdateSmartListInput
  ): Promise<SavedViewMutationResult & { smartList: SmartListSummary }> {
    validateNonEmptyString(input.smartListId, "smartListId");
    this.requireSmartList(input.smartListId);
    const updateInput: Parameters<SavedViewService["updateSavedView"]>[0] = {
      savedViewId: input.smartListId
    };

    if (input.name !== undefined) {
      updateInput.name = input.name;
    }

    if (input.description !== undefined) {
      updateInput.description = input.description;
    }

    if (input.criteria !== undefined) {
      const criteria = normalizeCriteria(input.criteria);
      updateInput.query = mapFormToSavedViewQuery(criteria, this.now());
      updateInput.display = createSmartListDisplay(criteria);
    }

    if (input.isFavorite !== undefined) {
      updateInput.isFavorite = input.isFavorite;
    }

    if (input.actorType !== undefined) {
      updateInput.actorType = input.actorType;
    }

    const result = await this.savedViewService().updateSavedView(updateInput);

    return {
      ...result,
      smartList: toSmartListSummary(result.savedView)
    };
  }

  previewSmartList(input: PreviewSmartListInput): SmartListPreviewResult {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const query = mapFormToSavedViewQuery(input.criteria, this.now());
    const result = this.savedViewService().evaluateSavedView({
      workspaceId: input.workspaceId,
      query,
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.offset === undefined ? {} : { offset: input.offset })
    });

    return {
      ...result,
      query
    };
  }

  private requireSmartList(smartListId: string): SavedViewRecord {
    const savedView = new SavedViewRepository(this.connection).getById(smartListId);

    if (savedView === null || savedView.type !== "smart_list") {
      throw new Error(`Smart list was not found: ${smartListId}.`);
    }

    return savedView;
  }

  private savedViewService(): SavedViewService {
    return new SavedViewService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }
}

export function mapFormToSavedViewQuery(
  form: SmartListCriteriaForm,
  now: Date = new Date()
): SavedViewQuery {
  const criteria = normalizeCriteria(form);
  const conditions: SavedViewQueryCondition[] = [];
  const itemTypes = normalizeAllowedValues(criteria.itemTypes, isItemType);
  const containerTypes = normalizeAllowedValues(
    criteria.containerTypes,
    isContainerType
  );
  const tagSlugs = normalizeStrings(criteria.tagSlugs);
  const categoryIds = normalizeStrings(criteria.categoryIds);
  const taskStatuses = normalizeAllowedValues(
    criteria.taskStatuses,
    isTaskStatus
  );
  const taskPriorities = normalizePriorities(criteria.taskPriorities);

  if (itemTypes.length > 0) {
    conditions.push({
      field: "itemType",
      operator: itemTypes.length === 1 ? "is" : "in",
      value: toSingleOrMany(itemTypes)
    });
  }

  if (containerTypes.length > 0) {
    conditions.push({
      field: "containerType",
      operator: containerTypes.length === 1 ? "is" : "in",
      value: toSingleOrMany(containerTypes)
    });
  }

  if (tagSlugs.length > 0) {
    conditions.push({
      field: "tag",
      operator: tagSlugs.length === 1 ? "has" : "hasAny",
      value: toSingleOrMany(tagSlugs)
    });
  }

  if (criteria.categoryMode === "isEmpty") {
    conditions.push({ field: "category", operator: "isEmpty" });
  } else if (criteria.categoryMode === "isNotEmpty") {
    conditions.push({ field: "category", operator: "isNotEmpty" });
  } else if (categoryIds.length > 0) {
    conditions.push({
      field: "category",
      operator: categoryIds.length === 1 ? "is" : "in",
      value: toSingleOrMany(categoryIds)
    });
  }

  if (taskStatuses.length > 0) {
    conditions.push({
      field: "taskStatus",
      operator: taskStatuses.length === 1 ? "is" : "in",
      value: toSingleOrMany(taskStatuses)
    });
  }

  if (taskPriorities.length > 0) {
    conditions.push({
      field: "taskPriority",
      operator: taskPriorities.length === 1 ? "is" : "in",
      value: toSingleOrManyNumbers(taskPriorities)
    });
  }

  const dueCondition = createDueCondition(criteria, now);

  if (dueCondition !== null) {
    conditions.push(dueCondition);
  }

  const targets = createTargets(criteria);
  const query: SavedViewQuery = {
    version: 1,
    match: criteria.match ?? "all",
    targets,
    conditions,
    groupBy: "container",
    sort: [
      { field: "dueAt", direction: "asc" },
      { field: "updatedAt", direction: "desc" }
    ]
  };
  const validation = validateSavedViewQuery(query);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return validation.query;
}

export function toSmartListSummary(savedView: SavedViewRecord): SmartListSummary {
  return {
    id: savedView.id,
    workspaceId: savedView.workspaceId,
    name: savedView.name,
    description: savedView.description,
    criteria: extractCriteria(savedView),
    query: parseSavedViewQueryJson(savedView.queryJson),
    isFavorite: savedView.isFavorite,
    createdAt: savedView.createdAt,
    updatedAt: savedView.updatedAt
  };
}

function createDueCondition(
  criteria: SmartListCriteriaForm,
  now: Date
): Extract<SavedViewQueryCondition, { field: "dueDate" }> | null {
  const dueFilter = criteria.dueFilter ?? "any";

  if (dueFilter === "any") {
    return null;
  }

  if (dueFilter === "noDueDate") {
    return { field: "dueDate", operator: "isEmpty" };
  }

  if (dueFilter === "hasDueDate") {
    return { field: "dueDate", operator: "isNotEmpty" };
  }

  const today = startOfUtcDay(now);

  if (dueFilter === "overdue") {
    return {
      field: "dueDate",
      operator: "before",
      value: today.toISOString()
    };
  }

  if (dueFilter === "today") {
    return {
      field: "dueDate",
      operator: "on",
      value: toIsoDate(today)
    };
  }

  if (dueFilter === "tomorrow") {
    return {
      field: "dueDate",
      operator: "on",
      value: toIsoDate(addUtcDays(today, 1))
    };
  }

  if (dueFilter === "next7Days" || dueFilter === "next30Days") {
    const days = dueFilter === "next7Days" ? 6 : 29;

    return {
      field: "dueDate",
      operator: "between",
      value: {
        from: today.toISOString(),
        to: endOfUtcDay(addUtcDays(today, days)).toISOString()
      }
    };
  }

  const from = parseDateInput(criteria.customDueFrom, "customDueFrom");
  const to = parseDateInput(criteria.customDueTo, "customDueTo");

  return {
    field: "dueDate",
    operator: "between",
    value: {
      from: startOfUtcDay(from).toISOString(),
      to: endOfUtcDay(to).toISOString()
    }
  };
}

function createTargets(criteria: SmartListCriteriaForm): SavedViewQueryTarget[] {
  const includeItems = criteria.includeItems !== false;
  const includeContainers = criteria.includeContainers === true;

  if (!includeItems && !includeContainers) {
    throw new Error("Smart list must include items, containers, or both.");
  }

  return [
    ...(includeContainers ? (["container"] as const) : []),
    ...(includeItems ? (["item"] as const) : [])
  ];
}

function normalizeCriteria(input: SmartListCriteriaForm): SmartListCriteriaForm {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Smart list criteria must be an object.");
  }

  return {
    match: input.match === "any" ? "any" : "all",
    includeItems: input.includeItems !== false,
    includeContainers: input.includeContainers === true,
    itemTypes: normalizeAllowedValues(input.itemTypes, isItemType),
    containerTypes: normalizeAllowedValues(input.containerTypes, isContainerType),
    tagSlugs: normalizeStrings(input.tagSlugs),
    categoryIds: normalizeStrings(input.categoryIds),
    categoryMode:
      input.categoryMode === "isEmpty" || input.categoryMode === "isNotEmpty"
        ? input.categoryMode
        : input.categoryIds !== undefined && input.categoryIds.length > 0
          ? "is"
          : "any",
    taskStatuses: normalizeAllowedValues(input.taskStatuses, isTaskStatus),
    taskPriorities: normalizePriorities(input.taskPriorities),
    dueFilter: normalizeDueFilter(input.dueFilter),
    ...(input.customDueFrom === undefined
      ? {}
      : { customDueFrom: input.customDueFrom }),
    ...(input.customDueTo === undefined ? {} : { customDueTo: input.customDueTo })
  };
}

function normalizeDueFilter(value: SmartListDueFilter | undefined): SmartListDueFilter {
  return value === "overdue" ||
    value === "today" ||
    value === "tomorrow" ||
    value === "next7Days" ||
    value === "next30Days" ||
    value === "noDueDate" ||
    value === "hasDueDate" ||
    value === "customRange"
    ? value
    : "any";
}

function normalizeAllowedValues<TValue extends string>(
  values: readonly string[] | undefined,
  isAllowed: (value: string) => value is TValue
): TValue[] {
  return normalizeStrings(values).filter(isAllowed);
}

function toSingleOrMany<TValue extends string>(values: TValue[]): TValue | TValue[] {
  const first = values[0];

  if (first === undefined) {
    throw new Error("Expected at least one filter value.");
  }

  return values.length === 1 ? first : values;
}

function toSingleOrManyNumbers(values: number[]): number | number[] {
  const first = values[0];

  if (first === undefined) {
    throw new Error("Expected at least one filter value.");
  }

  return values.length === 1 ? first : values;
}

function normalizeStrings(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizePriorities(values: readonly number[] | undefined): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values)].filter(
    (value) => Number.isInteger(value) && value >= 0 && value <= 5
  );
}

function isContainerType(value: string): value is SmartListContainerType {
  return value === "inbox" || value === "project" || value === "contact";
}

function parseDateInput(value: string | undefined, fieldName: string): Date {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${fieldName} is required for custom due ranges.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createSmartListDisplay(criteria: SmartListCriteriaForm): Record<string, unknown> {
  return {
    smartListVersion: 1,
    smartListCriteria: criteria
  };
}

function extractCriteria(savedView: SavedViewRecord): SmartListCriteriaForm | null {
  const display = parseDisplay(savedView.displayJson);
  const criteria = display.smartListCriteria;

  return typeof criteria === "object" && criteria !== null && !Array.isArray(criteria)
    ? normalizeCriteria(criteria as SmartListCriteriaForm)
    : null;
}

function parseDisplay(displayJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(displayJson);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
