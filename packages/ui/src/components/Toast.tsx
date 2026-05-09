import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "info" | "success" | "error";

export type ToastViewModel = {
  id: string;
  message: string;
  title?: string;
  tone: ToastTone;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
};

export type ToastProps = {
  onDismiss?: (id: string) => void;
  toast: ToastViewModel;
};

const toastIcons = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle
} satisfies Record<ToastTone, typeof Info>;

export function Toast({ onDismiss, toast }: ToastProps): React.JSX.Element {
  const Icon = toastIcons[toast.tone];

  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <Icon size={18} aria-hidden="true" />
      <div className="toast-copy">
        {toast.title === undefined ? null : <strong>{toast.title}</strong>}
        <span>{toast.message}</span>
      </div>
      {toast.action === undefined ? null : (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            void toast.action?.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
      {onDismiss === undefined ? null : (
        <button
          type="button"
          className="toast-dismiss"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export type ToastViewportProps = {
  onDismiss?: (id: string) => void;
  toasts: ToastViewModel[];
};

export function ToastViewport({
  onDismiss,
  toasts
}: ToastViewportProps): React.JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <section className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          {...(onDismiss === undefined ? {} : { onDismiss })}
        />
      ))}
    </section>
  );
}
