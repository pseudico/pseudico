import { type FormEvent, useState } from "react";

export type LocationEditorValues = {
  title: string;
  address: string;
  latitude: string;
  longitude: string;
  viewportCenterLat: string;
  viewportCenterLng: string;
  viewportZoom: string;
};

export type LocationEditorProps = {
  disabled?: boolean;
  error?: string | null;
  initialValues?: Partial<LocationEditorValues>;
  onCancel?: () => void;
  onSubmit: (values: LocationEditorValues) => boolean | Promise<boolean>;
  resetOnSubmit?: boolean;
  submitLabel?: string;
};

export function LocationEditor({
  disabled = false,
  error = null,
  initialValues,
  onCancel,
  onSubmit,
  resetOnSubmit = false,
  submitLabel = "Save location"
}: LocationEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [latitude, setLatitude] = useState(initialValues?.latitude ?? "");
  const [longitude, setLongitude] = useState(initialValues?.longitude ?? "");
  const [viewportCenterLat, setViewportCenterLat] = useState(
    initialValues?.viewportCenterLat ?? ""
  );
  const [viewportCenterLng, setViewportCenterLng] = useState(
    initialValues?.viewportCenterLng ?? ""
  );
  const [viewportZoom, setViewportZoom] = useState(
    initialValues?.viewportZoom ?? "14"
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (address.trim().length === 0 && (latitude.trim().length === 0 || longitude.trim().length === 0)) {
      setValidationError("Location requires an address or latitude/longitude.");
      return;
    }

    if ((latitude.trim().length === 0) !== (longitude.trim().length === 0)) {
      setValidationError("Latitude and longitude must be provided together.");
      return;
    }

    if ((viewportCenterLat.trim().length === 0) !== (viewportCenterLng.trim().length === 0)) {
      setValidationError("Viewport center latitude and longitude must be provided together.");
      return;
    }

    setValidationError(null);
    const saved = await onSubmit({
      title: title.trim(),
      address: address.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
      viewportCenterLat: viewportCenterLat.trim(),
      viewportCenterLng: viewportCenterLng.trim(),
      viewportZoom: viewportZoom.trim()
    });

    if (saved && resetOnSubmit) {
      setTitle("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setViewportCenterLat("");
      setViewportCenterLng("");
      setViewportZoom("14");
    }
  }

  return (
    <form className="location-editor" onSubmit={(event) => void handleSubmit(event)}>
      <label>
        <span>Title</span>
        <input
          disabled={disabled}
          placeholder="Optional display name"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </label>
      <label>
        <span>Address or place</span>
        <textarea
          disabled={disabled}
          placeholder="123 Example St, Sydney NSW"
          rows={2}
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
        />
      </label>
      <div className="location-editor-grid">
        <label>
          <span>Latitude</span>
          <input
            disabled={disabled}
            inputMode="decimal"
            placeholder="-33.8688"
            type="text"
            value={latitude}
            onChange={(event) => setLatitude(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Longitude</span>
          <input
            disabled={disabled}
            inputMode="decimal"
            placeholder="151.2093"
            type="text"
            value={longitude}
            onChange={(event) => setLongitude(event.currentTarget.value)}
          />
        </label>
      </div>
      <fieldset className="location-viewport-fieldset">
        <legend>Saved map viewport</legend>
        <div className="location-editor-grid">
          <label>
            <span>Center lat</span>
            <input
              disabled={disabled}
              inputMode="decimal"
              type="text"
              value={viewportCenterLat}
              onChange={(event) => setViewportCenterLat(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Center lng</span>
            <input
              disabled={disabled}
              inputMode="decimal"
              type="text"
              value={viewportCenterLng}
              onChange={(event) => setViewportCenterLng(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Zoom</span>
            <input
              disabled={disabled}
              inputMode="numeric"
              max={20}
              min={1}
              type="number"
              value={viewportZoom}
              onChange={(event) => setViewportZoom(event.currentTarget.value)}
            />
          </label>
        </div>
      </fieldset>
      {validationError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {validationError ?? error}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={disabled} type="submit">
          {submitLabel}
        </button>
        {onCancel === undefined ? null : (
          <button
            className="secondary-button"
            disabled={disabled}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
