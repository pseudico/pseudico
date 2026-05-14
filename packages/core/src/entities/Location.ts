export type LocationRecord = {
  itemId: string;
  workspaceId: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  viewportCenterLat: number | null;
  viewportCenterLng: number | null;
  viewportZoom: number;
  createdAt: string;
  updatedAt: string;
};

export type LocationMapViewport = {
  centerLat: number | null;
  centerLng: number | null;
  zoom: number;
};

export const DEFAULT_LOCATION_VIEWPORT_ZOOM = 14;
export const MIN_LOCATION_VIEWPORT_ZOOM = 1;
export const MAX_LOCATION_VIEWPORT_ZOOM = 20;

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function normalizeLocationViewportZoom(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return DEFAULT_LOCATION_VIEWPORT_ZOOM;
  }

  return Math.min(
    MAX_LOCATION_VIEWPORT_ZOOM,
    Math.max(MIN_LOCATION_VIEWPORT_ZOOM, Math.round(value))
  );
}

export function buildLocationMapUrl(input: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
}): string {
  const zoom = normalizeLocationViewportZoom(input.viewportZoom);
  const centerLat = input.viewportCenterLat ?? input.latitude ?? null;
  const centerLng = input.viewportCenterLng ?? input.longitude ?? null;

  if (input.latitude !== null && input.latitude !== undefined && input.longitude !== null && input.longitude !== undefined) {
    if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
      throw new Error("Location coordinates must be valid latitude and longitude values.");
    }

    const mapCenter =
      centerLat !== null && centerLng !== null && isValidLatitude(centerLat) && isValidLongitude(centerLng)
        ? `${zoom}/${formatCoordinate(centerLat)}/${formatCoordinate(centerLng)}`
        : `${zoom}/${formatCoordinate(input.latitude)}/${formatCoordinate(input.longitude)}`;

    return `https://www.openstreetmap.org/?mlat=${formatCoordinate(input.latitude)}&mlon=${formatCoordinate(input.longitude)}#map=${mapCenter}`;
  }

  const address = input.address?.trim();

  if (address === undefined || address.length === 0) {
    throw new Error("Location requires an address or coordinates before opening a map.");
  }

  const hash =
    centerLat !== null &&
    centerLng !== null &&
    isValidLatitude(centerLat) &&
    isValidLongitude(centerLng)
      ? `#map=${zoom}/${formatCoordinate(centerLat)}/${formatCoordinate(centerLng)}`
      : "";

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}${hash}`;
}

function formatCoordinate(value: number): string {
  return Number.parseFloat(value.toFixed(6)).toString();
}
