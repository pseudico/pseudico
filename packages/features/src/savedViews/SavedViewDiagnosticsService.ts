import { ActivityAction, createIsoTimestamp, createLocalId, type ActivityActorType } from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  ContainerRepository,
  SavedViewRepository,
  SearchIndexRepository,
  TagRepository,
  TransactionService,
  type DatabaseConnection,
  type SavedViewRecord
} from "@local-work-os/db";
import {
  migrateSavedViewQuery,
  stringifySavedViewQuery,
  validateSavedViewQuery,
  type SavedViewQuery,
  type SavedViewQueryCondition
} from "./SavedViewQuery";

export type SavedViewDiagnosticSeverity = "error" | "warning" | "info";

export type SavedViewDiagnosticIssue = {
  code:
    | "invalid_json"
    | "invalid_schema"
    | "migrated_schema"
    | "missing_tag"
    | "missing_category"
    | "missing_container";
  severity: SavedViewDiagnosticSeverity;
  message: string;
  conditionIndex?: number;
  value?: string;
  repairable: boolean;
};

export type SavedViewDiagnosticEntry = {
  savedView: SavedViewRecord;
  status: "ok" | "warning" | "error";
  issues: SavedViewDiagnosticIssue[];
  repairedQuery: SavedViewQuery | null;
  repairedQueryJson: string | null;
};

export type SavedViewDiagnosticsReport = {
  workspaceId: string;
  checkedAt: string;
  total: number;
  ok: number;
  warnings: number;
  errors: number;
  repairable: number;
  entries: SavedViewDiagnosticEntry[];
};

export type SavedViewRepairResult = {
  savedView: SavedViewRecord;
  beforeQueryJson: string;
  afterQueryJson: string;
  issues: SavedViewDiagnosticIssue[];
  changed: boolean;
};

export type SavedViewDiagnosticsServiceIdFactory = (prefix: string) => string;

export class SavedViewDiagnosticsService {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: SavedViewDiagnosticsServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SavedViewDiagnosticsServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  diagnoseWorkspace(workspaceId: string): SavedViewDiagnosticsReport {
    validateNonEmptyString(workspaceId, "workspaceId");
    const checkedAt = createIsoTimestamp(this.now());
    const entries = new SavedViewRepository(this.connection)
      .listByWorkspace(workspaceId)
      .map((savedView) => this.diagnoseSavedView(savedView));

    return {
      workspaceId,
      checkedAt,
      total: entries.length,
      ok: entries.filter((entry) => entry.status === "ok").length,
      warnings: entries.filter((entry) => entry.status === "warning").length,
      errors: entries.filter((entry) => entry.status === "error").length,
      repairable: entries.filter((entry) => entry.repairedQueryJson !== null).length,
      entries
    };
  }

  diagnoseSavedView(savedView: SavedViewRecord): SavedViewDiagnosticEntry {
    const issues: SavedViewDiagnosticIssue[] = [];
    let parsed: unknown;

    try {
      parsed = JSON.parse(savedView.queryJson);
    } catch {
      const repairedQuery = createEmptyQuery();
      issues.push({
        code: "invalid_json",
        severity: "error",
        message: "Saved view query JSON is invalid and can be reset to an empty query.",
        repairable: true
      });
      return toEntry(savedView, issues, repairedQuery);
    }

    const migration = migrateSavedViewQuery(parsed);

    if (!migration.ok) {
      const repairedQuery = createEmptyQuery();
      issues.push({
        code: "invalid_schema",
        severity: "error",
        message: migration.errors.join(" "),
        repairable: true
      });
      return toEntry(savedView, issues, repairedQuery);
    }

    let query = migration.query;

    if (migration.migrated) {
      issues.push({
        code: "migrated_schema",
        severity: "warning",
        message: migration.messages.join(" "),
        repairable: true
      });
    }

    const referenceRepair = this.repairMissingReferences(savedView.workspaceId, query);
    query = referenceRepair.query;
    issues.push(...referenceRepair.issues);

    const changed =
      migration.migrated ||
      referenceRepair.changed ||
      stringifySavedViewQuery(query) !== savedView.queryJson;

    return toEntry(savedView, issues, changed ? query : null);
  }

  async repairSavedView(
    savedViewId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<SavedViewRepairResult> {
    validateNonEmptyString(savedViewId, "savedViewId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new SavedViewRepository(this.connection);
      const before = repository.getById(savedViewId);

      if (before === null) {
        throw new Error(`Saved view was not found: ${savedViewId}.`);
      }

      const diagnostic = this.diagnoseSavedView(before);

      if (diagnostic.repairedQueryJson === null) {
        return {
          savedView: before,
          beforeQueryJson: before.queryJson,
          afterQueryJson: before.queryJson,
          issues: diagnostic.issues,
          changed: false
        };
      }

      const savedView = repository.update(savedViewId, {
        queryJson: diagnostic.repairedQueryJson,
        timestamp
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: savedView.workspaceId,
        actorType,
        action: ActivityAction.savedViewUpdated,
        targetType: "saved_view",
        targetId: savedView.id,
        summary: `Repaired saved view "${savedView.name}" query diagnostics.`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(savedView),
        timestamp
      });

      new SearchIndexRepository(this.connection).upsert({
        id: this.idFactory("search"),
        workspaceId: savedView.workspaceId,
        targetType: "saved_view",
        targetId: savedView.id,
        title: savedView.name,
        body: [savedView.description ?? "", savedView.type].filter(Boolean).join("\n"),
        metadataJson: JSON.stringify({
          type: savedView.type,
          queryJson: savedView.queryJson,
          displayJson: savedView.displayJson,
          isFavorite: savedView.isFavorite,
          deletedAt: savedView.deletedAt
        }),
        isDeleted: false,
        timestamp
      });

      return {
        savedView,
        beforeQueryJson: before.queryJson,
        afterQueryJson: savedView.queryJson,
        issues: diagnostic.issues,
        changed: true
      };
    });
  }

  private repairMissingReferences(
    workspaceId: string,
    query: SavedViewQuery
  ): { query: SavedViewQuery; issues: SavedViewDiagnosticIssue[]; changed: boolean } {
    const tags = new Set(
      new TagRepository(this.connection).listByWorkspace(workspaceId).map((tag) => tag.slug)
    );
    const categories = new CategoryRepository(this.connection).listByWorkspace(workspaceId);
    const categoryRefs = new Set(
      categories.flatMap((category) => [category.id, category.slug, category.name])
    );
    const containers = new Set(
      new ContainerRepository(this.connection)
        .listByWorkspace(workspaceId, { includeArchived: true })
        .map((container) => container.id)
    );
    const issues: SavedViewDiagnosticIssue[] = [];
    const conditions: SavedViewQueryCondition[] = [];
    let changed = false;

    query.conditions.forEach((condition, index) => {
      const repaired = repairConditionReferences(condition, index, {
        tags,
        categoryRefs,
        containers
      });
      issues.push(...repaired.issues);

      if (repaired.condition === null) {
        changed = true;
        return;
      }

      if (repaired.condition !== condition) {
        changed = true;
      }

      conditions.push(repaired.condition);
    });

    return {
      query: changed ? { ...query, conditions } : query,
      issues,
      changed
    };
  }
}

function repairConditionReferences(
  condition: SavedViewQueryCondition,
  conditionIndex: number,
  refs: {
    tags: Set<string>;
    categoryRefs: Set<string>;
    containers: Set<string>;
  }
): { condition: SavedViewQueryCondition | null; issues: SavedViewDiagnosticIssue[] } {
  if (condition.field === "tag") {
    return repairStringValues(condition, conditionIndex, refs.tags, "missing_tag", "tag");
  }

  if (condition.field === "category" && condition.operator !== "isEmpty" && condition.operator !== "isNotEmpty") {
    return repairStringValues(
      condition,
      conditionIndex,
      refs.categoryRefs,
      "missing_category",
      "category"
    );
  }

  if (condition.field === "container") {
    return repairStringValues(
      condition,
      conditionIndex,
      refs.containers,
      "missing_container",
      "container"
    );
  }

  return { condition, issues: [] };
}

function repairStringValues<TCondition extends SavedViewQueryCondition & { value?: string | string[] }>(
  condition: TCondition,
  conditionIndex: number,
  allowed: Set<string>,
  code: SavedViewDiagnosticIssue["code"],
  label: string
): { condition: TCondition | null; issues: SavedViewDiagnosticIssue[] } {
  const values = normalizeStringValues(condition.value);
  const kept = values.filter((value) => allowed.has(value));
  const missing = values.filter((value) => !allowed.has(value));
  const issues = missing.map((value): SavedViewDiagnosticIssue => ({
    code,
    severity: "warning",
    message: `Saved view references a missing ${label}: ${value}.`,
    conditionIndex,
    value,
    repairable: true
  }));

  if (missing.length === 0) {
    return { condition, issues };
  }

  if (kept.length === 0) {
    return { condition: null, issues };
  }

  return {
    condition: {
      ...condition,
      value: Array.isArray(condition.value) ? kept : kept[0]
    },
    issues
  };
}

function toEntry(
  savedView: SavedViewRecord,
  issues: SavedViewDiagnosticIssue[],
  repairedQuery: SavedViewQuery | null
): SavedViewDiagnosticEntry {
  const validation =
    repairedQuery === null ? null : validateSavedViewQuery(repairedQuery);
  const safeRepairedQuery = validation?.ok === true ? validation.query : null;
  const hasError = issues.some((issue) => issue.severity === "error");

  return {
    savedView,
    status: hasError ? "error" : issues.length > 0 ? "warning" : "ok",
    issues,
    repairedQuery: safeRepairedQuery,
    repairedQueryJson:
      safeRepairedQuery === null ? null : stringifySavedViewQuery(safeRepairedQuery)
  };
}

function createEmptyQuery(): SavedViewQuery {
  return {
    version: 1,
    match: "all",
    conditions: [],
    targets: ["container", "item"]
  };
}

function normalizeStringValues(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
