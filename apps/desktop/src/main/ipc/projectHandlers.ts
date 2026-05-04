import {
  ProjectHealthService,
  ProjectService,
  type ActivityEventView,
  type ProjectHealthSummary as FeatureProjectHealthSummary,
  type ProjectRecord
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ActivitySummary,
  type CreateProjectInput,
  type CreateProjectResult,
  type ProjectHealthSummary,
  type ProjectSummary,
  type UpdateProjectInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type ProjectIpcHandlers = {
  handleCreateProject: (
    input: unknown
  ) => Promise<ApiResult<CreateProjectResult>>;
  handleUpdateProject: (
    input: unknown
  ) => Promise<ApiResult<ProjectSummary>>;
  handleArchiveProject: (input: unknown) => Promise<ApiResult<ProjectSummary>>;
  handleSoftDeleteProject: (
    input: unknown
  ) => Promise<ApiResult<ProjectSummary>>;
  handleListProjects: (
    input: unknown
  ) => Promise<ApiResult<ProjectSummary[]>>;
  handleGetProject: (
    input: unknown
  ) => Promise<ApiResult<ProjectSummary | null>>;
  handleGetProjectHealth: (
    input: unknown
  ) => Promise<ApiResult<ProjectHealthSummary>>;
};

export function createProjectIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ProjectIpcHandlers {
  return {
    async handleCreateProject(input) {
      if (!isCreateProjectInput(input)) {
        return apiError("INVALID_INPUT", "createProject requires a name field.");
      }

      return await withProjectService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.projectService.createProject({
          ...input,
          workspaceId
        });

        return apiOk({
          project: toProjectSummary(result.project),
          defaultTabId: result.defaultTab.id
        });
      });
    },

    async handleUpdateProject(input) {
      if (!isUpdateProjectInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateProject requires a projectId and at least one update field."
        );
      }

      return await withProjectService(workspaceService, async (context) =>
        apiOk(
          toProjectSummary(await context.projectService.updateProject(input))
        )
      );
    },

    async handleArchiveProject(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "archiveProject requires a projectId string."
        );
      }

      return await withProjectService(workspaceService, async (context) =>
        apiOk(
          toProjectSummary(await context.projectService.archiveProject(input))
        )
      );
    },

    async handleSoftDeleteProject(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "softDeleteProject requires a projectId string."
        );
      }

      return await withProjectService(workspaceService, async (context) =>
        apiOk(
          toProjectSummary(await context.projectService.softDeleteProject(input))
        )
      );
    },

    async handleListProjects(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listProjects requires an optional workspaceId string."
        );
      }

      return await withProjectService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.projectService.listProjects(workspaceId).map(toProjectSummary)
        );
      });
    },

    async handleGetProject(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getProject requires a projectId string."
        );
      }

      return await withProjectService(workspaceService, async (context) => {
        const project = context.projectService.getProject(input);

        return apiOk(project === null ? null : toProjectSummary(project));
      });
    },

    async handleGetProjectHealth(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getProjectHealth requires a projectId string."
        );
      }

      return await withProjectService(workspaceService, async (context) =>
        apiOk(toProjectHealthSummary(
          new ProjectHealthService({
            connection: context.connection
          }).getProjectHealth(input)
        ))
      );
    }
  };
}

async function withProjectService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    projectService: ProjectService;
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
      projectService: new ProjectService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Project operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Project workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toProjectSummary(project: ProjectRecord): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    type: "project",
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    categoryId: project.categoryId,
    color: project.color,
    isFavorite: project.isFavorite,
    sortOrder: project.sortOrder,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
    deletedAt: project.deletedAt
  };
}

function toProjectHealthSummary(
  summary: FeatureProjectHealthSummary
): ProjectHealthSummary {
  return {
    ...summary,
    recentActivity: summary.recentActivity.map(toActivitySummary)
  };
}

function toActivitySummary(activity: ActivityEventView): ActivitySummary {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    actorType: activity.actorType,
    action: activity.action,
    targetType: activity.targetType,
    targetId: activity.targetId,
    summary: activity.summary,
    beforeJson: activity.beforeJson,
    afterJson: activity.afterJson,
    createdAt: activity.createdAt,
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    description: activity.description
  };
}

function isCreateProjectInput(input: unknown): input is CreateProjectInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.name) &&
    isOptionalString(input.workspaceId) &&
    isOptionalString(input.slug)
  );
}

function isUpdateProjectInput(input: unknown): input is UpdateProjectInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.projectId) &&
    (input.name === undefined || isNonEmptyString(input.name)) &&
    isOptionalString(input.slug) &&
    (input.status === undefined || isMutableProjectStatus(input.status)) &&
    hasUpdateField(input)
  );
}

function hasUpdateField(input: Record<string, unknown>): boolean {
  return [
    "categoryId",
    "color",
    "description",
    "isFavorite",
    "name",
    "slug",
    "sortOrder",
    "status"
  ].some((field) => input[field] !== undefined);
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

function isMutableProjectStatus(value: unknown): boolean {
  return value === "active" || value === "waiting" || value === "completed";
}
