import {
  createIsoTimestamp,
  createLocalDayRange,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  RelationshipRepository,
  TaskRepository,
  type ActivityLogRecord,
  type DatabaseConnection,
  type ItemRecord,
  type RelationshipRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import type { ContactRecord } from "./ContactCommands";
import { formatActivityEvent, type ActivityEventView } from "../activity";

export type ContactTimelineFilter =
  | "all"
  | "activity"
  | "content"
  | "follow_up"
  | "relationship";

export type ContactTimelineEntryKind =
  | "activity"
  | "task"
  | "note"
  | "file"
  | "link"
  | "list"
  | "relationship"
  | "item";

export type ContactFollowUpTaskSummary = {
  itemId: string;
  title: string;
  status: string;
  dueAt: string | null;
  priority: number | null;
  overdue: boolean;
};

export type ContactFollowUpSummary = {
  generatedAt: string;
  openFollowUpCount: number;
  overdueTaskCount: number;
  nextDueTask: ContactFollowUpTaskSummary | null;
  openFollowUps: ContactFollowUpTaskSummary[];
};

export type ContactTimelineEntry = {
  id: string;
  kind: ContactTimelineEntryKind;
  sourceType: "activity" | "item" | "relationship";
  title: string;
  description: string | null;
  occurredAt: string;
  targetType: string;
  targetId: string;
  itemType: string | null;
  status: string | null;
  dueAt: string | null;
  overdue: boolean;
  activityAction: string | null;
  actorLabel: string | null;
  relationshipLabel: string | null;
  relatedTargetName: string | null;
};

export type ContactTimelineInput = {
  contactId: string;
  filter?: ContactTimelineFilter;
  itemTypes?: string[];
  includeCompleted?: boolean;
  limit?: number;
};

export type ContactTimelineViewModel = {
  contact: ContactRecord;
  generatedAt: string;
  filter: ContactTimelineFilter;
  itemTypes: string[];
  followUpSummary: ContactFollowUpSummary;
  entries: ContactTimelineEntry[];
};

export class ContactTimelineService {
  readonly module = "contacts.timeline";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getTimeline(input: ContactTimelineInput): ContactTimelineViewModel {
    validateNonEmptyString(input.contactId, "contactId");
    const contact = this.requireContact(input.contactId);
    const generatedAt = createIsoTimestamp(this.now());
    const filter = input.filter ?? "all";
    const itemTypes = normalizeItemTypes(input.itemTypes);
    const tasks = new TaskRepository(this.connection).listByContainer(contact.id);
    const items = new ItemRepository(this.connection).listByContainer(contact.id, {
      includeArchived: false,
      includeDeleted: false
    });
    const relationships = new RelationshipRepository(this.connection).listBacklinks({
      workspaceId: contact.workspaceId,
      target: { type: "container", id: contact.id }
    });
    const followUpSummary = this.buildFollowUpSummary(tasks, generatedAt);
    const itemEntries = items
      .filter((item) => shouldIncludeItem(item, input.includeCompleted === true))
      .filter((item) => itemTypes.length === 0 || itemTypes.includes(item.type))
      .map((item) => this.toItemEntry(item, tasks));
    const relationshipEntries = relationships.map(({ relationship }) =>
      this.toRelationshipEntry(relationship, contact.id)
    );
    const activityEntries = this.listRelevantActivity(contact.id, items, relationships.map(({ relationship }) => relationship))
      .map(toActivityEntry);

    const entries = [
      ...itemEntries,
      ...relationshipEntries,
      ...activityEntries
    ]
      .filter((entry) => matchesFilter(entry, filter))
      .sort(compareTimelineEntries)
      .slice(0, normalizeLimit(input.limit));

    return {
      contact,
      generatedAt,
      filter,
      itemTypes,
      followUpSummary,
      entries
    };
  }

  private buildFollowUpSummary(
    tasks: TaskWithItemRecord[],
    generatedAt: string
  ): ContactFollowUpSummary {
    const todayStart = createLocalDayRange(this.now()).startInclusive;
    const openFollowUps = tasks
      .filter(({ item, task }) =>
        item.completedAt === null &&
        task.completedAt === null &&
        (task.taskStatus === "open" || task.taskStatus === "waiting")
      )
      .map(({ item, task }) => ({
        itemId: item.id,
        title: item.title,
        status: task.taskStatus,
        dueAt: task.dueAt,
        priority: task.priority,
        overdue: task.dueAt !== null && task.dueAt < todayStart
      }))
      .sort(compareFollowUps);

    return {
      generatedAt,
      openFollowUpCount: openFollowUps.length,
      overdueTaskCount: openFollowUps.filter((task) => task.overdue).length,
      nextDueTask: openFollowUps.find((task) => task.dueAt !== null) ?? null,
      openFollowUps: openFollowUps.slice(0, 5)
    };
  }

  private toItemEntry(
    item: ItemRecord,
    tasks: TaskWithItemRecord[]
  ): ContactTimelineEntry {
    const task = item.type === "task"
      ? tasks.find((candidate) => candidate.item.id === item.id)?.task ?? null
      : null;
    const attachment = item.type === "file"
      ? new AttachmentRepository(this.connection).listForItem({
          workspaceId: item.workspaceId,
          itemId: item.id
        })[0] ?? null
      : null;
    const title = attachment === null
      ? item.title
      : `${item.title} (${attachment.originalName})`;

    return {
      id: `item:${item.id}`,
      kind: toTimelineItemKind(item.type),
      sourceType: "item",
      title,
      description: item.body,
      occurredAt: item.updatedAt || item.createdAt,
      targetType: "item",
      targetId: item.id,
      itemType: item.type,
      status: task?.taskStatus ?? item.status,
      dueAt: task?.dueAt ?? null,
      overdue: isTaskOverdue(task?.dueAt ?? null, this.now),
      activityAction: null,
      actorLabel: null,
      relationshipLabel: null,
      relatedTargetName: null
    };
  }

  private toRelationshipEntry(
    relationship: RelationshipRecord,
    contactId: string
  ): ContactTimelineEntry {
    const relatedId = relationship.sourceId === contactId
      ? relationship.targetId
      : relationship.sourceId;
    const relatedType = relationship.sourceId === contactId
      ? relationship.targetType
      : relationship.sourceType;
    const relatedName = relatedType === "container"
      ? new ContainerRepository(this.connection).getById(relatedId)?.name ?? relatedId
      : relatedId;
    const label = relationship.label ?? relationship.relationType;

    return {
      id: `relationship:${relationship.id}`,
      kind: "relationship",
      sourceType: "relationship",
      title: `Related ${formatObjectType(relatedType)}: ${relatedName}`,
      description: `Marked as ${label.replaceAll("_", " ")}.`,
      occurredAt: relationship.createdAt,
      targetType: "relationship",
      targetId: relationship.id,
      itemType: null,
      status: relationship.deletedAt === null ? "active" : "deleted",
      dueAt: null,
      overdue: false,
      activityAction: null,
      actorLabel: null,
      relationshipLabel: relationship.label,
      relatedTargetName: relatedName
    };
  }

  private listRelevantActivity(
    contactId: string,
    items: ItemRecord[],
    relationships: RelationshipRecord[]
  ): ActivityEventView[] {
    const repository = new ActivityLogRepository(this.connection);
    const records = new Map<string, ActivityLogRecord>();

    for (const event of repository.listForTarget("container", contactId, 100)) {
      records.set(event.id, event);
    }

    for (const item of items) {
      for (const event of repository.listForTarget("item", item.id, 100)) {
        records.set(event.id, event);
      }
    }

    for (const relationship of relationships) {
      for (const event of repository.listForTarget("relationship", relationship.id, 100)) {
        records.set(event.id, event);
      }
    }

    return [...records.values()].map(formatActivityEvent);
  }

  private requireContact(contactId: string): ContactRecord {
    const container = new ContainerRepository(this.connection).getById(contactId);

    if (container === null || container.type !== "contact") {
      throw new Error(`Contact was not found: ${contactId}.`);
    }

    return container as ContactRecord;
  }
}

function toActivityEntry(activity: ActivityEventView): ContactTimelineEntry {
  return {
    id: `activity:${activity.id}`,
    kind: "activity",
    sourceType: "activity",
    title: activity.actionLabel,
    description: activity.description,
    occurredAt: activity.createdAt,
    targetType: activity.targetType,
    targetId: activity.targetId,
    itemType: null,
    status: null,
    dueAt: null,
    overdue: false,
    activityAction: activity.action,
    actorLabel: activity.actorLabel,
    relationshipLabel: null,
    relatedTargetName: null
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return 50;
  }

  return Math.min(Math.floor(limit), 100);
}

function normalizeItemTypes(itemTypes: string[] | undefined): string[] {
  if (itemTypes === undefined) {
    return [];
  }

  return [...new Set(itemTypes.map((type) => type.trim()).filter(Boolean))];
}

function toTimelineItemKind(itemType: string): ContactTimelineEntryKind {
  if (
    itemType === "task" ||
    itemType === "note" ||
    itemType === "file" ||
    itemType === "link" ||
    itemType === "list"
  ) {
    return itemType;
  }

  return "item";
}

function shouldIncludeItem(item: ItemRecord, includeCompleted: boolean): boolean {
  if (includeCompleted) {
    return true;
  }

  return item.completedAt === null && item.status !== "completed";
}

function matchesFilter(
  entry: ContactTimelineEntry,
  filter: ContactTimelineFilter
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "content") {
    return entry.sourceType === "item";
  }

  if (filter === "follow_up") {
    return entry.kind === "task" && entry.status !== "done";
  }

  if (filter === "relationship") {
    return entry.sourceType === "relationship";
  }

  return entry.sourceType === "activity";
}

function compareTimelineEntries(
  left: ContactTimelineEntry,
  right: ContactTimelineEntry
): number {
  return (
    right.occurredAt.localeCompare(left.occurredAt) ||
    left.kind.localeCompare(right.kind) ||
    left.id.localeCompare(right.id)
  );
}

function compareFollowUps(
  left: ContactFollowUpTaskSummary,
  right: ContactFollowUpTaskSummary
): number {
  if (left.dueAt === null && right.dueAt !== null) {
    return 1;
  }

  if (left.dueAt !== null && right.dueAt === null) {
    return -1;
  }

  return (
    (left.dueAt ?? "").localeCompare(right.dueAt ?? "") ||
    left.title.localeCompare(right.title) ||
    left.itemId.localeCompare(right.itemId)
  );
}

function isTaskOverdue(dueAt: string | null, now: Clock): boolean {
  return dueAt !== null && dueAt < createLocalDayRange(now()).startInclusive;
}

function formatObjectType(value: string): string {
  return value.replaceAll("_", " ");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
