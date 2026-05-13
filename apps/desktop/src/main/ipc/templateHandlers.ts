import {
  ContainerTemplateService,
  TemplateService,
  TemplateExportService,
  TemplatePackImportValidator,
  type ContactRecord,
  type ProjectRecord,
  type TemplatePackFileExportResult as FeatureTemplatePackFileExportResult,
  type TemplatePackImportResult as FeatureTemplatePackImportResult,
  type TemplatePackImportValidationSummary as FeatureTemplatePackImportValidationSummary
} from "@local-work-os/features";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
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
  type DeleteTemplateInput,
  type DuplicateTemplateInput,
  type ExportTemplatePackInput,
  type ImportTemplatePackInput,
  type ProjectSummary,
  type SaveContainerAsTemplateInput,
  type TemplatePackExportSummary,
  type TemplatePackImportSummary,
  type TemplatePackValidationSummary,
  type TemplateSummary,
  type UpdateTemplateInput,
  type ValidateTemplatePackInput,
  type WorkspaceSummary
} from "../../preload/api";
import {
  ensureDirectoryInsideWorkspace,
  normalizeLocalPath,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../services/safeFileSystem";
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
  handleUpdateTemplate: (input: unknown) => Promise<ApiResult<TemplateSummary>>;
  handleDuplicateTemplate: (input: unknown) => Promise<ApiResult<TemplateSummary>>;
  handleDeleteTemplate: (input: unknown) => Promise<ApiResult<TemplateSummary>>;
  handleExportTemplatePack: (
    input: unknown
  ) => Promise<ApiResult<TemplatePackExportSummary>>;
  handleValidateTemplatePack: (
    input: unknown
  ) => Promise<ApiResult<TemplatePackValidationSummary>>;
  handleImportTemplatePack: (
    input: unknown
  ) => Promise<ApiResult<TemplatePackImportSummary>>;
  handleChooseAndImportTemplatePack: (
    input: unknown
  ) => Promise<ApiResult<TemplatePackImportSummary | null>>;
};

export type TemplateIpcPlatform = {
  chooseTemplatePackPath: () => Promise<string | null>;
};

export function createTemplateIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: TemplateIpcPlatform = {
    chooseTemplatePackPath: async () => null
  }
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
          context.libraryService
            .listTemplates({
              workspaceId,
              ...(typeof input === "object" && input?.kind !== undefined
                ? { kind: input.kind }
                : {})
            })
            .map(toTemplateSummary)
        );
      });
    },

    async handleUpdateTemplate(input) {
      if (!isUpdateTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateTemplate requires templateId and name fields."
        );
      }

      return await withTemplateService(workspaceService, async (context) =>
        apiOk(toTemplateSummary(await context.libraryService.updateTemplate(input)))
      );
    },

    async handleDuplicateTemplate(input) {
      if (!isDuplicateTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "duplicateTemplate requires a templateId field."
        );
      }

      return await withTemplateService(workspaceService, async (context) =>
        apiOk(toTemplateSummary(await context.libraryService.duplicateTemplate(input)))
      );
    },

    async handleDeleteTemplate(input) {
      if (!isDeleteTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "deleteTemplate requires a templateId field."
        );
      }

      return await withTemplateService(workspaceService, async (context) =>
        apiOk(toTemplateSummary(await context.libraryService.deleteTemplate(input)))
      );
    },

    async handleExportTemplatePack(input) {
      if (!isOptionalExportTemplatePackInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "exportTemplatePack accepts optional workspaceId, templateIds, name, and description fields."
        );
      }

      return await withTemplateService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const exportService = createTemplateExportService(context.connection, context.workspace);
        const result = await exportService.exportTemplatePackFile({
          workspaceId,
          ...(input?.templateIds === undefined ? {} : { templateIds: input.templateIds }),
          ...(input?.name === undefined ? {} : { name: input.name }),
          ...(input?.description === undefined ? {} : { description: input.description }),
          ...(input?.actorType === undefined ? {} : { actorType: input.actorType })
        });

        return apiOk(toTemplatePackExportSummary(result));
      });
    },

    async handleValidateTemplatePack(input) {
      if (!isValidateTemplatePackInput(input)) {
        return apiError("INVALID_INPUT", "validateTemplatePack requires a filePath string.");
      }

      return await validateTemplatePackFile(input.filePath);
    },

    async handleImportTemplatePack(input) {
      if (!isImportTemplatePackInput(input)) {
        return apiError("INVALID_INPUT", "importTemplatePack requires a filePath string.");
      }

      return await importTemplatePackFile(workspaceService, input);
    },

    async handleChooseAndImportTemplatePack(input) {
      if (!isOptionalChooseAndImportTemplatePackInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "chooseAndImportTemplatePack accepts an optional workspaceId field."
        );
      }

      const filePath = await platform.chooseTemplatePackPath();

      if (filePath === null) {
        return apiOk(null);
      }

      return await importTemplatePackFile(workspaceService, {
        ...(input?.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        filePath
      });
    }
  };
}

async function withTemplateService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    templateService: ContainerTemplateService;
    libraryService: TemplateService;
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
      libraryService: new TemplateService({ connection }),
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

function createTemplateExportService(
  connection: DatabaseConnection,
  workspace: WorkspaceSummary
): TemplateExportService {
  return new TemplateExportService({
    connection,
    fileSystem: {
      async writeTemplatePackFile({ exportRelativePath, contents }) {
        await ensureDirectoryInsideWorkspace(workspace.rootPath, "exports");
        await writeTextFileInsideWorkspace(workspace.rootPath, exportRelativePath, contents);

        return {
          sizeBytes: (await stat(resolveInsideWorkspace(workspace.rootPath, exportRelativePath))).size
        };
      },
      async writeTextExport({ exportRelativePath, contents }) {
        await ensureDirectoryInsideWorkspace(workspace.rootPath, "exports");
        await writeTextFileInsideWorkspace(workspace.rootPath, exportRelativePath, contents);

        return {
          sizeBytes: (await stat(resolveInsideWorkspace(workspace.rootPath, exportRelativePath))).size
        };
      }
    }
  });
}

async function validateTemplatePackFile(
  inputPath: string
): Promise<ApiResult<TemplatePackValidationSummary>> {
  try {
    const filePath = normalizeLocalPath(inputPath);

    if (extname(filePath).toLowerCase() !== ".lwo-template-pack") {
      return apiError(
        "INVALID_INPUT",
        "Template pack validation requires a .lwo-template-pack file."
      );
    }

    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      return apiError("INVALID_INPUT", "Template pack path must be a file.");
    }

    const summary = await new TemplatePackImportValidator({
      fileSystem: {
        readTextFile: async () => readFile(filePath, "utf8")
      }
    }).validateTemplatePackFile(filePath);

    return apiOk(toTemplatePackValidationSummary(summary));
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Template pack validation failed."
    );
  }
}

async function importTemplatePackFile(
  workspaceService: CurrentWorkspaceService,
  input: ImportTemplatePackInput
): Promise<ApiResult<TemplatePackImportSummary>> {
  const validated = await validateTemplatePackFile(input.filePath);

  if (!validated.ok) {
    return validated;
  }

  return await withTemplateService(workspaceService, async (context) => {
    const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
    const filePath = normalizeLocalPath(input.filePath);
    const fileData = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    const result = await createTemplateExportService(
      context.connection,
      context.workspace
    ).importTemplatePackFile({
      workspaceId,
      fileData,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });

    return apiOk(toTemplatePackImportSummary(result));
  });
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

function toTemplatePackExportSummary(
  result: FeatureTemplatePackFileExportResult
): TemplatePackExportSummary {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    createdAt: result.createdAt,
    relativePath: result.relativePath,
    sizeBytes: result.sizeBytes,
    fileVersion: result.fileVersion,
    name: result.name,
    templateCount: result.templateCount,
    templateIds: result.templateIds
  };
}

function toTemplatePackValidationSummary(
  summary: FeatureTemplatePackImportValidationSummary
): TemplatePackValidationSummary {
  return {
    valid: summary.valid,
    sourcePath: summary.sourcePath,
    fileVersion: summary.fileVersion,
    exportedAt: summary.exportedAt,
    name: summary.name,
    description: summary.description,
    templateCount: summary.templateCount,
    capabilities: summary.capabilities,
    counts: summary.counts,
    templates: summary.templates.map((template) => ({
      valid: template.valid,
      kind: template.kind,
      name: template.name,
      description: template.description,
      counts: template.counts,
      issues: template.issues
    })),
    issues: summary.issues
  };
}

function toTemplatePackImportSummary(
  result: FeatureTemplatePackImportResult
): TemplatePackImportSummary {
  return {
    workspaceId: result.workspaceId,
    importedAt: result.importedAt,
    templateCount: result.templateCount,
    importedTemplates: result.importedTemplates.map(toTemplateSummary)
  };
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
    hiddenAt: tab.hiddenAt,
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
): input is { workspaceId?: string; kind?: "list" | "project" | "contact" } | string | undefined {
  return (
    input === undefined ||
    isNonEmptyString(input) ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      (input.kind === undefined ||
        input.kind === "list" ||
        input.kind === "project" ||
        input.kind === "contact"))
  );
}

function isUpdateTemplateInput(input: unknown): input is UpdateTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.templateId) &&
    isNonEmptyString(input.name) &&
    (input.description === undefined ||
      input.description === null ||
      typeof input.description === "string")
  );
}

function isDuplicateTemplateInput(input: unknown): input is DuplicateTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.templateId) &&
    isOptionalString(input.name)
  );
}

function isDeleteTemplateInput(input: unknown): input is DeleteTemplateInput {
  return isRecord(input) && isNonEmptyString(input.templateId);
}

function isOptionalExportTemplatePackInput(
  input: unknown
): input is ExportTemplatePackInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      (input.templateIds === undefined ||
        (Array.isArray(input.templateIds) &&
          input.templateIds.every((templateId) => isNonEmptyString(templateId)))) &&
      isOptionalString(input.name) &&
      (input.description === undefined ||
        input.description === null ||
        typeof input.description === "string") &&
      isOptionalActorType(input.actorType))
  );
}

function isValidateTemplatePackInput(input: unknown): input is ValidateTemplatePackInput {
  return isRecord(input) && isNonEmptyString(input.filePath);
}

function isImportTemplatePackInput(input: unknown): input is ImportTemplatePackInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.filePath) &&
    isOptionalString(input.workspaceId) &&
    isOptionalActorType(input.actorType)
  );
}

function isOptionalChooseAndImportTemplatePackInput(
  input: unknown
): input is { workspaceId?: string } | undefined {
  return input === undefined || (isRecord(input) && isOptionalString(input.workspaceId));
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
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
