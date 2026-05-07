import { useEffect, useSyncExternalStore } from "react";
import {
  ToastViewport,
  type ToastTone,
  type ToastViewModel
} from "@local-work-os/ui";

type ToastInput = {
  title?: string;
  tone?: ToastTone;
};

const listeners = new Set<() => void>();
let toasts: ToastViewModel[] = [];
let nextToastId = 1;

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

  toasts = [
    ...toasts,
    toast
  ];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function ToastHost(): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (snapshot.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      dismissToast(snapshot[0]!.id);
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [snapshot]);

  return <ToastViewport onDismiss={dismissToast} toasts={snapshot} />;
}
