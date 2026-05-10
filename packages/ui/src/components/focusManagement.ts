import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useEffect } from "react";

export const modalFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

export type FocusTrapKeyCommand = "close" | "move-first" | "move-last" | "none";

export function getFocusTrapKeyCommand(input: {
  key: string;
  shiftKey?: boolean;
  currentIndex: number;
  focusableCount: number;
}): FocusTrapKeyCommand {
  if (input.key === "Escape") {
    return "close";
  }

  if (input.key !== "Tab" || input.focusableCount <= 1) {
    return "none";
  }

  if (input.shiftKey === true && input.currentIndex <= 0) {
    return "move-last";
  }

  if (input.shiftKey !== true && input.currentIndex >= input.focusableCount - 1) {
    return "move-first";
  }

  return "none";
}

export function getFocusableElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(modalFocusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      !element.closest("[hidden]")
  );
}

export function focusFirstFocusableElement(root: ParentNode): void {
  const autofocusElement = root.querySelector<HTMLElement>("[autofocus]");

  if (autofocusElement !== null && !autofocusElement.hasAttribute("disabled")) {
    autofocusElement.focus();
    return;
  }

  getFocusableElements(root)[0]?.focus();
}

export function handleModalFocusKeyDown(
  event: ReactKeyboardEvent<HTMLElement>,
  root: ParentNode | null,
  onClose: () => void
): void {
  if (root === null) {
    return;
  }

  const focusableElements = getFocusableElements(root);
  const currentIndex = focusableElements.findIndex(
    (element) => element === event.target
  );
  const command = getFocusTrapKeyCommand({
    key: event.key,
    shiftKey: event.shiftKey,
    currentIndex,
    focusableCount: focusableElements.length
  });

  if (command === "none") {
    return;
  }

  event.preventDefault();

  if (command === "close") {
    onClose();
    return;
  }

  if (command === "move-first") {
    focusableElements[0]?.focus();
    return;
  }

  focusableElements[focusableElements.length - 1]?.focus();
}

export function useModalFocusManagement(input: {
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  open: boolean;
  restoreFocus?: boolean;
}): void {
  const { containerRef, initialFocusRef, open, restoreFocus = true } = input;

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const initialFocus = initialFocusRef?.current;

      if (initialFocus !== undefined && initialFocus !== null) {
        initialFocus.focus();
        return;
      }

      if (containerRef.current !== null) {
        focusFirstFocusableElement(containerRef.current);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (restoreFocus) {
        previouslyFocused?.focus();
      }
    };
  }, [containerRef, initialFocusRef, open, restoreFocus]);
}
