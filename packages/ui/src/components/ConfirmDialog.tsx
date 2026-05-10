import { AlertTriangle, X } from "lucide-react";
import { useId, useRef } from "react";
import { handleModalFocusKeyDown, useModalFocusManagement } from "./focusManagement";

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
}: ConfirmDialogProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalFocusManagement({
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    open
  });

  if (!open) {
    return null;
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="confirm-dialog project-dialog"
      open
      ref={dialogRef}
      onKeyDown={(event) => handleModalFocusKeyDown(event, dialogRef.current, onCancel)}
    >
      <div className="project-dialog-header">
        <div className="confirm-dialog-title">
          <AlertTriangle size={18} aria-hidden="true" />
          <h3 id={titleId}>{title}</h3>
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

      <p className="confirm-dialog-description" id={descriptionId}>{description}</p>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <div className="confirm-dialog-actions">
        <button
          className="secondary-button"
          disabled={busy}
          type="button"
          ref={cancelButtonRef}
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
