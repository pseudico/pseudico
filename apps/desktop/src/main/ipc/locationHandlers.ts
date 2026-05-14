import { LocationService, TagService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type LocationWithItemRecord,
  type TaggedTargetRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type CreateLocationInput,
  type ItemTagSummary,
  type LocationSummary,
  type OpenLocationMapSummary,
  type UpdateLocationInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;

type LocationIpcHandlers = {
  handleCreateLocation: (input: unknown) => Promise<ApiResult<LocationSummary>>;
  handleUpdateLocation: (input: unknown) => Promise<ApiResult<LocationSummary>>;
  handleListLocationsByContainer: (input: unknown) => Promise<ApiResult<LocationSummary[]>>;
  handleOpenLocationExternally: (input: unknown) => Promise<ApiResult<OpenLocationMapSummary>>;
};

export type LocationIpcPlatform = {
  openExternal: (url: string) => Promise<void>;
};

export function createLocationIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: LocationIpcPlatform = { openExternal: async () => undefined }
): LocationIpcHandlers {
  return {
    async handleCreateLocation(input) {
      if (!isCreateLocationInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createLocation requires containerId plus an address or latitude/longitude."
        );
      }

      return await withLocationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.locationService.createLocation({
          ...input,
          workspaceId
        });

        return apiOk(toLocationSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleUpdateLocation(input) {
      if (!isUpdateLocationInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateLocation requires an itemId and at least one location field."
        );
      }

      return await withLocationService(workspaceService, async (context) => {
        const result = await context.locationService.updateLocation(input);
        return apiOk(toLocationSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleListLocationsByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listLocationsByContainer requires a containerId string."
        );
      }

      return await withLocationService(workspaceService, async (context) => {
        const locations = context.locationService.listLocationsByContainer(input);
        const tagsByItemId = context.tagService.hydrateItemTags({
          workspaceId: context.workspace.id,
          itemIds: locations.map((location) => location.item.id)
        });

        return apiOk(
          locations.map((location) => toLocationSummary(location, tagsByItemId[location.item.id] ?? []))
        );
      });
    },

    async handleOpenLocationExternally(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openLocationExternally requires an itemId string."
        );
      }

      return await withLocationService(workspaceService, async (context) => {
        const location = context.locationService.getLocationByItemId(input);

        if (location === null) {
          return apiError("WORKSPACE_ERROR", "Location was not found.");
        }

        const mapUrl = context.locationService.buildExternalMapUrl(location.location);
        await platform.openExternal(mapUrl);

        return apiOk({ itemId: location.item.id, mapUrl });
      });
    }
  };
}

async function withLocationService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    locationService: LocationService;
    tagService: TagService;
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
      locationService: new LocationService({ connection }),
      tagService: new TagService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Location operation failed."
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
    throw new Error("Location workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function hydrateSingleItemTags(
  context: { tagService: TagService; workspace: WorkspaceSummary },
  itemId: string
): TaggedTargetRecord[] {
  return context.tagService.hydrateItemTags({
    workspaceId: context.workspace.id,
    itemIds: [itemId]
  })[itemId] ?? [];
}

function toLocationSummary(
  locationWithItem: LocationWithItemRecord,
  tags: readonly TaggedTargetRecord[] = []
): LocationSummary {
  const { item, location } = locationWithItem;

  if (item.type !== "location") {
    throw new Error(`Expected location item but received ${item.type}.`);
  }

  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: "location",
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt,
    tags: tags.map(toItemTagSummary),
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    viewportCenterLat: location.viewportCenterLat,
    viewportCenterLng: location.viewportCenterLng,
    viewportZoom: location.viewportZoom,
    locationCreatedAt: location.createdAt,
    locationUpdatedAt: location.updatedAt
  };
}

function toItemTagSummary(tag: TaggedTargetRecord): ItemTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: tag.taggingSource
  };
}

function isCreateLocationInput(input: unknown): input is CreateLocationInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isOptionalNullableNonEmptyString(input.title) &&
    isOptionalNullableString(input.address) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableNumber(input.latitude) &&
    isOptionalNullableNumber(input.longitude) &&
    isOptionalNullableNumber(input.viewportCenterLat) &&
    isOptionalNullableNumber(input.viewportCenterLng) &&
    isOptionalNullableNumber(input.viewportZoom) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    hasLocationValue(input)
  );
}

function isUpdateLocationInput(input: unknown): input is UpdateLocationInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isOptionalNullableNonEmptyString(input.title) &&
    isOptionalNullableString(input.address) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableNumber(input.latitude) &&
    isOptionalNullableNumber(input.longitude) &&
    isOptionalNullableNumber(input.viewportCenterLat) &&
    isOptionalNullableNumber(input.viewportCenterLng) &&
    isOptionalNullableNumber(input.viewportZoom) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    hasLocationUpdateField(input)
  );
}

function hasLocationValue(input: Record<string, unknown>): boolean {
  return input.address !== undefined || input.latitude !== undefined || input.longitude !== undefined;
}

function hasLocationUpdateField(input: Record<string, unknown>): boolean {
  return [
    "address",
    "categoryId",
    "containerTabId",
    "latitude",
    "longitude",
    "pinned",
    "sortOrder",
    "title",
    "viewportCenterLat",
    "viewportCenterLng",
    "viewportZoom"
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

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalNullableNonEmptyString(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function isOptionalNullableNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "number";
}

function isOptionalActorType(value: unknown): boolean {
  return value === undefined || value === "local_user" || value === "system" || value === "importer";
}
