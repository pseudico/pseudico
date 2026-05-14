import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  buildLocationMapUrl,
  createIsoTimestamp,
  createLocalId,
  isValidLatitude,
  isValidLongitude,
  normalizeLocationViewportZoom,
  type ActivityActorType,
  type LocationRecord
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  LocationRepository,
  SearchIndexService,
  SortOrderService,
  TagRepository,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type LocationWithItemRecord,
  type SearchIndexRecord,
  type UpdateItemPatch,
  type UpdateLocationDetailsPatch
} from "@local-work-os/db";

export type LocationServiceIdFactory = (prefix: string) => string;

export type CreateLocationInput = {
  workspaceId: string;
  containerId: string;
  actorType?: ActivityActorType;
  address?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pinned?: boolean;
  sortOrder?: number;
  title?: string | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
};

export type UpdateLocationInput = {
  itemId: string;
  actorType?: ActivityActorType;
  address?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pinned?: boolean;
  sortOrder?: number;
  title?: string | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
};

export type OpenLocationMapSummary = {
  itemId: string;
  mapUrl: string;
};

export type LocationMutationResult = LocationWithItemRecord & {
  searchRecord: SearchIndexRecord;
};

type NormalizedLocationDetails = {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  viewportCenterLat: number | null;
  viewportCenterLng: number | null;
  viewportZoom: number;
};

export class LocationService {
  readonly module = "locations";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: LocationServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: LocationServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createLocation(input: CreateLocationInput): Promise<LocationMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const details = normalizeDetails(input);
      const title = normalizeNullableString(input.title) ?? createLocationTitle(details);
      const itemRepository = new ItemRepository(this.connection);
      const locationRepository = new LocationRepository(this.connection);
      const sortOrderService = new SortOrderService({ connection: this.connection });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "location",
        title,
        body: buildLocationBody(details),
        categoryId: normalizeNullableString(input.categoryId),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        timestamp
      });
      const location = locationRepository.createDetails({
        itemId: item.id,
        workspaceId: item.workspaceId,
        ...details,
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(item, location, timestamp);

      this.logLocationEvent({
        item,
        location,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.locationCreated,
        summary: `Created location "${item.title}".`,
        before: null,
        timestamp
      });

      return { item, location, searchRecord };
    });
  }

  async updateLocation(input: UpdateLocationInput): Promise<LocationMutationResult> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireLocation(input.itemId);
      const itemPatch: UpdateItemPatch = { timestamp };
      const detailsPatch: UpdateLocationDetailsPatch = { timestamp };
      const mergedDetails = normalizeDetails({
        address: input.address === undefined ? before.location.address : input.address,
        latitude: input.latitude === undefined ? before.location.latitude : input.latitude,
        longitude: input.longitude === undefined ? before.location.longitude : input.longitude,
        viewportCenterLat:
          input.viewportCenterLat === undefined
            ? before.location.viewportCenterLat
            : input.viewportCenterLat,
        viewportCenterLng:
          input.viewportCenterLng === undefined
            ? before.location.viewportCenterLng
            : input.viewportCenterLng,
        viewportZoom:
          input.viewportZoom === undefined
            ? before.location.viewportZoom
            : input.viewportZoom
      });

      if (input.title !== undefined) {
        itemPatch.title = normalizeRequiredString(input.title, "title");
      } else if (
        input.address !== undefined ||
        input.latitude !== undefined ||
        input.longitude !== undefined
      ) {
        itemPatch.title = createLocationTitle(mergedDetails);
      }

      if (input.categoryId !== undefined) {
        itemPatch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.containerTabId !== undefined) {
        itemPatch.containerTabId = input.containerTabId;
      }

      if (input.sortOrder !== undefined) {
        itemPatch.sortOrder = input.sortOrder;
      }

      if (input.pinned !== undefined) {
        itemPatch.pinned = input.pinned;
      }

      if (
        input.address !== undefined ||
        input.latitude !== undefined ||
        input.longitude !== undefined ||
        input.viewportCenterLat !== undefined ||
        input.viewportCenterLng !== undefined ||
        input.viewportZoom !== undefined
      ) {
        itemPatch.body = buildLocationBody(mergedDetails);
      }

      if (input.address !== undefined) {
        detailsPatch.address = mergedDetails.address;
      }
      if (input.latitude !== undefined) {
        detailsPatch.latitude = mergedDetails.latitude;
      }
      if (input.longitude !== undefined) {
        detailsPatch.longitude = mergedDetails.longitude;
      }
      if (input.viewportCenterLat !== undefined) {
        detailsPatch.viewportCenterLat = mergedDetails.viewportCenterLat;
      }
      if (input.viewportCenterLng !== undefined) {
        detailsPatch.viewportCenterLng = mergedDetails.viewportCenterLng;
      }
      if (input.viewportZoom !== undefined) {
        detailsPatch.viewportZoom = mergedDetails.viewportZoom;
      }

      const item = new ItemRepository(this.connection).update(input.itemId, itemPatch);
      const location = new LocationRepository(this.connection).updateDetails(
        input.itemId,
        detailsPatch
      );
      const searchRecord = this.upsertSearchRecord(item, location, timestamp);

      this.logLocationEvent({
        item,
        location,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.locationUpdated,
        summary: `Updated location "${item.title}".`,
        before,
        timestamp
      });

      return { item, location, searchRecord };
    });
  }

  getLocationByItemId(itemId: string): LocationWithItemRecord | null {
    validateNonEmptyString(itemId, "itemId");
    return new LocationRepository(this.connection).getByItemId(itemId);
  }

  listLocationsByContainer(containerId: string): LocationWithItemRecord[] {
    validateNonEmptyString(containerId, "containerId");
    return new LocationRepository(this.connection).listByContainer(containerId);
  }

  buildExternalMapUrl(location: LocationRecord): string {
    return buildLocationMapUrl(location);
  }

  private requireLocation(itemId: string): LocationWithItemRecord {
    const location = new LocationRepository(this.connection).getByItemId(itemId);

    if (location === null) {
      throw new Error(`Location was not found: ${itemId}.`);
    }

    return location;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    location: LocationRecord,
    timestamp: string
  ): SearchIndexRecord {
    const tags = new TagRepository(this.connection).listTagsForTarget({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id
    });

    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertLocation(item, location, {
      timestamp,
      tags: tags.map((tag) => tag.slug),
      metadata: {
        tagIds: tags.map((tag) => tag.id),
        tagSlugs: tags.map((tag) => tag.slug)
      }
    });
  }

  private logLocationEvent(input: {
    item: ItemRecord;
    location: LocationRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: LocationWithItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.item.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify({ item: input.item, location: input.location }),
      timestamp: input.timestamp
    });
  }

  private validateCreateInput(input: CreateLocationInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    normalizeDetails(input);

    if (input.title !== undefined && input.title !== null) {
      validateNonEmptyString(input.title, "title");
    }
  }

  private validateUpdateInput(input: UpdateLocationInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.title !== undefined && input.title !== null) {
      validateNonEmptyString(input.title, "title");
    }

    if (
      input.address === undefined &&
      input.categoryId === undefined &&
      input.containerTabId === undefined &&
      input.latitude === undefined &&
      input.longitude === undefined &&
      input.pinned === undefined &&
      input.sortOrder === undefined &&
      input.title === undefined &&
      input.viewportCenterLat === undefined &&
      input.viewportCenterLng === undefined &&
      input.viewportZoom === undefined
    ) {
      throw new Error("At least one location field must be provided.");
    }
  }
}

export const locationsModuleContract = {
  module: "locations",
  purpose: "Manage local address and coordinate item behavior with explicit external map opening.",
  owns: ["location item operations", "map URL construction", "local viewport metadata"],
  doesNotOwn: ["embedded live maps", "geocoding services", "network fetching"],
  integrationPoints: ["projects", "contacts", "inbox", "search", "metadata"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

function normalizeDetails(input: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
}): NormalizedLocationDetails {
  const address = normalizeNullableString(input.address);
  const latitude = normalizeNullableNumber(input.latitude);
  const longitude = normalizeNullableNumber(input.longitude);
  const viewportCenterLat = normalizeNullableNumber(input.viewportCenterLat);
  const viewportCenterLng = normalizeNullableNumber(input.viewportCenterLng);

  if (latitude !== null && !isValidLatitude(latitude)) {
    throw new Error("latitude must be between -90 and 90.");
  }

  if (longitude !== null && !isValidLongitude(longitude)) {
    throw new Error("longitude must be between -180 and 180.");
  }

  if ((latitude === null) !== (longitude === null)) {
    throw new Error("latitude and longitude must be provided together.");
  }

  if (viewportCenterLat !== null && !isValidLatitude(viewportCenterLat)) {
    throw new Error("viewportCenterLat must be between -90 and 90.");
  }

  if (viewportCenterLng !== null && !isValidLongitude(viewportCenterLng)) {
    throw new Error("viewportCenterLng must be between -180 and 180.");
  }

  if ((viewportCenterLat === null) !== (viewportCenterLng === null)) {
    throw new Error("viewport center latitude and longitude must be provided together.");
  }

  if (address === null && (latitude === null || longitude === null)) {
    throw new Error("Location requires an address or latitude/longitude.");
  }

  return {
    address,
    latitude,
    longitude,
    viewportCenterLat: viewportCenterLat ?? latitude,
    viewportCenterLng: viewportCenterLng ?? longitude,
    viewportZoom: normalizeLocationViewportZoom(input.viewportZoom)
  };
}

function createLocationTitle(details: NormalizedLocationDetails): string {
  if (details.address !== null) {
    return details.address;
  }

  return `${formatCoordinate(details.latitude!)}, ${formatCoordinate(details.longitude!)}`;
}

function buildLocationBody(details: NormalizedLocationDetails): string | null {
  const parts: string[] = [];

  if (details.address !== null) {
    parts.push(details.address);
  }

  if (details.latitude !== null && details.longitude !== null) {
    parts.push(`${formatCoordinate(details.latitude)}, ${formatCoordinate(details.longitude)}`);
  }

  parts.push(`Viewport zoom ${details.viewportZoom}`);

  return parts.join("\n");
}

function formatCoordinate(value: number): string {
  return Number.parseFloat(value.toFixed(6)).toString();
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeRequiredString(value: string | null, fieldName: string): string {
  if (value === null) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return trimmed;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Number.isFinite(value)) {
    throw new Error("Location numeric fields must be finite numbers.");
  }

  return value;
}
