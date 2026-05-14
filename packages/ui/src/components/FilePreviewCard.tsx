export type FilePreviewKind =
  | "image"
  | "pdf"
  | "text"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "unknown";

export type FilePreviewViewModel = {
  kind: FilePreviewKind;
  iconLabel: string;
  extension: string | null;
  sizeLabel: string;
  updatedAt: string;
  missing: boolean;
  checksumShort: string | null;
  versionCount: number;
  latestVersionNumber: number | null;
  thumbnailStoragePath: string | null;
  thumbnailExists: boolean;
  previewDataUrl: string | null;
};

export type FilePreviewCardProps = {
  name: string;
  preview: FilePreviewViewModel;
};

export function FilePreviewCard({
  name,
  preview
}: FilePreviewCardProps): React.JSX.Element {
  const versionLabel =
    preview.versionCount === 0
      ? "No snapshots"
      : `${preview.versionCount} snapshot${preview.versionCount === 1 ? "" : "s"}`;
  const latestVersionLabel =
    preview.latestVersionNumber === null
      ? null
      : `Latest v${preview.latestVersionNumber}`;

  return (
    <section
      className={`file-preview-card file-preview-card-${preview.kind}`}
      aria-label={`Preview for ${name}`}
    >
      <div className="file-preview-visual">
        {preview.previewDataUrl === null ? (
          <span className="file-preview-icon" aria-hidden="true">
            {preview.iconLabel}
          </span>
        ) : (
          <img
            alt={`${preview.iconLabel} thumbnail for ${name}`}
            src={preview.previewDataUrl}
          />
        )}
      </div>
      <dl className="file-preview-details">
        <div>
          <dt>Type</dt>
          <dd>{formatTypeLabel(preview)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{preview.sizeLabel}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDate(preview.updatedAt)}</dd>
        </div>
        <div>
          <dt>Versions</dt>
          <dd>
            {versionLabel}
            {latestVersionLabel === null ? null : ` · ${latestVersionLabel}`}
          </dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{preview.missing ? "Missing from workspace storage" : "Available locally"}</dd>
        </div>
        {preview.checksumShort === null ? null : (
          <div>
            <dt>Checksum</dt>
            <dd>
              <code>{preview.checksumShort}</code>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function formatTypeLabel(preview: FilePreviewViewModel): string {
  const extension =
    preview.extension === null ? "" : ` .${preview.extension.toUpperCase()}`;
  return `${preview.iconLabel}${extension}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
