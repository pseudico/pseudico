import { ReminderService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type ReminderEventRecord,
  type ReminderPolicyRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ClearTaskReminderInput,
  type DismissReminderInput,
  type ReminderEventMutationSummary,
  type ReminderEventSummary,
  type ReminderPolicySummary,
  type SetTaskReminderInput,
  type SnoozeReminderInput,
  type TaskReminderMutationSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;

type ReminderIpcHandlers = {
  handleSetTaskReminder: (input: unknown) => Promise<ApiResult<TaskReminderMutationSummary>>;
  handleClearTaskReminder: (input: unknown) => Promise<ApiResult<TaskReminderMutationSummary>>;
  handleDismissReminder: (input: unknown) => Promise<ApiResult<ReminderEventMutationSummary>>;
  handleSnoozeReminder: (input: unknown) => Promise<ApiResult<ReminderEventMutationSummary>>;
};

export function createReminderIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ReminderIpcHandlers {
  return {
    async handleSetTaskReminder(input) {
      if (!isSetTaskReminderInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "setTaskReminder requires taskId and either triggerAt or leadMinutes."
        );
      }

      return await withReminderService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.reminderService.setTaskReminder({
          ...input,
          workspaceId
        });
        return apiOk(toTaskReminderMutationSummary(result));
      });
    },

    async handleClearTaskReminder(input) {
      if (!isClearTaskReminderInput(input)) {
        return apiError("INVALID_INPUT", "clearTaskReminder requires a taskId.");
      }

      return await withReminderService(workspaceService, async (context) => {
        const result = await context.reminderService.clearTaskReminder(input);
        return apiOk(toTaskReminderMutationSummary(result));
      });
    },

    async handleDismissReminder(input) {
      if (!isDismissReminderInput(input)) {
        return apiError("INVALID_INPUT", "dismissReminder requires an eventId.");
      }

      return await withReminderService(workspaceService, async (context) => {
        const result = await context.reminderService.dismissReminder(input);
        return apiOk(toReminderEventMutationSummary(result));
      });
    },

    async handleSnoozeReminder(input) {
      if (!isSnoozeReminderInput(input)) {
        return apiError("INVALID_INPUT", "snoozeReminder requires eventId and until.");
      }

      return await withReminderService(workspaceService, async (context) => {
        const result = await context.reminderService.snoozeReminder(input);
        return apiOk(toReminderEventMutationSummary(result));
      });
    }
  };
}

async function withReminderService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    reminderService: ReminderService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      reminderService: new ReminderService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Reminder operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (requestedWorkspaceId !== undefined && requestedWorkspaceId !== currentWorkspace.id) {
    throw new Error("Reminder workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toTaskReminderMutationSummary(input: {
  policy: ReminderPolicyRecord | null;
  event: ReminderEventRecord | null;
}): TaskReminderMutationSummary {
  return {
    policy: input.policy === null ? null : toReminderPolicySummary(input.policy),
    event: input.event === null ? null : toReminderEventSummary(input.event)
  };
}

function toReminderEventMutationSummary(input: {
  policy: ReminderPolicyRecord;
  event: ReminderEventRecord;
}): ReminderEventMutationSummary {
  return {
    policy: toReminderPolicySummary(input.policy),
    event: toReminderEventSummary(input.event)
  };
}

function toReminderPolicySummary(policy: ReminderPolicyRecord): ReminderPolicySummary {
  return { ...policy };
}

function toReminderEventSummary(event: ReminderEventRecord): ReminderEventSummary {
  return { ...event };
}

function isSetTaskReminderInput(input: unknown): input is SetTaskReminderInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.taskId) &&
    isOptionalActorType(input.actorType) &&
    (input.triggerAt === undefined || isNonEmptyString(input.triggerAt)) &&
    (input.leadMinutes === undefined || typeof input.leadMinutes === "number") &&
    ((input.triggerAt === undefined) !== (input.leadMinutes === undefined))
  );
}

function isClearTaskReminderInput(input: unknown): input is ClearTaskReminderInput {
  return isRecord(input) && isNonEmptyString(input.taskId) && isOptionalActorType(input.actorType);
}

function isDismissReminderInput(input: unknown): input is DismissReminderInput {
  return isRecord(input) && isNonEmptyString(input.eventId) && isOptionalActorType(input.actorType);
}

function isSnoozeReminderInput(input: unknown): input is SnoozeReminderInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.eventId) &&
    isNonEmptyString(input.until) &&
    isOptionalActorType(input.actorType)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalActorType(value: unknown): boolean {
  return value === undefined || value === "local_user" || value === "system" || value === "importer";
}
