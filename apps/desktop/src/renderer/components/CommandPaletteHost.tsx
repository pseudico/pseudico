import {
  APP_SHORTCUT_IDS,
  type ShortcutKeyboardEventLike,
  createActionRegistry,
  type ActionDescriptor,
  type ActionRegistry,
  type ResolvedAction
} from "@local-work-os/core";
import { CommandPalette, type CommandPaletteAction } from "@local-work-os/ui";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appRoutes } from "../routes";
import type { QuickStartActionKind } from "@local-work-os/features/quickStart";
import {
  getQuickAddContext,
  resolveGlobalAppShortcut,
  shortcutToActionShortcut
} from "../shortcuts/appShortcuts";
import type { QuickAddContext } from "./QuickAddModal";

export type AppActionContext = {
  currentPathname: string;
  workspaceOpen: boolean;
};

export type AppActionRegistryOptions = {
  navigate: (path: string) => void;
  openQuickAdd: (context?: QuickAddContext) => void;
};

const workspaceRequiredMessage = "Open a local workspace first.";
export function CommandPaletteHost({
  open,
  onClose,
  onOpen,
  openQuickAdd,
  workspaceOpen
}: {
  open: boolean;
  workspaceOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  openQuickAdd: (context?: QuickAddContext) => void;
}): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const registry = useMemo(
    () =>
      createAppActionRegistry({
        navigate: (path) => navigate(path),
        openQuickAdd
      }),
    [navigate, openQuickAdd]
  );
  const context = useMemo(
    () => ({
      currentPathname: location.pathname,
      workspaceOpen
    }),
    [location.pathname, workspaceOpen]
  );
  const actions = useMemo(
    () =>
      registry.search({
        context,
        query,
        limit: 12
      }),
    [context, query, registry]
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent): void {
      if (!isPaletteShortcut(event)) {
        return;
      }

      event.preventDefault();
      onOpen();
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [onOpen]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveActionId(null);
      return;
    }

    setActiveActionId((current) => current ?? actions[0]?.id ?? null);
  }, [actions, open]);

  function executeAction(actionId: string): void {
    const action = actions.find((candidate) => candidate.id === actionId);

    if (action === undefined || action.disabledReason !== null) {
      return;
    }

    void action.execute(context);
    onClose();
  }

  return (
    <CommandPalette
      actions={actions.map(toCommandPaletteAction)}
      activeActionId={activeActionId}
      open={open}
      query={query}
      placeholder="Search navigation and local actions"
      onClose={onClose}
      onExecute={executeAction}
      onHighlight={setActiveActionId}
      onQueryChange={(nextQuery) => {
        setQuery(nextQuery);
        setActiveActionId(null);
      }}
    />
  );
}

export function createAppActionRegistry(
  options: AppActionRegistryOptions
): ActionRegistry<AppActionContext> {
  const navigationActions = appRoutes
    .filter((route) => route.path !== "/welcome")
    .map<ActionDescriptor<AppActionContext>>((route) => {
      const action: ActionDescriptor<AppActionContext> = {
        id: `nav.${route.id}`,
        title: `Go to ${route.label}`,
        group: "Navigation",
        subtitle: route.summary,
        keywords: [route.id, route.label, route.title, route.path],
        disabled: (context) =>
          !context.workspaceOpen && route.id !== "workspace"
            ? workspaceRequiredMessage
            : false,
        execute: () => {
          options.navigate(route.path);
        }
      };

      if (route.id === "search") {
        action.shortcut = shortcutToActionShortcut(APP_SHORTCUT_IDS.focusSearch);
      }

      if (route.id === "today") {
        action.shortcut = shortcutToActionShortcut(APP_SHORTCUT_IDS.goToday);
      }

      return action;
    });

  return createActionRegistry<AppActionContext>([
    ...navigationActions,
    {
      id: "quick-add.task",
      title: "Quick Start",
      group: "Capture",
      subtitle: "Create a task, note, list, file, link, project, or contact.",
      keywords: ["capture", "quick start", "new task", "note", "list", "file", "link", "project", "contact", "inbox"],
      shortcut: shortcutToActionShortcut(APP_SHORTCUT_IDS.quickTask),
      disabled: (context) =>
        context.workspaceOpen ? false : workspaceRequiredMessage,
      execute: (context) => {
        options.openQuickAdd({
          ...getQuickAddContext(context.currentPathname),
          initialActionId: "task"
        });
      }
    },
    quickStartAction("quick-add.note", "New note", "Create a markdown note in the current container or Inbox.", "note", APP_SHORTCUT_IDS.quickNote, options),
    quickStartAction("quick-add.list", "New list", "Create a checklist in the current container or Inbox.", "list", APP_SHORTCUT_IDS.quickList, options),
    {
      id: "palette.open",
      title: "Open command palette",
      group: "Navigation",
      subtitle: "Search for routes and actions.",
      keywords: ["commands", "shortcuts", "actions"],
      shortcut: shortcutToActionShortcut(APP_SHORTCUT_IDS.openCommandPalette),
      execute: () => undefined
    }
  ]);
}

export function isPaletteShortcut(event: ShortcutKeyboardEventLike): boolean {
  return resolveGlobalAppShortcut(event)?.id === APP_SHORTCUT_IDS.openCommandPalette;
}

function quickStartAction(
  id: string,
  title: string,
  subtitle: string,
  initialActionId: QuickStartActionKind,
  shortcutId: Parameters<typeof shortcutToActionShortcut>[0],
  options: AppActionRegistryOptions
): ActionDescriptor<AppActionContext> {
  return {
    id,
    title,
    group: "Capture",
    subtitle,
    keywords: ["capture", title, initialActionId, "quick start"],
    shortcut: shortcutToActionShortcut(shortcutId),
    disabled: (context) =>
      context.workspaceOpen ? false : workspaceRequiredMessage,
    execute: (context) => {
      options.openQuickAdd({
        ...getQuickAddContext(context.currentPathname),
        initialActionId
      });
    }
  };
}

function toCommandPaletteAction(
  action: ResolvedAction<AppActionContext>
): CommandPaletteAction {
  const viewModel: CommandPaletteAction = {
    id: action.id,
    title: action.title,
    group: action.group,
    disabledReason: action.disabledReason
  };

  if (action.subtitle !== undefined) {
    viewModel.subtitle = action.subtitle;
  }

  if (action.shortcut !== undefined) {
    viewModel.shortcut = action.shortcut;
  }

  return viewModel;
}
export { getQuickAddContext } from "../shortcuts/appShortcuts";
