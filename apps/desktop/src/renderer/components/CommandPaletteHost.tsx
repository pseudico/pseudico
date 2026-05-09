import {
  createActionRegistry,
  type ActionDescriptor,
  type ActionRegistry,
  type ResolvedAction
} from "@local-work-os/core";
import { CommandPalette, type CommandPaletteAction } from "@local-work-os/ui";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appRoutes } from "../routes";
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
const paletteShortcut = {
  key: "k",
  ctrl: true,
  meta: true,
  label: "Ctrl/⌘ K"
};

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
        action.shortcut = { key: "f", ctrl: true, label: "Ctrl F" };
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
      shortcut: { key: "n", ctrl: true, label: "Ctrl N" },
      disabled: (context) =>
        context.workspaceOpen ? false : workspaceRequiredMessage,
      execute: (context) => {
        options.openQuickAdd(getQuickAddContext(context.currentPathname));
      }
    },
    {
      id: "palette.open",
      title: "Open command palette",
      group: "Navigation",
      subtitle: "Search for routes and actions.",
      keywords: ["commands", "shortcuts", "actions"],
      shortcut: paletteShortcut,
      execute: () => undefined
    }
  ]);
}

export function isPaletteShortcut(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey">
): boolean {
  return (
    event.key.toLocaleLowerCase() === "k" && (event.ctrlKey || event.metaKey)
  );
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
