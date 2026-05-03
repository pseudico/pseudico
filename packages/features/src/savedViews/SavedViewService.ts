import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  SavedViewRepository,
  SearchIndexRepository,
  TransactionService,
  type DatabaseConnection,
  type SavedViewRecord,
  type SavedViewType,
  type SearchIndexRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { QueryEvaluator, type SavedViewEvaluationResult } from "./QueryEvaluator";
import {
  parseSavedViewQueryJson,
  stringifySavedViewQuery,
  validateSavedViewQuery,
  type SavedViewQuery,
  type SavedViewQueryValidationResult
} from "./SavedViewQuery";

// Owns saved view, collection, and smart-list application contracts.
// Does not own search index implementation or dashboard layout.
export type SavedViewServiceIdFactory = (prefix: string) => string;

export type CreateSavedViewInput = {
  workspaceId: string;
  type: SavedViewType;
  name: string;
  query: SavedViewQuery;
  actorType?: ActivityActorType;
  description?: string | null;
  display?: Record<string, unknown>;
  isFavorite?: boolean;
};

export type UpdateSavedViewInput = {
  savedViewId: string;
  actorType?: ActivityActorType;
  name?: string;
  description?: string | null;
  query?: SavedViewQuery;
  display?: Record<string, unknown>;
  isFavorite?: boolean;
};

export type SavedViewMutationResult = {
  savedView: SavedViewRecord;
  searchRecord: SearchIndexRecord;
};

export class SavedViewService {
  readonly module = "savedViews";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: SavedViewServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SavedViewServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  validateSavedViewQuery(query: unknown): SavedViewQueryValidationResult {
    return validateSavedViewQuery(query);
  }

  evaluateSavedView(input: {
    workspaceId: string;
    query: SavedViewQuery | string;
  }): SavedViewEvaluationResult {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const query =
      typeof input.query === "string"
        ? parseSavedViewQueryJson(input.query)
        : parseValidatedQuery(input.query);
    const targets = new SavedViewRepository(this.connection).listEvaluationTargets(
      input.workspaceId
    );

    return new QueryEvaluator().evaluate(query, targets);
  }

  evaluateSavedViewById(savedViewId: string): SavedViewEvaluationResult {
    validateNonEmptyString(savedViewId, "savedViewId");
    const savedView = this.requireSavedView(savedViewId);

    return this.evaluateSavedView({
      workspaceId: savedView.workspaceId,
      query: savedView.queryJson
    });
  }

  listSavedViews(input: {
    workspaceId: string;
    type?: SavedViewType;
  }): SavedViewRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return new SavedViewRepository(this.connection).listByWorkspace(
      input.workspaceId,
      input.type === undefined ? {} : { type: input.type }
    );
  }

  async createSavedView(
    input: CreateSavedViewInput
  ): Promise<SavedViewMutationResult> {
    validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new SavedViewRepository(this.connection);
      const savedView = repository.create({
        id: this.idFactory("saved_view"),
        workspaceId: input.workspaceId,
        type: input.type,
        name: normalizeName(input.name),
        description: normalizeNullableString(input.description),
        queryJson: stringifySavedViewQuery(input.query),
        displayJson: JSON.stringify(input.display ?? {}),
        isFavorite: input.isFavorite ?? false,
        timestamp
      });

      this.logSavedViewEvent({
        savedView,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.savedViewCreated,
        summary: `Created saved view "${savedView.name}".`,
        before: null,
        after: savedView,
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(savedView, timestamp);

      return { savedView, searchRecord };
    });
  }

  async updateSavedView(
    input: UpdateSavedViewInput
  ): Promise<SavedViewMutationResult> {
    validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireSavedView(input.savedViewId);
      const savedView = new SavedViewRepository(this.connection).update(
        input.savedViewId,
        {
          ...(input.name === undefined ? {} : { name: normalizeName(input.name) }),
          ...(input.description === undefined
            ? {}
            : { description: normalizeNullableString(input.description) }),
          ...(input.query === undefined
            ? {}
            : { queryJson: stringifySavedViewQuery(input.query) }),
          ...(input.display === undefined
            ? {}
            : { displayJson: JSON.stringify(input.display) }),
          ...(input.isFavorite === undefined ? {} : { isFavorite: input.isFavorite }),
          timestamp
        }
      );

      this.logSavedViewEvent({
        savedView,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.savedViewUpdated,
        summary: `Updated saved view "${savedView.name}".`,
        before,
        after: savedView,
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(savedView, timestamp);

      return { savedView, searchRecord };
    });
  }

  async deleteSavedView(
    savedViewId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<SavedViewMutationResult> {
    validateNonEmptyString(savedViewId, "savedViewId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireSavedView(savedViewId);
      const savedView = new SavedViewRepository(this.connection).softDelete(
        savedViewId,
        timestamp
      );

      this.logSavedViewEvent({
        savedView,
        actorType,
        action: ActivityAction.savedViewDeleted,
        summary: `Deleted saved view "${savedView.name}".`,
        before,
        after: savedView,
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(savedView, timestamp);

      return { savedView, searchRecord };
    });
  }

  private requireSavedView(savedViewId: string): SavedViewRecord {
    const savedView = new SavedViewRepository(this.connection).getById(savedViewId);

    if (savedView === null) {
      throw new Error(`Saved view was not found: ${savedViewId}.`);
    }

    return savedView;
  }

  private upsertSearchRecord(
    savedView: SavedViewRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexRepository(this.connection).upsert({
      id: this.idFactory("search"),
      workspaceId: savedView.workspaceId,
      targetType: "saved_view",
      targetId: savedView.id,
      title: savedView.name,
      body: [savedView.description ?? "", savedView.type]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n"),
      metadataJson: JSON.stringify({
        type: savedView.type,
        queryJson: savedView.queryJson,
        displayJson: savedView.displayJson,
        isFavorite: savedView.isFavorite,
        deletedAt: savedView.deletedAt
      }),
      isDeleted: savedView.deletedAt !== null,
      timestamp
    });
  }

  private logSavedViewEvent(input: {
    savedView: SavedViewRecord;
    actorType: ActivityActorType;
    action:
      | typeof ActivityAction.savedViewCreated
      | typeof ActivityAction.savedViewUpdated
      | typeof ActivityAction.savedViewDeleted;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.savedView.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "saved_view",
      targetId: input.savedView.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

export const savedViewsModuleContract = {
  module: "savedViews",
  purpose: "Manage saved query definitions, collections, smart lists, and diagnostics.",
  owns: ["saved query operations", "collection contracts", "smart-list filter contracts"],
  doesNotOwn: ["search index implementation", "dashboard widget layout", "metadata mutation rules"],
  integrationPoints: ["search", "metadata", "tasks", "projects", "contacts", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function parseValidatedQuery(query: SavedViewQuery): SavedViewQuery {
  const validation = validateSavedViewQuery(query);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return validation.query;
}

function validateCreateInput(input: CreateSavedViewInput): void {
  validateNonEmptyString(input.workspaceId, "workspaceId");
  validateSavedViewType(input.type);
  validateNonEmptyString(input.name, "name");
  parseValidatedQuery(input.query);
}

function validateUpdateInput(input: UpdateSavedViewInput): void {
  validateNonEmptyString(input.savedViewId, "savedViewId");

  if (input.name !== undefined) {
    validateNonEmptyString(input.name, "name");
  }

  if (input.query !== undefined) {
    parseValidatedQuery(input.query);
  }

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.query === undefined &&
    input.display === undefined &&
    input.isFavorite === undefined
  ) {
    throw new Error("At least one saved view field must be provided.");
  }
}

function validateSavedViewType(type: SavedViewType): void {
  if (!["collection", "smart_list", "dashboard_widget", "search"].includes(type)) {
    throw new Error("type must be collection, smart_list, dashboard_widget, or search.");
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    throw new Error("Saved view name must be a non-empty string.");
  }

  return normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
