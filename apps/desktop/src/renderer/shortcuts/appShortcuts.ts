import {
  APP_SHORTCUT_IDS,
  createShortcutRegistry,
  defaultShortcutDescriptors,
  type AppShortcutId,
  type RegisteredShortcut,
  type ShortcutKeyboardEventLike
} from "@local-work-os/core";
import type { ActionShortcut } from "@local-work-os/core";
import type { NavigateFunction } from "react-router-dom";
import type { QuickStartActionKind } from "@local-work-os/features/quickStart";
import type { QuickAddContext } from "../components/QuickAddModal";

export const appShortcutRegistry = createShortcutRegistry(
  defaultShortcutDescriptors
);

export type AppShortcutCallbacks = {
  currentPathname: string;
  navigate: NavigateFunction | ((path: string) => void);
  openCommandPalette: () => void;
  openQuickAdd: (context?: QuickAddContext) => void;
  workspaceOpen: boolean;
};

export function resolveGlobalAppShortcut(
  event: ShortcutKeyboardEventLike
): RegisteredShortcut | null {
  return appShortcutRegistry.match(event, { scope: "global" });
}

export function runGlobalAppShortcut(
  shortcut: RegisteredShortcut,
  callbacks: AppShortcutCallbacks
): boolean {
  switch (shortcut.id as AppShortcutId) {
    case APP_SHORTCUT_IDS.openCommandPalette:
      callbacks.openCommandPalette();
      return true;
    case APP_SHORTCUT_IDS.quickTask:
      return openQuickStartShortcut("task", callbacks);
    case APP_SHORTCUT_IDS.quickNote:
      return openQuickStartShortcut("note", callbacks);
    case APP_SHORTCUT_IDS.quickList:
      return openQuickStartShortcut("list", callbacks);
    case APP_SHORTCUT_IDS.focusSearch:
      if (!callbacks.workspaceOpen) {
        return false;
      }
      callbacks.navigate("/search");
      return true;
    case APP_SHORTCUT_IDS.goToday:
      if (!callbacks.workspaceOpen) {
        return false;
      }
      callbacks.navigate("/today");
      return true;
    default:
      return false;
  }
}

export function shortcutToActionShortcut(id: AppShortcutId): ActionShortcut {
  const shortcut = appShortcutRegistry.get(id);

  if (shortcut === null) {
    throw new Error(`Unknown app shortcut: ${id}`);
  }

  const actionShortcut: ActionShortcut = {
    key: shortcut.binding.key,
    label: shortcut.displayLabel
  };

  if (shortcut.binding.ctrl !== undefined || shortcut.binding.primary) {
    actionShortcut.ctrl = shortcut.binding.ctrl ?? true;
  }

  if (shortcut.binding.meta !== undefined) {
    actionShortcut.meta = shortcut.binding.meta;
  }

  if (shortcut.binding.shift !== undefined) {
    actionShortcut.shift = shortcut.binding.shift;
  }

  if (shortcut.binding.alt !== undefined) {
    actionShortcut.alt = shortcut.binding.alt;
  }

  return actionShortcut;
}

export function getQuickAddContext(pathname: string): QuickAddContext {
  const projectMatch = /^\/projects\/([^/]+)$/.exec(pathname);
  const projectId = projectMatch?.[1];
  const contactMatch = /^\/contacts\/([^/]+)$/.exec(pathname);
  const contactId = contactMatch?.[1];

  if (projectId !== undefined) {
    return {
      projectId,
      containerId: projectId,
      containerType: "project"
    };
  }

  if (contactId !== undefined) {
    return {
      contactId,
      containerId: contactId,
      containerType: "contact"
    };
  }

  return {};
}

function openQuickStartShortcut(
  initialActionId: QuickStartActionKind,
  callbacks: AppShortcutCallbacks
): boolean {
  if (!callbacks.workspaceOpen) {
    return false;
  }

  callbacks.openQuickAdd({
    ...getQuickAddContext(callbacks.currentPathname),
    initialActionId
  });
  return true;
}
