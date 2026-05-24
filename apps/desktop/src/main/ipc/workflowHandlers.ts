import { GuidedWorkflowService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ExecuteGuidedWorkflowInput,
  type GuidedWorkflowExecutionSummary,
  type GuidedWorkflowPreviewSummary,
  type GuidedWorkflowRunHistoryEntrySummary,
  type GuidedWorkflowTemplateId,
  type GuidedWorkflowTemplateSummary,
  type ListGuidedWorkflowRunsInput,
  type PreviewGuidedWorkflowInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type WorkflowIpcHandlers = {
  handleListTemplates: () => Promise<ApiResult<GuidedWorkflowTemplateSummary[]>>;
  handlePreview: (input: unknown) => Promise<ApiResult<GuidedWorkflowPreviewSummary>>;
  handleExecute: (input: unknown) => Promise<ApiResult<GuidedWorkflowExecutionSummary>>;
  handleListRuns: (input: unknown) => Promise<ApiResult<GuidedWorkflowRunHistoryEntrySummary[]>>;
};

export function createWorkflowIpcHandlers(
  workspaceService: CurrentWorkspaceService
): WorkflowIpcHandlers {
  return {
    async handleListTemplates() {
      return await withGuidedWorkflowService(workspaceService, async (context) =>
        apiOk(context.service.listTemplates().map(toTemplateSummary))
      );
    },

    async handlePreview(input) {
      if (!isPreviewInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "preview guided workflow requires a supported templateId and optional projectId/contactId."
        );
      }

      return await withGuidedWorkflowService(workspaceService, async (context) =>
        apiOk(
          toPreviewSummary(
            context.service.preview({
              ...input,
              workspaceId: context.workspace.id
            })
          )
        )
      );
    },

    async handleExecute(input) {
      if (!isExecuteInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "execute guided workflow requires templateId and confirmed: true."
        );
      }

      return await withGuidedWorkflowService(workspaceService, async (context) => {
        const result = await context.service.execute({
          ...input,
          workspaceId: context.workspace.id,
          actorType: "local_user"
        });
        return apiOk({
          preview: toPreviewSummary(result.preview),
          runId: result.run.id,
          status: result.status,
          summary: result.summary,
          partialFailure: result.partialFailure,
          createdLinks: result.createdLinks,
          actionResults: result.actionResults,
          errorMessage: result.errorMessage,
          completedAt: result.run.completedAt
        });
      });
    },

    async handleListRuns(input) {
      if (!isListRunsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "list guided workflow runs accepts optional workspaceId and limit fields."
        );
      }

      return await withGuidedWorkflowService(workspaceService, async (context) =>
        apiOk(
          context.service.listRunHistory({
            workspaceId: context.workspace.id,
            ...(input?.limit === undefined ? {} : { limit: input.limit })
          })
        )
      );
    }
  };
}

async function withGuidedWorkflowService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: GuidedWorkflowService;
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
      service: new GuidedWorkflowService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Guided workflow operation failed."
    );
  } finally {
    connection.close();
  }
}

function toTemplateSummary(template: {
  id: GuidedWorkflowTemplateId;
  name: string;
  purpose: string;
  safeSummary: string;
  fields: GuidedWorkflowTemplateSummary["fields"];
  creates: readonly string[];
  doesNotDo: readonly string[];
}): GuidedWorkflowTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    purpose: template.purpose,
    safeSummary: template.safeSummary,
    fields: template.fields.map((field) => ({ ...field })),
    creates: [...template.creates],
    doesNotDo: [...template.doesNotDo]
  };
}

function toPreviewSummary(preview: {
  workspaceId: string;
  template: Parameters<typeof toTemplateSummary>[0];
  projectId: string;
  projectName: string | null;
  contactId: string | null;
  contactName: string | null;
  canRun: boolean;
  issues: string[];
  plannedChanges: GuidedWorkflowPreviewSummary["plannedChanges"];
  confirmationLabel: string;
}): GuidedWorkflowPreviewSummary {
  return {
    workspaceId: preview.workspaceId,
    template: toTemplateSummary(preview.template),
    projectId: preview.projectId,
    projectName: preview.projectName,
    contactId: preview.contactId,
    contactName: preview.contactName,
    canRun: preview.canRun,
    issues: [...preview.issues],
    plannedChanges: preview.plannedChanges.map((change) => ({
      ...change,
      tags: [...change.tags]
    })),
    confirmationLabel: preview.confirmationLabel
  };
}

function isPreviewInput(value: unknown): value is PreviewGuidedWorkflowInput {
  if (!isRecord(value) || !isTemplateId(value.templateId)) {
    return false;
  }

  return optionalString(value.workspaceId) &&
    optionalString(value.projectId) &&
    optionalString(value.contactId);
}

function isExecuteInput(value: unknown): value is ExecuteGuidedWorkflowInput {
  return isRecord(value) &&
    value.confirmed === true &&
    isPreviewInput(value);
}

function isListRunsInput(value: unknown): value is ListGuidedWorkflowRunsInput | undefined {
  if (value === undefined) {
    return true;
  }

  return isRecord(value) &&
    optionalString(value.workspaceId) &&
    (value.limit === undefined || (typeof value.limit === "number" && Number.isFinite(value.limit)));
}

function isTemplateId(value: unknown): value is GuidedWorkflowTemplateId {
  return value === "house_project_review" ||
    value === "house_contact_follow_up" ||
    value === "house_approval_decision_review";
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
