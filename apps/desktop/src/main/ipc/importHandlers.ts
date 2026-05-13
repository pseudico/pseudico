import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createLocalId } from "@local-work-os/core";
import {
  CsvImportService,
  EmailImportService,
  InboxService,
  ImportValidationService
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
  type ChooseAndImportEmailsInput,
  type CsvImportExecuteFileInput,
  type CsvImportExecuteSummary,
  type CsvImportPreviewFileInput,
  type CsvImportPreviewSummary,
  type EmailImportPreviewSummary,
  type EmailTaskImportSummary,
  type ImportEmailsAsTasksInput,
  type ImportValidationSummary,
  type ValidateWorkspaceExportJsonInput
} from "../../preload/api";
import {
  copyFileIntoWorkspace,
  normalizeLocalPath
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type ImportIpcHandlers = {
  handleValidateWorkspaceExportJson: (
    input: unknown
  ) => Promise<ApiResult<ImportValidationSummary>>;
  handleChooseAndValidateWorkspaceExportJson: () => Promise<
    ApiResult<ImportValidationSummary | null>
  >;
  handlePreviewEmails: (
    input: unknown
  ) => Promise<ApiResult<EmailImportPreviewSummary[]>>;
  handleImportEmailsAsTasks: (
    input: unknown
  ) => Promise<ApiResult<EmailTaskImportSummary>>;
  handleChooseAndImportEmailsAsTasks: (
    input: unknown
  ) => Promise<ApiResult<EmailTaskImportSummary | null>>;
  handlePreviewDelimitedFileImport: (
    input: unknown
  ) => Promise<ApiResult<CsvImportPreviewSummary>>;
  handleImportDelimitedFile: (
    input: unknown
  ) => Promise<ApiResult<CsvImportExecuteSummary>>;
};

export type ImportIpcPlatform = {
  chooseExportJsonPath: () => Promise<string | null>;
  chooseEmailImportPath?: () => Promise<string | null>;
};

export function createImportIpcHandlers(
  workspaceServiceOrPlatform?: CurrentWorkspaceService | ImportIpcPlatform,
  maybePlatform?: ImportIpcPlatform
): ImportIpcHandlers {
  const workspaceService: CurrentWorkspaceService =
    workspaceServiceOrPlatform !== undefined &&
    "getCurrentWorkspace" in workspaceServiceOrPlatform
      ? workspaceServiceOrPlatform
      : { getCurrentWorkspace: () => null };
  const platform: ImportIpcPlatform = maybePlatform ??
    (workspaceServiceOrPlatform !== undefined &&
    "chooseExportJsonPath" in workspaceServiceOrPlatform
      ? workspaceServiceOrPlatform
      : {
    chooseExportJsonPath: async () => null,
    chooseEmailImportPath: async () => null
  });

  return {
    async handleValidateWorkspaceExportJson(input) {
      if (!isValidateWorkspaceExportJsonInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "validateWorkspaceExportJson requires a filePath string."
        );
      }

      return await validateFile(input.filePath);
    },

    async handleChooseAndValidateWorkspaceExportJson() {
      const filePath = await platform.chooseExportJsonPath();

      if (filePath === null) {
        return apiOk(null);
      }

      return await validateFile(filePath);
    },

    async handlePreviewEmails(input) {
      if (!isImportEmailsAsTasksInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "previewEmails requires a sourcePath and optional containerId."
        );
      }

      return await withEmailImportContext(
        workspaceService,
        input,
        async (context) => {
          const messages = await loadEmailSources(context.workspace.rootPath, {
            sourcePath: input.sourcePath,
            copyOriginals: false
          });
          const previews = context.emailImportService.previewMessages(messages);

          return apiOk(previews.map(toEmailImportPreviewSummary));
        }
      );
    },

    async handleImportEmailsAsTasks(input) {
      if (!isImportEmailsAsTasksInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "importEmailsAsTasks requires a sourcePath and optional containerId."
        );
      }

      return await withEmailImportContext(
        workspaceService,
        input,
        async (context) => {
          const containerId = resolveContainerId(input, context);
          const messages = await loadEmailSources(context.workspace.rootPath, {
            sourcePath: input.sourcePath,
            copyOriginals: true
          });
          const summary = await context.emailImportService.importMessagesAsTasks({
            workspaceId: context.workspace.id,
            containerId,
            messages,
            actorType: "importer",
            ...(input.extractTags === undefined
              ? {}
              : { extractTags: input.extractTags })
          });

          return apiOk(toEmailTaskImportSummary(summary));
        }
      );
    },

    async handleChooseAndImportEmailsAsTasks(input) {
      if (!isChooseAndImportEmailsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "chooseAndImportEmailsAsTasks accepts optional containerId and extractTags."
        );
      }

      const sourcePath = await (platform.chooseEmailImportPath?.() ?? null);

      if (sourcePath === null) {
        return apiOk(null);
      }

      return await this.handleImportEmailsAsTasks({
        ...(input ?? {}),
        sourcePath
      });
    },

    async handlePreviewDelimitedFileImport(input) {
      if (!isCsvImportPreviewFileInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "previewDelimitedFileImport requires filePath, targetType, and optional mapping."
        );
      }

      return await withCsvImportContext(
        workspaceService,
        input,
        async (context) => {
          const contents = await readDelimitedImportFile(input.filePath);
          const summary = context.csvImportService.previewImport({
            workspaceId: context.workspace.id,
            contents,
            targetType: input.targetType,
            ...(inferDelimitedFormat(input.filePath) === undefined
              ? {}
              : { format: inferDelimitedFormat(input.filePath)! }),
            ...(input.mapping === undefined ? {} : { mapping: input.mapping }),
            ...(input.conflictStrategy === undefined
              ? {}
              : { conflictStrategy: input.conflictStrategy }),
            ...(input.missingContainerStrategy === undefined
              ? {}
              : { missingContainerStrategy: input.missingContainerStrategy })
          });

          return apiOk(summary);
        }
      );
    },

    async handleImportDelimitedFile(input) {
      if (!isCsvImportExecuteFileInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "importDelimitedFile requires filePath, targetType, and optional mapping."
        );
      }

      return await withCsvImportContext(
        workspaceService,
        input,
        async (context) => {
          const contents = await readDelimitedImportFile(input.filePath);
          const summary = await context.csvImportService.executeImport({
            workspaceId: context.workspace.id,
            contents,
            targetType: input.targetType,
            actorType: "importer",
            ...(inferDelimitedFormat(input.filePath) === undefined
              ? {}
              : { format: inferDelimitedFormat(input.filePath)! }),
            ...(input.mapping === undefined ? {} : { mapping: input.mapping }),
            ...(input.conflictStrategy === undefined
              ? {}
              : { conflictStrategy: input.conflictStrategy }),
            ...(input.missingContainerStrategy === undefined
              ? {}
              : { missingContainerStrategy: input.missingContainerStrategy })
          });

          return apiOk(summary);
        }
      );
    }
  };
}

async function validateFile(
  inputPath: string
): Promise<ApiResult<ImportValidationSummary>> {
  try {
    const filePath = normalizeLocalPath(inputPath);

    if (extname(filePath).toLowerCase() !== ".json") {
      return apiError("INVALID_INPUT", "Import validation requires a JSON file.");
    }

    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      return apiError("INVALID_INPUT", "Import validation path must be a file.");
    }

    const summary = await new ImportValidationService({
      fileSystem: {
        readTextFile: async () => readFile(filePath, "utf8")
      }
    }).validateWorkspaceExportJson(filePath);

    return apiOk(summary);
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Import validation failed."
    );
  }
}

async function withEmailImportContext<T>(
  workspaceService: CurrentWorkspaceService,
  input: ImportEmailsAsTasksInput,
  operation: (context: {
    connection: DatabaseConnection;
    emailImportService: EmailImportService;
    inboxService: InboxService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  if (
    input.workspaceId !== undefined &&
    input.workspaceId !== workspace.id
  ) {
    return apiError(
      "WORKSPACE_ERROR",
      "Email import workspaceId must match the current workspace."
    );
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      emailImportService: new EmailImportService({ connection }),
      inboxService: new InboxService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Email import failed."
    );
  } finally {
    connection.close();
  }
}

async function withCsvImportContext<T>(
  workspaceService: CurrentWorkspaceService,
  input: CsvImportPreviewFileInput,
  operation: (context: {
    connection: DatabaseConnection;
    csvImportService: CsvImportService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  if (
    input.workspaceId !== undefined &&
    input.workspaceId !== workspace.id
  ) {
    return apiError(
      "WORKSPACE_ERROR",
      "CSV import workspaceId must match the current workspace."
    );
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      csvImportService: new CsvImportService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "CSV import failed."
    );
  } finally {
    connection.close();
  }
}

async function readDelimitedImportFile(filePathInput: string): Promise<string> {
  const filePath = normalizeLocalPath(filePathInput);
  const extension = extname(filePath).toLowerCase();

  if (extension !== ".csv" && extension !== ".tsv") {
    throw new Error("CSV/TSV import requires a .csv or .tsv file.");
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    throw new Error("CSV/TSV import path must be a file.");
  }

  return await readFile(filePath, "utf8");
}

function inferDelimitedFormat(filePath: string): "csv" | "tsv" | undefined {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return "csv";
  }
  if (extension === ".tsv") {
    return "tsv";
  }
  return undefined;
}

function resolveContainerId(
  input: ImportEmailsAsTasksInput,
  context: {
    inboxService: InboxService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
  }
): string {
  if (input.containerId !== undefined) {
    return input.containerId;
  }

  return context.inboxService.getInbox(context.workspace.id).id;
}

async function loadEmailSources(
  workspaceRootPath: string,
  input: {
    sourcePath: string;
    copyOriginals: boolean;
  }
) {
  const sourcePath = normalizeLocalPath(input.sourcePath);
  const sourceStats = await stat(sourcePath);
  const filePaths = sourceStats.isDirectory()
    ? await scanEmailDirectory(sourcePath)
    : [sourcePath];

  if (filePaths.length === 0) {
    throw new Error("No EML or Maildir message files were found.");
  }

  return await Promise.all(
    filePaths.map(async (filePath) => {
      const attachmentId = createLocalId("attachment");
      const raw = await readFile(filePath, "utf8");
      const copiedOriginal = input.copyOriginals
        ? await copyFileIntoWorkspace({
            workspaceRootPath,
            sourcePath: filePath,
            attachmentId
          })
        : undefined;

      return {
        sourcePath: filePath,
        fileName: basename(filePath),
        raw,
        sourceKind: isMaildirPath(filePath) ? "maildir" as const : "eml" as const,
        ...(copiedOriginal === undefined
          ? {}
          : {
              copiedOriginal: {
                ...copiedOriginal,
                mimeType: "message/rfc822"
              }
            })
      };
    })
  );
}

async function scanEmailDirectory(rootPath: string): Promise<string[]> {
  const queue = [rootPath];
  const filePaths: string[] = [];

  while (queue.length > 0 && filePaths.length < 500) {
    const currentPath = queue.shift()!;
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile() && isEmailMessagePath(entryPath)) {
        filePaths.push(entryPath);
      }
    }
  }

  return filePaths.sort((a, b) => a.localeCompare(b));
}

function isEmailMessagePath(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase();
  return extension === ".eml" || isMaildirPath(filePath);
}

function isMaildirPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/cur/") || normalized.includes("/new/");
}

function toEmailImportPreviewSummary(
  preview: ReturnType<EmailImportService["previewMessages"]>[number]
): EmailImportPreviewSummary {
  return preview;
}

function toEmailTaskImportSummary(
  summary: Awaited<ReturnType<EmailImportService["importMessagesAsTasks"]>>
): EmailTaskImportSummary {
  return {
    workspaceId: summary.workspaceId,
    containerId: summary.containerId,
    importedAt: summary.importedAt,
    importedCount: summary.importedCount,
    skippedCount: summary.skippedCount,
    issues: summary.issues,
    importedTasks: summary.results.map((result) => ({
      itemId: result.task.item.id,
      title: result.task.item.title,
      sourcePath: result.message.sourcePath,
      attachmentId: result.originalAttachment?.id ?? null
    }))
  };
}

function isValidateWorkspaceExportJsonInput(
  input: unknown
): input is ValidateWorkspaceExportJsonInput {
  return isRecord(input) && isNonEmptyString(input.filePath);
}

function isImportEmailsAsTasksInput(
  input: unknown
): input is ImportEmailsAsTasksInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.sourcePath) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    (input.containerId === undefined || isNonEmptyString(input.containerId)) &&
    (input.extractTags === undefined || typeof input.extractTags === "boolean")
  );
}

function isChooseAndImportEmailsInput(
  input: unknown
): input is ChooseAndImportEmailsInput {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
      (input.containerId === undefined || isNonEmptyString(input.containerId)) &&
      (input.extractTags === undefined || typeof input.extractTags === "boolean"))
  );
}

function isCsvImportPreviewFileInput(
  input: unknown
): input is CsvImportPreviewFileInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.filePath) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    (input.targetType === "task" ||
      input.targetType === "contact" ||
      input.targetType === "project") &&
    (input.mapping === undefined || isRecord(input.mapping)) &&
    (input.conflictStrategy === undefined ||
      input.conflictStrategy === "create_new" ||
      input.conflictStrategy === "skip_existing") &&
    (input.missingContainerStrategy === undefined ||
      input.missingContainerStrategy === "create_project" ||
      input.missingContainerStrategy === "inbox" ||
      input.missingContainerStrategy === "error")
  );
}

function isCsvImportExecuteFileInput(
  input: unknown
): input is CsvImportExecuteFileInput {
  return isCsvImportPreviewFileInput(input);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

