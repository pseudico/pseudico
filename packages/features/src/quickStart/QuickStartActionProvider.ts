export type QuickStartActionKind =
  | "task"
  | "note"
  | "list"
  | "file"
  | "link"
  | "project"
  | "contact";

export type QuickStartTargetType = "inbox" | "project" | "contact";

export type QuickStartTarget = {
  id: string;
  name: string;
  type: QuickStartTargetType;
  description?: string | null;
  status?: string | null;
  deletedAt?: string | null;
};

export type QuickStartContext = {
  containerId?: string | null;
  containerType?: QuickStartTargetType | null;
  containerTabId?: string | null;
};

export type QuickStartAction = {
  id: QuickStartActionKind;
  title: string;
  description: string;
  group: "Capture" | "Containers";
  targetRequired: boolean;
  disabledReason: string | null;
};

export type QuickStartActionProvider = {
  module: string;
  getActions: (context: QuickStartActionProviderContext) => QuickStartAction[];
};

export type QuickStartActionProviderContext = {
  workspaceOpen: boolean;
  targetAvailable: boolean;
};

export type ResolveQuickStartTargetsInput = {
  context?: QuickStartContext;
  inbox: QuickStartTarget;
  projects?: readonly QuickStartTarget[];
  contacts?: readonly QuickStartTarget[];
};

export type QuickStartTargetResolution = {
  defaultContainerId: string;
  defaultContainerTabId: string | null;
  inbox: QuickStartTarget;
  targets: QuickStartTarget[];
};

const workspaceRequiredMessage = "Open a local workspace first.";
const targetRequiredMessage = "Create or open an Inbox, project, or contact before saving content.";

export const taskQuickStartActionProvider: QuickStartActionProvider = {
  module: "tasks",
  getActions: (context) => [
    contentAction("task", "New task", "Create a task in the current container or Inbox.", context)
  ]
};

export const noteQuickStartActionProvider: QuickStartActionProvider = {
  module: "notes",
  getActions: (context) => [
    contentAction("note", "New note", "Create a markdown note in the current container or Inbox.", context)
  ]
};

export const listQuickStartActionProvider: QuickStartActionProvider = {
  module: "lists",
  getActions: (context) => [
    contentAction("list", "New list", "Create a checklist in the current container or Inbox.", context)
  ]
};

export const fileQuickStartActionProvider: QuickStartActionProvider = {
  module: "files",
  getActions: (context) => [
    contentAction("file", "Attach file", "Attach a local file to the current container or Inbox.", context)
  ]
};

export const linkQuickStartActionProvider: QuickStartActionProvider = {
  module: "links",
  getActions: (context) => [
    contentAction("link", "New link", "Save a local link item in the current container or Inbox.", context)
  ]
};

export const projectQuickStartActionProvider: QuickStartActionProvider = {
  module: "projects",
  getActions: (context) => [
    containerAction("project", "New project", "Create a local project container.", context)
  ]
};

export const contactQuickStartActionProvider: QuickStartActionProvider = {
  module: "contacts",
  getActions: (context) => [
    containerAction("contact", "New contact", "Create a local contact container.", context)
  ]
};

export const quickStartActionProviders = [
  taskQuickStartActionProvider,
  noteQuickStartActionProvider,
  listQuickStartActionProvider,
  fileQuickStartActionProvider,
  linkQuickStartActionProvider,
  projectQuickStartActionProvider,
  contactQuickStartActionProvider
] as const;

export function getQuickStartActions(
  context: QuickStartActionProviderContext,
  providers: readonly QuickStartActionProvider[] = quickStartActionProviders
): QuickStartAction[] {
  return providers.flatMap((provider) => provider.getActions(context));
}

export function resolveQuickStartTargets(
  input: ResolveQuickStartTargetsInput
): QuickStartTargetResolution {
  const projects = filterActiveTargets(input.projects ?? []);
  const contacts = filterActiveTargets(input.contacts ?? []);
  const targets = [input.inbox, ...projects, ...contacts];
  const contextTarget = targets.find(
    (target) =>
      target.id === input.context?.containerId &&
      (input.context?.containerType == null || target.type === input.context.containerType)
  );

  return {
    inbox: input.inbox,
    targets,
    defaultContainerId: contextTarget?.id ?? input.inbox.id,
    defaultContainerTabId: contextTarget === undefined ? null : input.context?.containerTabId ?? null
  };
}

export function isContentQuickStartAction(kind: QuickStartActionKind): boolean {
  return ["task", "note", "list", "file", "link"].includes(kind);
}

function contentAction(
  id: QuickStartActionKind,
  title: string,
  description: string,
  context: QuickStartActionProviderContext
): QuickStartAction {
  return {
    id,
    title,
    description,
    group: "Capture",
    targetRequired: true,
    disabledReason: getDisabledReason(context, true)
  };
}

function containerAction(
  id: QuickStartActionKind,
  title: string,
  description: string,
  context: QuickStartActionProviderContext
): QuickStartAction {
  return {
    id,
    title,
    description,
    group: "Containers",
    targetRequired: false,
    disabledReason: getDisabledReason(context, false)
  };
}

function getDisabledReason(
  context: QuickStartActionProviderContext,
  targetRequired: boolean
): string | null {
  if (!context.workspaceOpen) {
    return workspaceRequiredMessage;
  }

  if (targetRequired && !context.targetAvailable) {
    return targetRequiredMessage;
  }

  return null;
}

function filterActiveTargets(
  targets: readonly QuickStartTarget[]
): QuickStartTarget[] {
  return targets.filter(
    (target) => target.status === "active" && target.deletedAt == null
  );
}
