import { useEffect, useSyncExternalStore } from "react";
import {
  ToastViewport,
  type ToastTone,
  type ToastViewModel
} from "@local-work-os/ui";

type ToastInput = {
  title?: string;
  tone?: ToastTone;
  action?: ToastViewModel["action"];
};

const listeners = new Set<() => void>();
let toasts: ToastViewModel[] = [];
let nextToastId = 1;
const maxToastBacklog = 8;
const maxVisibleToasts = 2;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): ToastViewModel[] {
  return toasts;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(message: string, input: ToastInput = {}): string {
  const id = `toast_${nextToastId}`;
  nextToastId += 1;
  const toast: ToastViewModel = {
    id,
    message,
    tone: input.tone ?? "info"
  };

  if (input.title !== undefined) {
    toast.title = input.title;
  }

  if (input.action !== undefined) {
    toast.action = input.action;
  }

  toasts = [...toasts, toast].slice(-maxToastBacklog);
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts =
    id === "toast-overflow-summary"
      ? toasts.slice(-maxVisibleToasts)
      : toasts.filter((toast) => toast.id !== id);
  emit();
}

export function ToastHost(): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const visibleToasts = getVisibleToasts(snapshot);

  useEffect(() => {
    if (snapshot.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      dismissToast(snapshot[0]!.id);
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [snapshot]);

  return <ToastViewport onDismiss={dismissToast} toasts={visibleToasts} />;
}

export function getVisibleToasts(
  snapshot: readonly ToastViewModel[]
): ToastViewModel[] {
  if (snapshot.length <= maxVisibleToasts) {
    return [...snapshot];
  }

  const hiddenCount = snapshot.length - maxVisibleToasts;
  const latestToasts = snapshot.slice(-maxVisibleToasts);

  return [
    {
      id: "toast-overflow-summary",
      message:
        hiddenCount === 1
          ? "1 earlier update will clear automatically."
          : `${hiddenCount} earlier updates will clear automatically.`,
      title: "More updates",
      tone: "info"
    },
    ...latestToasts
  ];
}
