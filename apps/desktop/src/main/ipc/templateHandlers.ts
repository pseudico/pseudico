import {
  ContainerTemplateService,
  type ContactRecord,
  type ProjectRecord
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ContainerTabRecord,
  type DatabaseConnection,
  type TemplateRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ContainerTabSummary,
  type ContainerTemplateCreationSummary,
  type ContactSummary,
  type CreateContainerFromTemplateInput,
  type ProjectSummary,
  type SaveContainerAsTemplateInput,
  type TemplateSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type TemplateIpcHandlers = {
  handleSaveContainerAsTemplate: (
    input: unknown
  ) => Promise<ApiResult<TemplateSummary>>;
  handleCreateContainerFromTemplate: (
    input: unknown
  ) => Promise<ApiResult<ContainerTemplateCreationSummary>>;
  handleListTemplates: (input: unknown) => Promise<ApiResult<TemplateSummary[]>>;
};

export function createTemplateIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TemplateIpcHandlers {
  return {
    async handleSaveContainerAsTemplate(input) {
      if (!isSaveContainerAsTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "saveContainerAsTemplate requires a containerId field."
        );
      }

      return await withTemplateService(workspaceService, async (context) =>
        apiOk(
          toTemplateSummary(
            await context.templateService.saveContainerAsTemplate(input)
          )
        )
      );
    },

    async handleCreateContainerFromTemplate(input) {
      if (!isCreateContainerFromTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createContainerFromTemplate requires a templateId field."
        );
      }

      return await withTemplateService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.templateService.createContainerFromTemplate({
          ...input,
          workspaceId
        });
        const container =
          "project" in result.container
            ? toProjectSummary(result.container.project)
            : toContactSummary(result.container.contact);

        return apiOk({
          template: toTemplateSummary(result.template),
          container,
          tabs: result.tabs.map(toContainerTabSummary),
          itemIds: result.items.map((item) => item.id)
        });
      });
    },

    async handleListTemplates(input) {
      if (!isListTemplatesInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTemplates accepts an optional workspaceId string or template filter object."
        );
      }

      return await withTemplateService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          typeof input === "string" ? input : input?.workspaceId,
          context.workspace
        );

        return apiOk(
          context.templateService
            .listTemplates({
              workspaceId,
              ...(typeof input === "object" && input?.kind !== undefined
                ? { kind: input.kind }
                : {})
            })
            .map(toTemplateSummary)
        );
      });
    }
  };
}

async function withTemplateService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    templateService: ContainerTemplateService;
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
      templateService: new ContainerTemplateService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Template operation failed."
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
    throw new Error("Template workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toTemplateSummary(template: TemplateRecord): TemplateSummary {
  return {
    id: template.id,
    workspaceId: template.workspaceId,
    kind: template.kind,
    name: template.name,
    description: template.description,
    sourceType: template.sourceType,
    sourceId: template.sourceId,
    templateJson: template.templateJson,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    deletedAt: template.deletedAt
  };
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

function toContactSummary(contact: ContactRecord): ContactSummary {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: "contact",
    name: contact.name,
    slug: contact.slug,
    description: contact.description,
    status: contact.status,
    categoryId: contact.categoryId,
    color: contact.color,
    isFavorite: contact.isFavorite,
    sortOrder: contact.sortOrder,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    archivedAt: contact.archivedAt,
    deletedAt: contact.deletedAt
  };
}

function toContainerTabSummary(tab: ContainerTabRecord): ContainerTabSummary {
  return {
    id: tab.id,
    workspaceId: tab.workspaceId,
    containerId: tab.containerId,
    name: tab.name,
    description: tab.description,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
    archivedAt: tab.archivedAt,
    deletedAt: tab.deletedAt
  };
}

function isSaveContainerAsTemplateInput(
  input: unknown
): input is SaveContainerAsTemplateInput {
  return isRecord(input) && isNonEmptyString(input.containerId);
}

function isCreateContainerFromTemplateInput(
  input: unknown
): input is CreateContainerFromTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.templateId) &&
    isOptionalString(input.workspaceId) &&
    isOptionalString(input.name)
  );
}

function isListTemplatesInput(
  input: unknown
): input is { workspaceId?: string; kind?: "project" | "contact" } | string | undefined {
  return (
    input === undefined ||
    isNonEmptyString(input) ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      (input.kind === undefined || input.kind === "project" || input.kind === "contact"))
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
