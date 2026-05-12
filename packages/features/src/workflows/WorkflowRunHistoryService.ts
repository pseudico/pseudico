import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  WorkflowRepository,
  type ActivityLogRecord,
  type DatabaseConnection,
  type WorkflowRunRecord,
  type WorkflowRunRollbackStatus
} from "@local-work-os/db";
import { UndoService, type UndoApplyResult, type UndoableOperation } from "../undo";
import type { WorkflowActionExecutionResult } from "./WorkflowActionExecutor";

export type WorkflowRunHistoryServiceIdFactory = (prefix: string) => string;

export type WorkflowRunHistoryAction = {
  index: number;
  actionType: string;
  status: string;
  summary: string;
  targetType: string;
  targetId: string | null;
  activityIds: string[];
  undoableActivityIds: string[];
  diagnostics: string[];
};

export type WorkflowRunDiagnostics = {
  runId: string;
  workflowDefinitionId: string | null;
  status: WorkflowRunRecord["status"];
  triggerType: WorkflowRunRecord["triggerType"];
  errorMessage: string | null;
  canRollback: boolean;
  rollbackStatus: WorkflowRunRollbackStatus | null;
  actionCount: number;
  completedActionCount: number;
  failedActionCount: number;
  skippedActionCount: number;
  undoableActivityIds: string[];
  issues: string[];
};

export type WorkflowRunHistoryEntry = {
  run: WorkflowRunRecord;
  actions: WorkflowRunHistoryAction[];
  diagnostics: WorkflowRunDiagnostics;
};

export type ListWorkflowRunHistoryInput = {
  workspaceId: string;
  workflowDefinitionId?: string;
  limit?: number;
};

export type RollbackWorkflowRunInput = {
  runId: string;
  actorType?: ActivityActorType;
};

export type WorkflowRunRollbackResult = {
  run: WorkflowRunRecord;
  status: WorkflowRunRollbackStatus;
  applied: UndoApplyResult[];
  skipped: Array<{
    activityId: string;
    reason: string;
  }>;
  failed: Array<{
    activityId: string;
    reason: string;
  }>;
  activityIds: string[];
};

export class WorkflowRunHistoryService {
  readonly module = "workflow-run-history";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: WorkflowRunHistoryServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: WorkflowRunHistoryServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  listRunHistory(input: ListWorkflowRunHistoryInput): WorkflowRunHistoryEntry[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    return new WorkflowRepository(this.connection)
      .listRuns({
        workspaceId: input.workspaceId,
        ...(input.workflowDefinitionId === undefined
          ? {}
          : { workflowDefinitionId: input.workflowDefinitionId }),
        ...(input.limit === undefined ? {} : { limit: input.limit })
      })
      .map((run) => this.toHistoryEntry(run));
  }

  getRunHistory(runId: string): WorkflowRunHistoryEntry {
    validateNonEmptyString(runId, "runId");
    return this.toHistoryEntry(this.requireRun(runId));
  }

  getRunDiagnostics(runId: string): WorkflowRunDiagnostics {
    return this.getRunHistory(runId).diagnostics;
  }

  async rollbackRun(
    input: RollbackWorkflowRunInput
  ): Promise<WorkflowRunRollbackResult> {
    validateNonEmptyString(input.runId, "runId");
    const run = this.requireRun(input.runId);

    if (run.status !== "completed") {
      throw new Error("Only completed workflow runs can be rolled back.");
    }

    if (run.rollbackStatus === "completed") {
      throw new Error("Workflow run has already been rolled back.");
    }

    const diagnostics = this.getRunDiagnostics(run.id);
    const activityIds = [...diagnostics.undoableActivityIds].reverse();
    const startedAt = createIsoTimestamp(this.now());
    const applied: UndoApplyResult[] = [];
    const skipped: WorkflowRunRollbackResult["skipped"] = [];
    const failed: WorkflowRunRollbackResult["failed"] = [];

    for (const activityId of activityIds) {
      const operation = this.getUndoableOperation(activityId);
      if (operation === null) {
        skipped.push({
          activityId,
          reason: "Activity does not have undoable before/after snapshots."
        });
        continue;
      }

      try {
        const result = await new UndoService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).undoActivity(activityId, input.actorType ?? "local_user");

        if (result.ok) {
          applied.push(result);
        } else {
          failed.push({ activityId, reason: result.message });
        }
      } catch (error) {
        failed.push({
          activityId,
          reason: error instanceof Error ? error.message : "Undo failed."
        });
      }
    }

    const completedAt = createIsoTimestamp(this.now());
    const rollbackStatus = resolveRollbackStatus({
      attempted: activityIds.length,
      applied: applied.length,
      skipped: skipped.length,
      failed: failed.length
    });
    const rollbackMessage = buildRollbackMessage(rollbackStatus, {
      applied: applied.length,
      skipped: skipped.length,
      failed: failed.length
    });
    const updatedRun = new WorkflowRepository(this.connection).updateRunRollback({
      id: run.id,
      rollbackStatus,
      rollbackActivityIdsJson: JSON.stringify(applied.map((result) => result.activityId).filter(Boolean)),
      rollbackStartedAt: startedAt,
      rollbackCompletedAt: completedAt,
      rollbackErrorMessage:
        rollbackStatus === "completed" ? null : rollbackMessage
    });

    this.logRollbackEvent({
      run: updatedRun,
      rollbackStatus,
      rollbackMessage,
      actorType: input.actorType ?? "local_user",
      timestamp: completedAt,
      applied,
      skipped,
      failed
    });

    return {
      run: updatedRun,
      status: rollbackStatus,
      applied,
      skipped,
      failed,
      activityIds
    };
  }

  private toHistoryEntry(run: WorkflowRunRecord): WorkflowRunHistoryEntry {
    const actions = parseActionResults(run.actionResultsJson).map((action) =>
      this.toHistoryAction(action)
    );
    const diagnostics = this.toDiagnostics(run, actions);

    return { run, actions, diagnostics };
  }

  private toHistoryAction(
    action: WorkflowActionExecutionResult
  ): WorkflowRunHistoryAction {
    const activityIds = Array.isArray(action.activityIds)
      ? action.activityIds.filter(isNonEmptyString)
      : [];
    const undoableActivityIds = activityIds.filter(
      (activityId) => this.getUndoableOperation(activityId) !== null
    );
    const diagnostics: string[] = [];

    if (action.status === "completed" && activityIds.length === 0) {
      diagnostics.push("No activity IDs were captured for this action.");
    }

    if (activityIds.length > 0 && undoableActivityIds.length === 0) {
      diagnostics.push("Captured activities are not undoable by the current undo service.");
    }

    return {
      index: action.index,
      actionType: action.actionType,
      status: action.status,
      summary: action.summary,
      targetType: action.targetType,
      targetId: action.targetId,
      activityIds,
      undoableActivityIds,
      diagnostics
    };
  }

  private toDiagnostics(
    run: WorkflowRunRecord,
    actions: WorkflowRunHistoryAction[]
  ): WorkflowRunDiagnostics {
    const issues: string[] = [];
    const undoableActivityIds = uniqueStrings(
      actions.flatMap((action) => action.undoableActivityIds)
    );
    const completedActionCount = actions.filter(
      (action) => action.status === "completed"
    ).length;
    const skippedActionCount = actions.filter(
      (action) => action.status === "skipped"
    ).length;

    if (run.status === "failed" && run.errorMessage !== null) {
      issues.push(run.errorMessage);
    }

    for (const action of actions) {
      for (const diagnostic of action.diagnostics) {
        issues.push(`Action ${action.index + 1}: ${diagnostic}`);
      }
    }

    if (run.status === "completed" && undoableActivityIds.length === 0) {
      issues.push("Run completed but has no undoable captured activities.");
    }

    return {
      runId: run.id,
      workflowDefinitionId: run.workflowDefinitionId,
      status: run.status,
      triggerType: run.triggerType,
      errorMessage: run.errorMessage,
      canRollback:
        run.status === "completed" &&
        undoableActivityIds.length > 0 &&
        run.rollbackStatus !== "completed",
      rollbackStatus: run.rollbackStatus,
      actionCount: actions.length,
      completedActionCount,
      failedActionCount: run.status === "failed" ? 1 : 0,
      skippedActionCount,
      undoableActivityIds,
      issues: uniqueStrings(issues)
    };
  }

  private getUndoableOperation(activityId: string): UndoableOperation | null {
    try {
      return new UndoService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).getUndoableOperation(activityId);
    } catch {
      return null;
    }
  }

  private requireRun(id: string): WorkflowRunRecord {
    const run = new WorkflowRepository(this.connection).getRunById(id);

    if (run === null) {
      throw new Error(`Workflow run was not found: ${id}.`);
    }

    return run;
  }

  private logRollbackEvent(input: {
    run: WorkflowRunRecord;
    rollbackStatus: WorkflowRunRollbackStatus;
    rollbackMessage: string;
    actorType: ActivityActorType;
    timestamp: string;
    applied: UndoApplyResult[];
    skipped: WorkflowRunRollbackResult["skipped"];
    failed: WorkflowRunRollbackResult["failed"];
  }): ActivityLogRecord {
    return new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.run.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.workflowRunRolledBack,
      targetType: "workflow",
      targetId: input.run.workflowDefinitionId ?? input.run.id,
      summary: input.rollbackMessage,
      beforeJson: JSON.stringify({ run: input.run }),
      afterJson: JSON.stringify({
        runId: input.run.id,
        rollbackStatus: input.rollbackStatus,
        appliedActivityIds: input.applied.map((result) => result.activityId),
        skipped: input.skipped,
        failed: input.failed
      }),
      timestamp: input.timestamp
    });
  }
}

function parseActionResults(json: string): WorkflowActionExecutionResult[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isWorkflowActionExecutionResult);
  } catch {
    return [];
  }
}

function isWorkflowActionExecutionResult(
  value: unknown
): value is WorkflowActionExecutionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { index?: unknown }).index === "number" &&
    typeof (value as { actionType?: unknown }).actionType === "string" &&
    typeof (value as { status?: unknown }).status === "string" &&
    typeof (value as { summary?: unknown }).summary === "string" &&
    typeof (value as { targetType?: unknown }).targetType === "string" &&
    ("targetId" in value
      ? typeof (value as { targetId?: unknown }).targetId === "string" ||
        (value as { targetId?: unknown }).targetId === null
      : true)
  );
}

function resolveRollbackStatus(input: {
  attempted: number;
  applied: number;
  skipped: number;
  failed: number;
}): WorkflowRunRollbackStatus {
  if (input.attempted === 0 || (input.applied === 0 && input.failed === 0)) {
    return "not_available";
  }

  if (input.failed === 0 && input.skipped === 0) {
    return "completed";
  }

  if (input.applied > 0) {
    return "partial";
  }

  return "failed";
}

function buildRollbackMessage(
  status: WorkflowRunRollbackStatus,
  counts: { applied: number; skipped: number; failed: number }
): string {
  if (status === "completed") {
    return `Rolled back workflow run (${counts.applied} undo operations).`;
  }

  if (status === "not_available") {
    return "Workflow run rollback is not available because no undoable activities were captured.";
  }

  if (status === "partial") {
    return `Partially rolled back workflow run (${counts.applied} applied, ${counts.skipped} skipped, ${counts.failed} failed).`;
  }

  return `Workflow run rollback failed (${counts.failed} failed, ${counts.skipped} skipped).`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}
