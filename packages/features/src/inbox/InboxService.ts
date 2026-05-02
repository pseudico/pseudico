import type { FeatureModuleContract } from "../featureModuleContract";
import { createLocalId } from "@local-work-os/core";
import {
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import { ItemService, type ItemMutationResult } from "../items";

export type InboxServiceIdFactory = (prefix: string) => string;

export type MoveInboxItemToProjectInput = {
  itemId: string;
  projectId: string;
};

// Owns quick capture and triage operations.
// Does not own type-specific item persistence or search internals.
export class InboxService {
  readonly module = "inbox";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: InboxServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: InboxServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  getInbox(workspaceId: string): ContainerRecord {
    validateNonEmptyString(workspaceId, "workspaceId");

    const inbox = new ContainerRepository(this.connection).findSystemInbox(
      workspaceId
    );

    if (inbox === null) {
      throw new Error(`System Inbox was not found for workspace: ${workspaceId}.`);
    }

    return inbox;
  }

  listInboxItems(workspaceId: string): ItemRecord[] {
    const inbox = this.getInbox(workspaceId);

    return new ItemService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).listItemsByContainer({
      containerId: inbox.id
    });
  }

  async moveInboxItemToProject(
    input: MoveInboxItemToProjectInput
  ): Promise<ItemMutationResult> {
    validateNonEmptyString(input.itemId, "itemId");
    validateNonEmptyString(input.projectId, "projectId");

    const item = this.requireActiveInboxItem(input.itemId);
    const project = this.requireActiveProject(input.projectId, item.workspaceId);
    const targetDefaultTab = new ContainerTabRepository(
      this.connection
    ).findDefaultTab(project.id);

    if (targetDefaultTab === null) {
      throw new Error(`Project default tab was not found: ${project.id}.`);
    }

    return await new ItemService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).moveItem({
      itemId: item.id,
      targetContainerId: project.id,
      targetContainerTabId: targetDefaultTab.id
    });
  }

  private requireActiveInboxItem(itemId: string): ItemRecord {
    const item = new ItemRepository(this.connection).getById(itemId);

    if (item === null) {
      throw new Error(`Inbox item was not found: ${itemId}.`);
    }

    const inbox = this.getInbox(item.workspaceId);

    if (item.containerId !== inbox.id) {
      throw new Error("Item is not in the Inbox.");
    }

    if (item.archivedAt !== null) {
      throw new Error("Archived Inbox items cannot be moved.");
    }

    return item;
  }

  private requireActiveProject(
    projectId: string,
    workspaceId: string
  ): ContainerRecord {
    const project = new ContainerRepository(this.connection).getById(projectId);

    if (
      project === null ||
      project.workspaceId !== workspaceId ||
      project.type !== "project"
    ) {
      throw new Error(`Project was not found: ${projectId}.`);
    }

    if (project.archivedAt !== null || project.status !== "active") {
      throw new Error("Inbox items can only be moved to active projects.");
    }

    return project;
  }
}

export const inboxModuleContract = {
  module: "inbox",
  purpose: "Capture and triage work before it is filed into a durable context.",
  owns: ["quick capture", "inbox triage", "movement out of Inbox"],
  doesNotOwn: ["project/contact persistence", "item type internals", "search index implementation"],
  integrationPoints: ["tasks", "notes", "files", "links", "metadata", "today", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
