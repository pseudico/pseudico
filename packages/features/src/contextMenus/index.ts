import type {
  ContextMenuActionDescriptor,
  ContextMenuTarget,
  ResolvedContextMenuAction
} from "@local-work-os/core";
import {
  defaultContextMenuActions,
  resolveContextMenuActions
} from "@local-work-os/core";
import type { FeatureModuleContract } from "../featureModuleContract";

export const contextMenusModuleContract: FeatureModuleContract = {
  module: "context-menus",
  purpose:
    "Coordinate local context menu targets and action providers for containers, items, metadata, files, and saved views.",
  owns: ["context menu target contracts", "context action filtering", "shared menu action groups"],
  doesNotOwn: ["domain writes that bypass feature services", "operating system shell menus", "cloud sharing"],
  integrationPoints: ["action registry", "items", "projects", "metadata", "files", "saved views"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export type ContextMenuActionProviderContext = {
  target: ContextMenuTarget;
};

export type ContextMenuActionProvider = {
  module: string;
  getActions: (
    context: ContextMenuActionProviderContext
  ) => readonly ContextMenuActionDescriptor[];
};

export const defaultContextMenuActionProvider: ContextMenuActionProvider = {
  module: "context-menus.default",
  getActions: () => defaultContextMenuActions
};

export const contextMenuActionProviders = [
  defaultContextMenuActionProvider
] as const;

export function getContextMenuActions(
  context: ContextMenuActionProviderContext,
  providers: readonly ContextMenuActionProvider[] = contextMenuActionProviders
): ResolvedContextMenuAction[] {
  return resolveContextMenuActions({
    target: context.target,
    actions: providers.flatMap((provider) => provider.getActions(context))
  });
}

