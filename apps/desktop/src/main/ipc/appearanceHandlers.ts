import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  AppearanceSettingsService,
  type AppearanceSettings,
  type UpdateAppearanceSettingsInput as FeatureUpdateAppearanceSettingsInput
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AppearanceSettingsSummary,
  type UpdateAppearanceSettingsInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type AppearanceIpcHandlers = {
  handleGetSettings: (input: unknown) => Promise<ApiResult<AppearanceSettingsSummary>>;
  handleUpdateSettings: (input: unknown) => Promise<ApiResult<AppearanceSettingsSummary>>;
};

export function createAppearanceIpcHandlers(
  workspaceService: CurrentWorkspaceService
): AppearanceIpcHandlers {
  return {
    async handleGetSettings(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getAppearanceSettings requires an optional workspaceId string."
        );
      }

      return await withAppearanceService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(toAppearanceSettingsSummary(
          context.service.getSettings(workspaceId)
        ));
      });
    },

    async handleUpdateSettings(input) {
      if (!isUpdateAppearanceSettingsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateAppearanceSettings requires valid theme, density, or fontSize values."
        );
      }

      return await withAppearanceService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const updateInput: FeatureUpdateAppearanceSettingsInput = {
          workspaceId,
          ...(input.theme === undefined ? {} : { theme: input.theme }),
          ...(input.density === undefined ? {} : { density: input.density }),
          ...(input.fontSize === undefined ? {} : { fontSize: input.fontSize })
        };

        return apiOk(toAppearanceSettingsSummary(
          await context.service.updateSettings(updateInput)
        ));
      });
    }
  };
}

async function withAppearanceService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: AppearanceSettingsService;
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
      service: new AppearanceSettingsService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Appearance operation failed."
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
    throw new Error("Appearance workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toAppearanceSettingsSummary(
  settings: AppearanceSettings
): AppearanceSettingsSummary {
  return { ...settings };
}

function isUpdateAppearanceSettingsInput(
  input: unknown
): input is UpdateAppearanceSettingsInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    (input.theme === undefined ||
      input.theme === "system" ||
      input.theme === "light" ||
      input.theme === "dark") &&
    (input.density === undefined ||
      input.density === "comfortable" ||
      input.density === "compact") &&
    (input.fontSize === undefined ||
      input.fontSize === "small" ||
      input.fontSize === "medium" ||
      input.fontSize === "large") &&
    (input.theme !== undefined ||
      input.density !== undefined ||
      input.fontSize !== undefined)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
