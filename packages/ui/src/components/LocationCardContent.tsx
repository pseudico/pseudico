import { Edit3, ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";
import { LocationEditor, type LocationEditorValues } from "../forms/LocationEditor";
import type { UniversalItemViewModel } from "./ItemCard";

export type LocationCardViewModel = UniversalItemViewModel & {
  id: string;
  type: "location";
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom: number;
};

export type LocationCardContentProps = {
  disabled?: boolean;
  error?: string | null;
  item: LocationCardViewModel;
  onOpen: (item: LocationCardViewModel) => void;
  onSave: (
    item: LocationCardViewModel,
    values: LocationEditorValues
  ) => boolean | Promise<boolean>;
};

export function LocationCardContent({
  disabled = false,
  error = null,
  item,
  onOpen,
  onSave
}: LocationCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  async function handleSave(values: LocationEditorValues): Promise<boolean> {
    const saved = await onSave(item, values);

    if (saved) {
      setEditing(false);
    }

    return saved;
  }

  if (editing) {
    return (
      <LocationEditor
        disabled={disabled}
        error={error}
        initialValues={{
          title: item.title,
          address: item.address ?? "",
          latitude: formatOptionalNumber(item.latitude),
          longitude: formatOptionalNumber(item.longitude),
          viewportCenterLat: formatOptionalNumber(item.viewportCenterLat),
          viewportCenterLng: formatOptionalNumber(item.viewportCenterLng),
          viewportZoom: item.viewportZoom.toString()
        }}
        onCancel={() => setEditing(false)}
        onSubmit={handleSave}
      />
    );
  }

  return (
    <div className="location-card-content">
      <div className="location-map-placeholder" aria-label={`Map placeholder for ${item.title}`}>
        <MapPin size={28} aria-hidden="true" />
        <span>Local map placeholder</span>
      </div>
      {item.address === null || item.address === undefined || item.address.trim().length === 0 ? null : (
        <p>{item.address}</p>
      )}
      <dl className="location-card-details">
        <div>
          <dt>Coordinates</dt>
          <dd>{formatCoordinates(item)}</dd>
        </div>
        <div>
          <dt>Viewport</dt>
          <dd>{formatViewport(item)}</dd>
        </div>
      </dl>
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      <div className="location-card-actions">
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Open map externally"
          type="button"
          onClick={() => onOpen(item)}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open map
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Edit location metadata"
          type="button"
          onClick={() => setEditing(true)}
        >
          <Edit3 size={16} aria-hidden="true" />
          Edit
        </button>
      </div>
    </div>
  );
}

function formatOptionalNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toString();
}

function formatCoordinates(item: LocationCardViewModel): string {
  if (item.latitude === null || item.latitude === undefined || item.longitude === null || item.longitude === undefined) {
    return "Address search only";
  }

  return `${item.latitude}, ${item.longitude}`;
}

function formatViewport(item: LocationCardViewModel): string {
  if (
    item.viewportCenterLat === null ||
    item.viewportCenterLat === undefined ||
    item.viewportCenterLng === null ||
    item.viewportCenterLng === undefined
  ) {
    return `Zoom ${item.viewportZoom}`;
  }

  return `${item.viewportCenterLat}, ${item.viewportCenterLng} ? zoom ${item.viewportZoom}`;
}
