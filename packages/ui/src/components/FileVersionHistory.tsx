import { formatAustralianDateTime } from "../dateFormat";
import { History, RotateCcw, Save, ExternalLink } from "lucide-react";
import { useState } from "react";

export type FileVersionViewModel = {
  id: string;
  versionNumber: number;
  originalName: string;
  sizeBytes: number;
  checksum: string;
  storagePath: string;
  note?: string | null;
  createdAt: string;
};

export type FileVersionHistoryProps = {
  disabled?: boolean;
  error?: string | null;
  versions: FileVersionViewModel[];
  onCreateSnapshot: (note: string) => boolean | Promise<boolean>;
  onOpenVersion: (version: FileVersionViewModel) => void | Promise<void>;
  onRestoreVersion?: (version: FileVersionViewModel) => void | Promise<void>;
};

export function FileVersionHistory({
  disabled = false,
  error = null,
  versions,
  onCreateSnapshot,
  onOpenVersion,
  onRestoreVersion
}: FileVersionHistoryProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(() => versions.length > 0);
  const [note, setNote] = useState("");
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  async function handleCreateSnapshot(): Promise<void> {
    const saved = await onCreateSnapshot(note);

    if (saved) {
      setNote("");
      setExpanded(true);
      setRestoreConfirmId(null);
    }
  }

  async function handleOpenVersion(
    version: FileVersionViewModel
  ): Promise<void> {
    setRestoreConfirmId(null);
    await onOpenVersion(version);
  }

  async function handleRestoreVersion(
    version: FileVersionViewModel
  ): Promise<void> {
    if (restoreConfirmId !== version.id) {
      setRestoreConfirmId(version.id);
      return;
    }

    setRestoreConfirmId(null);
    await onRestoreVersion?.(version);
  }

  return (
    <section className="file-version-history" aria-label="File version history">
      <div className="file-version-header">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          <History size={16} aria-hidden="true" />
          Versions ({versions.length})
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="button"
          onClick={() => void handleCreateSnapshot()}
        >
          <Save size={16} aria-hidden="true" />
          Snapshot
        </button>
      </div>
      <label className="field-label" htmlFor="file-version-note">
        Snapshot note
      </label>
      <input
        id="file-version-note"
        className="text-input"
        disabled={disabled}
        placeholder="Optional note for the next snapshot"
        type="text"
        value={note}
        onChange={(event) => setNote(event.currentTarget.value)}
      />
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      {!expanded ? null : versions.length === 0 ? (
        <p className="empty-state-copy">No file snapshots yet.</p>
      ) : (
        <ol className="file-version-list">
          {versions.map((version) => (
            <li className="file-version-row" key={version.id}>
              <div>
                <strong>Version {version.versionNumber}</strong>
                <dl className="file-version-details">
                  <div>
                    <dt>Date</dt>
                    <dd>{formatCreatedAt(version.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{formatFileSize(version.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt>Checksum</dt>
                    <dd>
                      <code title={version.checksum}>{version.checksum}</code>
                    </dd>
                  </div>
                </dl>
                {version.note === null ||
                version.note === undefined ||
                version.note.trim().length === 0 ? null : (
                  <p>
                    <strong>Note:</strong> {version.note}
                  </p>
                )}
              </div>
              <div className="file-card-actions">
                <button
                  className="secondary-button compact-button"
                  disabled={disabled}
                  type="button"
                  onClick={() => void handleOpenVersion(version)}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  Open
                </button>
                {onRestoreVersion === undefined ? null : (
                  <button
                    className="secondary-button compact-button"
                    disabled={disabled}
                    type="button"
                    aria-describedby={`file-version-restore-${version.id}`}
                    onClick={() => void handleRestoreVersion(version)}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    {restoreConfirmId === version.id ? "Confirm restore" : "Restore"}
                  </button>
                )}
                {restoreConfirmId === version.id ? (
                  <small id={`file-version-restore-${version.id}`}>
                    Restoring first saves the current file as a safety snapshot.
                  </small>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export const FileVersionPanel = FileVersionHistory;

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatAustralianDateTime(value);
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
