import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { focusFirstFocusableElement } from "./focusManagement";
import type {
  ContextMenuActionId,
  ContextMenuTarget,
  ResolvedContextMenuAction
} from "@local-work-os/core";

export type ContextMenuActionViewModel = Pick<
  ResolvedContextMenuAction,
  "id" | "title" | "group" | "disabledReason" | "danger"
> & {
  shortcutLabel?: string;
};

export type ContextMenuProps = {
  actions: readonly ContextMenuActionViewModel[];
  children?: ReactNode;
  label: string;
  target: ContextMenuTarget;
  trigger?: ReactNode;
  onAction?: (actionId: ContextMenuActionId, target: ContextMenuTarget) => void;
};

export function ContextMenu({
  actions,
  children,
  label,
  target,
  trigger,
  onAction
}: ContextMenuProps): React.JSX.Element {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const groupedActions = useMemo(() => groupContextActions(actions), [actions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnDocumentClick(event: MouseEvent): void {
      if (
        menuRef.current !== null &&
        event.target instanceof Node &&
        menuRef.current.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("click", closeOnDocumentClick);
    return () => document.removeEventListener("click", closeOnDocumentClick);
  }, [open]);

  useEffect(() => {
    if (!open || menuRef.current === null) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (menuRef.current !== null) {
        focusFirstFocusableElement(menuRef.current);
      }
    });
  }, [open]);

  function execute(actionId: ContextMenuActionId): void {
    setOpen(false);
    onAction?.(actionId, target);
  }

  function openFromKeyboard(event: React.KeyboardEvent): void {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function closeAndRestoreFocus(): void {
    setOpen(false);
    (triggerRef.current ?? regionRef.current)?.focus();
  }

  function moveMenuFocus(direction: "first" | "last" | "next" | "previous"): void {
    const items = getMenuItems();

    if (items.length === 0) {
      return;
    }

    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (direction === "first") {
      items[0]?.focus();
      return;
    }

    if (direction === "last") {
      items[items.length - 1]?.focus();
      return;
    }

    const nextIndex =
      direction === "next"
        ? (Math.max(currentIndex, 0) + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  function getMenuItems(): HTMLButtonElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []
    );
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeAndRestoreFocus();
        break;
      case "ArrowDown":
        event.preventDefault();
        moveMenuFocus("next");
        break;
      case "ArrowUp":
        event.preventDefault();
        moveMenuFocus("previous");
        break;
      case "Home":
        event.preventDefault();
        moveMenuFocus("first");
        break;
      case "End":
        event.preventDefault();
        moveMenuFocus("last");
        break;
      default:
        break;
    }
  }

  const menu = (
    <div
      className="context-menu-popover item-actions-list"
      id={menuId}
      ref={menuRef}
      role="menu"
      aria-label={label}
      hidden={!open}
      onKeyDown={handleMenuKeyDown}
    >
      {groupedActions.map((group, groupIndex) => (
        <div
          className="context-menu-group"
          key={group.group}
          role="group"
          aria-label={group.group}
        >
          {groupIndex === 0 ? null : <hr className="context-menu-separator" />}
          {group.actions.map((action) => (
            <button
              className="item-action-button context-menu-action"
              data-danger={action.danger ? "true" : "false"}
              disabled={action.disabledReason !== null}
              key={action.id}
              role="menuitem"
              title={action.disabledReason ?? undefined}
              type="button"
              onClick={() => execute(action.id)}
            >
              <span>{action.title}</span>
              {action.shortcutLabel === undefined ? null : (
                <kbd>{action.shortcutLabel}</kbd>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  if (children !== undefined) {
    return (
      <div
        className="context-menu-region"
        data-context-target-id={target.id}
        data-context-target-type={target.type}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        ref={regionRef}
        tabIndex={0}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        onKeyDown={openFromKeyboard}
      >
        {children}
        {menu}
      </div>
    );
  }

  return (
    <div className="context-menu-trigger-wrap item-actions-menu">
      <button
        type="button"
        className="item-actions-trigger"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={openFromKeyboard}
      >
        {trigger}
      </button>
      {menu}
    </div>
  );
}

export function groupContextActions(
  actions: readonly ContextMenuActionViewModel[]
): Array<{ group: string; actions: ContextMenuActionViewModel[] }> {
  const groups = new Map<string, ContextMenuActionViewModel[]>();

  for (const action of actions) {
    const existing = groups.get(action.group) ?? [];
    existing.push(action);
    groups.set(action.group, existing);
  }

  return [...groups.entries()].map(([group, groupedActions]) => ({
    group,
    actions: groupedActions
  }));
}

