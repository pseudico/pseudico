import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  TabSummaryRepository,
  TransactionService,
  type ContainerRecord,
  type ContainerTabRecord,
  type DatabaseConnection,
  type TabSummaryRecord
} from "@local-work-os/db";

export type TabServiceIdFactory = (prefix: string) => string;

export type CreateTabInput = {
  containerId: string;
  name: string;
  actorType?: ActivityActorType;
  description?: string | null;
  sortOrder?: number;
};

export type RenameTabInput = {
  tabId: string;
  name: string;
  actorType?: ActivityActorType;
  description?: string | null;
};

export type ReorderTabsInput = {
  containerId: string;
  tabIds: string[];
  actorType?: ActivityActorType;
};

export type DeleteTabInput = {
  tabId: string;
  actorType?: ActivityActorType;
  itemHandling?: "reject" | "move_to_default" | "archive_items";
  targetTabId?: string | null;
};

export type ListTabsInput = {
  includeHidden?: boolean;
  includeArchived?: boolean;
};

export type TabVisibilityInput = {
  tabId: string;
  actorType?: ActivityActorType;
};

export type DuplicateTabInput = {
  tabId: string;
  actorType?: ActivityActorType;
  name?: string;
};

export type ArchiveTabInput = {
  tabId: string;
  actorType?: ActivityActorType;
};

export type CreateTabFromTemplateInput = {
  containerId: string;
  templateId: string;
  actorType?: ActivityActorType;
  name?: string;
};

export type TabTemplateDefinition = {
  id: string;
  name: string;
  description: string | null;
};

const BUILT_IN_TAB_TEMPLATES = [
  {
    id: "tab_template_planning",
    name: "Planning",
    description: "A space for goals, milestones, decisions, and next steps."
  },
  {
    id: "tab_template_documents",
    name: "Documents",
    description: "A space for files, reference links, and supporting notes."
  },
  {
    id: "tab_template_meetings",
    name: "Meetings",
    description: "A space for agendas, meeting notes, and follow-up tasks."
  }
] as const satisfies readonly TabTemplateDefinition[];

export class TabTemplateService {
  listTabTemplates(): TabTemplateDefinition[] {
    return BUILT_IN_TAB_TEMPLATES.map((template) => ({ ...template }));
  }

  requireTabTemplate(templateId: string): TabTemplateDefinition {
    const template = this.listTabTemplates().find((entry) => entry.id === templateId);

    if (template === undefined) {
      throw new Error(`Tab template was not found: ${templateId}.`);
    }

    return template;
  }
}

export class TabService {
  readonly module = "tabs";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TabServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TabServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  listTabTemplates(): TabTemplateDefinition[] {
    return new TabTemplateService().listTabTemplates();
  }

  listTabs(containerId: string, input: ListTabsInput = {}): ContainerTabRecord[] {
    validateNonEmptyString(containerId, "containerId");
    this.requireEditableTabContainer(containerId);

    return new ContainerTabRepository(this.connection).listByContainer(containerId, input);
  }


  listTabSummaries(
    containerId: string,
    input: { todayStart: string; previewLimit?: number }
  ): TabSummaryRecord[] {
    validateNonEmptyString(containerId, "containerId");
    validateNonEmptyString(input.todayStart, "todayStart");
    this.requireEditableTabContainer(containerId);

    return new TabSummaryRepository(this.connection).listByContainer({
      containerId,
      todayStart: input.todayStart,
      ...(input.previewLimit === undefined ? {} : { previewLimit: input.previewLimit })
    });
  }

  async createTab(input: CreateTabInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.name, "name");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const container = this.requireEditableTabContainer(input.containerId);
      const tabRepository = new ContainerTabRepository(this.connection);
      const nextSortOrder =
        input.sortOrder ??
        Math.max(-1, ...tabRepository.listByContainer(container.id).map((tab) => tab.sortOrder)) + 1;
      const tab = tabRepository.create({
        id: this.idFactory("container_tab"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        name: input.name.trim(),
        description: normalizeNullableString(input.description),
        sortOrder: nextSortOrder,
        timestamp
      });

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabCreated,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Created tab "${tab.name}" for ${container.type} "${container.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async createTabFromTemplate(
    input: CreateTabFromTemplateInput
  ): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.templateId, "templateId");

    return await this.transactionService.runInTransaction(() => {
      const template = new TabTemplateService().requireTabTemplate(input.templateId);
      const timestamp = createIsoTimestamp(this.now());
      const container = this.requireEditableTabContainer(input.containerId);
      const tabRepository = new ContainerTabRepository(this.connection);
      const nextSortOrder =
        Math.max(-1, ...tabRepository.listByContainer(container.id, {
          includeHidden: true,
          includeArchived: true
        }).map((tab) => tab.sortOrder)) + 1;
      const tab = tabRepository.create({
        id: this.idFactory("container_tab"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        name: normalizeOptionalString(input.name) ?? template.name,
        description: template.description,
        sortOrder: nextSortOrder,
        timestamp
      });

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabTemplateApplied,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Created tab "${tab.name}" from template for ${container.type} "${container.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify({ tab, template }),
        timestamp
      });

      return tab;
    });
  }

  async renameTab(input: RenameTabInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");
    validateNonEmptyString(input.name, "name");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tabRepository = new ContainerTabRepository(this.connection);
      const before = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(before.containerId);
      const patch = {
        name: input.name.trim(),
        timestamp
      };

      const tab = tabRepository.update(input.tabId, {
        ...patch,
        ...(input.description === undefined
          ? {}
          : { description: normalizeNullableString(input.description) })
      });

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabUpdated,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Renamed tab "${before.name}" to "${tab.name}" for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async reorderTabs(input: ReorderTabsInput): Promise<ContainerTabRecord[]> {
    validateNonEmptyString(input.containerId, "containerId");

    if (input.tabIds.length === 0) {
      throw new Error("tabIds must include at least one tab.");
    }

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const container = this.requireEditableTabContainer(input.containerId);
      const tabRepository = new ContainerTabRepository(this.connection);
      const beforeTabs = tabRepository.listByContainer(container.id);
      const beforeIds = beforeTabs.map((tab) => tab.id);
      const requestedIds = new Set(input.tabIds);

      if (requestedIds.size !== input.tabIds.length) {
        throw new Error("tabIds must not contain duplicates.");
      }

      if (
        beforeIds.length !== input.tabIds.length ||
        beforeIds.some((id) => !requestedIds.has(id))
      ) {
        throw new Error("tabIds must include every active tab for the container.");
      }

      for (const [index, tabId] of input.tabIds.entries()) {
        tabRepository.update(tabId, { sortOrder: index, timestamp });
      }

      const tabs = tabRepository.listByContainer(container.id);

      this.createActivityLogService().logEvent({
        workspaceId: container.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabReordered,
        targetType: "container",
        targetId: container.id,
        summary: `Reordered tabs for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(beforeTabs),
        afterJson: JSON.stringify(tabs),
        timestamp
      });

      return tabs;
    });
  }

  async hideTab(input: TabVisibilityInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tabRepository = new ContainerTabRepository(this.connection);
      const before = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(before.containerId);

      if (before.isDefault) {
        throw new Error("Default tabs cannot be hidden.");
      }

      if (before.hiddenAt === null && tabRepository.countVisibleByContainer(before.containerId) <= 1) {
        throw new Error("A container must keep at least one visible tab.");
      }

      const tab = tabRepository.hide(input.tabId, timestamp);

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabHidden,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Hid tab "${tab.name}" for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async showTab(input: TabVisibilityInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tabRepository = new ContainerTabRepository(this.connection);
      const before = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(before.containerId);
      const tab = tabRepository.show(input.tabId, timestamp);

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabShown,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Showed tab "${tab.name}" for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async duplicateTab(input: DuplicateTabInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const source = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(source.containerId);
      const tabRepository = new ContainerTabRepository(this.connection);
      const nextSortOrder =
        Math.max(-1, ...tabRepository.listByContainer(container.id, {
          includeHidden: true,
          includeArchived: true
        }).map((tab) => tab.sortOrder)) + 1;
      const tab = tabRepository.create({
        id: this.idFactory("container_tab"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        name: normalizeOptionalString(input.name) ?? `${source.name} Copy`,
        description: source.description,
        sortOrder: nextSortOrder,
        timestamp
      });

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabDuplicated,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Duplicated tab "${source.name}" for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(source),
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async archiveTab(input: ArchiveTabInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tabRepository = new ContainerTabRepository(this.connection);
      const before = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(before.containerId);

      if (before.isDefault) {
        throw new Error("Default tabs cannot be archived.");
      }

      if (before.archivedAt === null && tabRepository.countActiveByContainer(before.containerId) <= 1) {
        throw new Error("A container must keep at least one active tab.");
      }

      const tab = tabRepository.archive(input.tabId, timestamp);

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabArchived,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Archived tab "${tab.name}" from ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(tab),
        timestamp
      });

      return tab;
    });
  }

  async deleteTab(input: DeleteTabInput): Promise<ContainerTabRecord> {
    validateNonEmptyString(input.tabId, "tabId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tabRepository = new ContainerTabRepository(this.connection);
      const before = this.requireTab(input.tabId);
      const container = this.requireEditableTabContainer(before.containerId);

      if (before.isDefault) {
        throw new Error("Default tabs cannot be deleted.");
      }

      if (tabRepository.countActiveByContainer(before.containerId) <= 1) {
        throw new Error("A container must keep at least one active tab.");
      }

      const itemRepository = new ItemRepository(this.connection);
      const items = itemRepository.listByContainerTab(
        before.containerId,
        before.id,
        { includeArchived: false, includeDeleted: false }
      );
      const itemHandling = input.itemHandling ?? "reject";

      if (items.length > 0 && itemHandling === "reject") {
        throw new Error("Move or delete tab items before deleting this tab.");
      }

      if (items.length > 0 && itemHandling === "move_to_default") {
        const targetTabId = input.targetTabId ?? tabRepository.findDefaultTab(before.containerId)?.id;

        if (targetTabId === undefined || targetTabId === null || targetTabId === before.id) {
          throw new Error("A target tab is required before deleting a tab with items.");
        }

        const targetTab = this.requireTab(targetTabId);

        if (targetTab.containerId !== before.containerId || targetTab.archivedAt !== null || targetTab.deletedAt !== null) {
          throw new Error("Target tab must be an active tab in the same container.");
        }

        for (const item of items) {
          itemRepository.update(item.id, {
            containerTabId: targetTab.id,
            timestamp
          });
        }
      }

      if (items.length > 0 && itemHandling === "archive_items") {
        for (const item of items) {
          itemRepository.archive(item.id, timestamp);
        }
      }

      const tab = tabRepository.softDelete(input.tabId, timestamp);

      this.createActivityLogService().logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabDeleted,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Deleted tab "${tab.name}" from ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({ tab, itemHandling, itemCount: items.length }),
        timestamp
      });

      return tab;
    });
  }

  private requireTab(tabId: string): ContainerTabRecord {
    const tab = new ContainerTabRepository(this.connection).getById(tabId);

    if (tab === null) {
      throw new Error(`Container tab was not found: ${tabId}.`);
    }

    return tab;
  }

  private requireEditableTabContainer(containerId: string): ContainerRecord {
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    if (container.type !== "project" && container.type !== "contact") {
      throw new Error("Tabs can only be managed for projects and contacts.");
    }

    if (container.isSystem) {
      throw new Error("System containers cannot have editable tabs.");
    }

    return container;
  }

  private createActivityLogService(): ActivityLogService {
    return new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    });
  }
}

export const tabsModuleContract = {
  module: "tabs",
  purpose: "Manage local project/contact content tabs and ordering.",
  owns: [
    "container tab mutations",
    "tab ordering",
    "tab local visibility",
    "built-in tab templates",
    "tab activity events"
  ],
  doesNotOwn: ["item content editors", "raw renderer database access"],
  integrationPoints: ["projects", "contacts", "items", "templates", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
