import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  PrivacySettingsService,
  type PrivacyNetworkSettings,
  type UpdatePrivacyNetworkSettingsInput as FeatureUpdatePrivacyNetworkSettingsInput
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type PrivacyNetworkSettingsSummary,
  type UpdatePrivacyNetworkSettingsInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type PrivacyIpcHandlers = {
  handleGetSettings: (
    input: unknown
  ) => Promise<ApiResult<PrivacyNetworkSettingsSummary>>;
  handleUpdateSettings: (
    input: unknown
  ) => Promise<ApiResult<PrivacyNetworkSettingsSummary>>;
};

export function createPrivacyIpcHandlers(
  workspaceService: CurrentWorkspaceService
): PrivacyIpcHandlers {
  return {
    async handleGetSettings(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getPrivacySettings requires an optional workspaceId string."
        );
      }

      return await withPrivacyService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(toPrivacyNetworkSettingsSummary(
          context.service.getSettings(workspaceId)
        ));
      });
    },

    async handleUpdateSettings(input) {
      if (!isUpdatePrivacyNetworkSettingsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updatePrivacySettings requires workspaceId and boolean network preferences."
        );
      }

      return await withPrivacyService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const updateInput: FeatureUpdatePrivacyNetworkSettingsInput = {
          workspaceId,
          ...(input.metadataFetchEnabled === undefined
            ? {}
            : { metadataFetchEnabled: input.metadataFetchEnabled }),
          ...(input.webWidgetsEnabled === undefined
            ? {}
            : { webWidgetsEnabled: input.webWidgetsEnabled }),
          ...(input.icsUrlImportEnabled === undefined
            ? {}
            : { icsUrlImportEnabled: input.icsUrlImportEnabled }),
          ...(input.imapImportEnabled === undefined
            ? {}
            : { imapImportEnabled: input.imapImportEnabled }),
          ...(input.browserCaptureEnabled === undefined
            ? {}
            : { browserCaptureEnabled: input.browserCaptureEnabled })
        };

        return apiOk(toPrivacyNetworkSettingsSummary(
          await context.service.updateSettings(updateInput)
        ));
      });
    }
  };
}

async function withPrivacyService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: PrivacySettingsService;
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
      service: new PrivacySettingsService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Privacy operation failed."
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
    throw new Error("Privacy workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toPrivacyNetworkSettingsSummary(
  settings: PrivacyNetworkSettings
): PrivacyNetworkSettingsSummary {
  return { ...settings };
}

function isUpdatePrivacyNetworkSettingsInput(
  input: unknown
): input is UpdatePrivacyNetworkSettingsInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    isOptionalBoolean(input.metadataFetchEnabled) &&
    isOptionalBoolean(input.webWidgetsEnabled) &&
    isOptionalBoolean(input.icsUrlImportEnabled) &&
    isOptionalBoolean(input.imapImportEnabled) &&
    isOptionalBoolean(input.browserCaptureEnabled) &&
    (input.metadataFetchEnabled !== undefined ||
      input.webWidgetsEnabled !== undefined ||
      input.icsUrlImportEnabled !== undefined ||
      input.imapImportEnabled !== undefined ||
      input.browserCaptureEnabled !== undefined)
  );
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
