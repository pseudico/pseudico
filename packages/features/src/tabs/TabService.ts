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
};

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

  listTabs(containerId: string): ContainerTabRecord[] {
    validateNonEmptyString(containerId, "containerId");
    this.requireEditableTabContainer(containerId);

    return new ContainerTabRepository(this.connection).listByContainer(containerId);
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

      if (
        new ItemRepository(this.connection).listByContainerTab(
          before.containerId,
          before.id,
          { includeArchived: false, includeDeleted: false }
        ).length > 0
      ) {
        throw new Error("Move or delete tab items before deleting this tab.");
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
        afterJson: JSON.stringify(tab),
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
  owns: ["container tab mutations", "tab ordering", "tab activity events"],
  doesNotOwn: ["item content editors", "raw renderer database access"],
  integrationPoints: ["projects", "contacts", "items", "activity log"],
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
