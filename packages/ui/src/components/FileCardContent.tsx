import { AlertTriangle, Edit3, ExternalLink, FolderOpen } from "lucide-react";
import { useState } from "react";
import {
  FileMetadataEditor,
  type FileMetadataEditorValues
} from "../forms/FileMetadataEditor";
import {
  FileVersionHistory,
  type FileVersionViewModel
} from "./FileVersionHistory";
import {
  FilePreviewCard,
  type FilePreviewViewModel
} from "./FilePreviewCard";
import type { UniversalItemViewModel } from "./ItemCard";

export type FileAttachmentViewModel = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType?: string | null;
  sizeBytes: number;
  checksum?: string | null;
  storagePath: string;
  description?: string | null;
};

export type FileCardViewModel = UniversalItemViewModel & {
  id: string;
  type: "file";
  title: string;
  categoryId?: string | null;
  attachment: FileAttachmentViewModel;
  missing: boolean;
  preview?: FilePreviewViewModel;
  versions?: FileVersionViewModel[];
};

export type FileCardContentProps = {
  disabled?: boolean;
  error?: string | null;
  item: FileCardViewModel;
  onOpen: (item: FileCardViewModel) => void;
  onReveal: (item: FileCardViewModel) => void;
  onSave: (
    item: FileCardViewModel,
    values: FileMetadataEditorValues
  ) => boolean | Promise<boolean>;
  onCreateSnapshot?: (
    item: FileCardViewModel,
    note: string
  ) => boolean | Promise<boolean>;
  onOpenVersion?: (
    item: FileCardViewModel,
    version: FileVersionViewModel
  ) => void | Promise<void>;
  onRestoreVersion?: (
    item: FileCardViewModel,
    version: FileVersionViewModel
  ) => void | Promise<void>;
};

export function FileCardContent({
  disabled = false,
  error = null,
  item,
  onOpen,
  onReveal,
  onSave,
  onCreateSnapshot,
  onOpenVersion,
  onRestoreVersion
}: FileCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  async function handleSave(
    values: FileMetadataEditorValues
  ): Promise<boolean> {
    const saved = await onSave(item, values);

    if (saved) {
      setEditing(false);
    }

    return saved;
  }

  if (editing) {
    return (
      <FileMetadataEditor
        disabled={disabled}
        error={error}
        initialValues={{
          title: item.title,
          description: item.attachment.description ?? item.body ?? ""
        }}
        onCancel={() => setEditing(false)}
        onSubmit={handleSave}
      />
    );
  }

  return (
    <div className="file-card-content">
      {item.missing ? (
        <p className="file-missing-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          File missing from workspace storage.
        </p>
      ) : null}
      {item.attachment.description === null ||
      item.attachment.description === undefined ||
      item.attachment.description.trim().length === 0 ? null : (
        <p>{item.attachment.description}</p>
      )}
      {item.preview === undefined ? null : (
        <FilePreviewCard name={item.attachment.originalName} preview={item.preview} />
      )}
      <dl className="file-card-details">
        <div>
          <dt>Name</dt>
          <dd>{item.attachment.originalName}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatFileSize(item.attachment.sizeBytes)}</dd>
        </div>
        <div>
          <dt>Stored path</dt>
          <dd>{item.attachment.storagePath}</dd>
        </div>
      </dl>
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      <div className="file-card-actions">
        <button
          className="secondary-button compact-button"
          disabled={disabled || item.missing}
          title="Open attachment"
          type="button"
          onClick={() => onOpen(item)}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled || item.missing}
          title="Reveal attachment"
          type="button"
          onClick={() => onReveal(item)}
        >
          <FolderOpen size={16} aria-hidden="true" />
          Reveal
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Edit file metadata"
          type="button"
          onClick={() => setEditing(true)}
        >
          <Edit3 size={16} aria-hidden="true" />
          Edit
        </button>
      </div>
      {onCreateSnapshot === undefined || onOpenVersion === undefined ? null : (
        <FileVersionHistory
          disabled={disabled || item.missing}
          error={null}
          versions={item.versions ?? []}
          onCreateSnapshot={(note) => onCreateSnapshot(item, note)}
          onOpenVersion={(version) => onOpenVersion(item, version)}
          {...(onRestoreVersion === undefined
            ? {}
            : {
                onRestoreVersion: (version: FileVersionViewModel) =>
                  onRestoreVersion(item, version)
              })}
        />
      )}
    </div>
  );
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
