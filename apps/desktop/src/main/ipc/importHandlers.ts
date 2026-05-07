import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { ImportValidationService } from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ImportValidationSummary,
  type ValidateWorkspaceExportJsonInput
} from "../../preload/api";
import { normalizeLocalPath } from "../services/safeFileSystem";

export type ImportIpcHandlers = {
  handleValidateWorkspaceExportJson: (
    input: unknown
  ) => Promise<ApiResult<ImportValidationSummary>>;
  handleChooseAndValidateWorkspaceExportJson: () => Promise<
    ApiResult<ImportValidationSummary | null>
  >;
};

export type ImportIpcPlatform = {
  chooseExportJsonPath: () => Promise<string | null>;
};

export function createImportIpcHandlers(
  platform: ImportIpcPlatform = {
    chooseExportJsonPath: async () => null
  }
): ImportIpcHandlers {
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

function isValidateWorkspaceExportJsonInput(
  input: unknown
): input is ValidateWorkspaceExportJsonInput {
  return isRecord(input) && isNonEmptyString(input.filePath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

