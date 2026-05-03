import { AlertTriangle, X } from "lucide-react";

export type ConfirmDialogTone = "normal" | "danger";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  tone?: ConfirmDialogTone;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  error = null,
  tone = "normal",
  onCancel,
  onConfirm
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <dialog className="confirm-dialog project-dialog" open={open}>
      <div className="project-dialog-header">
        <div className="confirm-dialog-title">
          <AlertTriangle size={18} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <button
          aria-label="Close confirmation"
          className="secondary-button compact-button"
          disabled={busy}
          type="button"
          onClick={onCancel}
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </div>

      <p className="confirm-dialog-description">{description}</p>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <div className="confirm-dialog-actions">
        <button
          className="secondary-button"
          disabled={busy}
          type="button"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className={
            tone === "danger" ? "primary-button danger-button" : "primary-button"
          }
          disabled={busy}
          type="button"
          onClick={() => void onConfirm()}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
