export type ContainerMediaVariant = "banner" | "avatar";

export type ContainerMediaViewModel = {
  previewDataUrl: string | null;
  altText: string | null;
  originalName: string;
  exists: boolean;
  thumbnailExists: boolean;
};

export type ContainerMediaPreviewProps = {
  media: ContainerMediaViewModel | null;
  variant: ContainerMediaVariant;
  title: string;
  busy?: boolean;
  error?: string | null;
  onSet?: () => void;
  onRemove?: () => void;
};

export function ContainerMediaPreview({
  media,
  variant,
  title,
  busy = false,
  error = null,
  onSet,
  onRemove
}: ContainerMediaPreviewProps): React.JSX.Element {
  const missing = media !== null && (!media.exists || !media.thumbnailExists);
  const alt = media?.altText ?? `${title} ${variant === "banner" ? "banner" : "photo"}`;

  return (
    <div className={`container-media-preview container-media-preview-${variant}`}>
      <div className="container-media-frame" aria-label={`${title} visual identity`}>
        {media?.previewDataUrl !== null && media?.previewDataUrl !== undefined && !missing ? (
          <img src={media.previewDataUrl} alt={alt} />
        ) : (
          <span className="container-media-placeholder" aria-hidden="true">
            {variant === "banner" ? "Banner" : initialsFor(title)}
          </span>
        )}
      </div>
      <div className="container-media-actions">
        <button type="button" className="secondary-button compact-button" disabled={busy} onClick={onSet}>
          {media === null ? `Set ${variant}` : `Change ${variant}`}
        </button>
        {media === null ? null : (
          <button type="button" className="secondary-button compact-button" disabled={busy} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      {missing ? <p className="form-message">Image file is missing from local attachment storage.</p> : null}
      {error === null ? null : <p className="form-error">{error}</p>}
    </div>
  );
}

function initialsFor(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
