import type {
  ActivityActorType,
  AttachmentRecord,
  ContactFieldType,
  ListDisplayMode,
  ListItemStatus,
  ListProgressMode,
  TaggingSource
} from "@local-work-os/core";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isContactFieldType,
  isListDisplayMode,
  isListItemStatus,
  isListProgressMode,
  isTaskStatus,
  type TaskStatus
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  CategoryRepository,
  ContactFieldRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  SearchIndexService,
  TagRepository,
  TaskRepository,
  TemplateRepository,
  TransactionService,
  type ContactFieldRecord,
  type ContainerRecord,
  type ContainerTabRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type ListWithItemRecord,
  type TemplateRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { ListService, type ListMutationResult } from "../lists";
import { ContactService, type CreateContactResult } from "../contacts";
import { LinkService } from "../links";
import { NoteService } from "../notes";
import { ProjectService, type CreateProjectResult } from "../projects";
import { TaskService, type TaskMutationResult } from "../tasks";

export const TEMPLATE_JSON_VERSION = 1;
export type TemplateKind = "list" | "project" | "contact";
export type TemplateServiceIdFactory = (prefix: string) => string;

export type TemplateTagRef = {
  tagId: string;
  name: string;
  slug: string;
  source: TaggingSource;
};

export type TemplateDateFields = {
  startAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  startOffsetDays?: number | null;
  dueOffsetDays?: number | null;
  completedOffsetDays?: number | null;
};

export type TemplateListItemJsonV1 = TemplateDateFields & {
  stableId: string;
  parentStableId: string | null;
  title: string;
  body: string | null;
  status: ListItemStatus;
  depth: number;
  sortOrder: number;
  tags: TemplateTagRef[];
};

export type TemplateListJsonV1 = {
  title: string;
  body: string | null;
  categoryId: string | null;
  displayMode: ListDisplayMode;
  showCompleted: boolean;
  progressMode: ListProgressMode;
  tags: TemplateTagRef[];
  items: TemplateListItemJsonV1[];
};

export type TemplateListDefinitionJsonV1 = {
  version: typeof TEMPLATE_JSON_VERSION;
  kind: "list";
  createdFrom: {
    sourceType: "list";
    sourceId: string;
  };
  baseDate: string;
  list: TemplateListJsonV1;
};

export type TemplateContainerKind = "project" | "contact";

export type TemplateContainerJsonV1 = {
  version: typeof TEMPLATE_JSON_VERSION;
  kind: TemplateContainerKind;
  createdFrom: {
    sourceType: TemplateContainerKind;
    sourceId: string;
  };
  baseDate: string;
  container: TemplateContainerSnapshotJsonV1;
};

export type TemplateJsonV1 = TemplateListDefinitionJsonV1 | TemplateContainerJsonV1;

export type TemplateContainerSnapshotJsonV1 = {
  type: TemplateContainerKind;
  name: string;
  description: string | null;
  status: string;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  tags: TemplateTagRef[];
  contactFields: TemplateContactFieldJsonV1[];
  tabs: TemplateContainerTabJsonV1[];
  items: TemplateContainerItemJsonV1[];
};

export type TemplateContactFieldJsonV1 = {
  label: string;
  value: string;
  type: ContactFieldType;
  sortOrder: number;
};

export type TemplateContainerTabJsonV1 = {
  stableId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
};

export type TemplateContainerItemJsonV1 = TemplateDateFields & {
  stableId: string;
  tabStableId: string | null;
  type: "task" | "list" | "note" | "file" | "link";
  title: string;
  body: string | null;
  categoryId: string | null;
  status: string;
  sortOrder: number;
  pinned: boolean;
  tags: TemplateTagRef[];
  task?: {
    taskStatus: TaskStatus;
    priority: number | null;
    allDay: boolean;
    timezone: string | null;
  };
  list?: Omit<TemplateListJsonV1, "title" | "body" | "categoryId" | "tags">;
  note?: {
    content: string;
    format: "markdown";
  };
  filePlaceholder?: {
    originalName: string;
    description: string | null;
    attachments: TemplateFileAttachmentPlaceholderJsonV1[];
  };
  link?: {
    url: string;
    title: string | null;
    description: string | null;
  };
};

export type TemplateFileAttachmentPlaceholderJsonV1 = {
  originalName: string;
  storedName: string;
  mimeType: string | null;
  sizeBytes: number;
  checksum: string | null;
  description: string | null;
  storagePath: string;
};

export type SaveListAsTemplateInput = {
  listId: string;
  name?: string;
  description?: string | null;
  baseDate?: string | Date;
  actorType?: ActivityActorType;
};

export type CreateListFromTemplateInput = {
  templateId: string;
  workspaceId: string;
  containerId: string;
  title?: string;
  containerTabId?: string | null;
  baseDate?: string | Date;
  actorType?: ActivityActorType;
};

export type ListTemplateCreationResult = {
  template: TemplateRecord;
  list: ListMutationResult;
  listItems: ListItemRecord[];
};

export type SaveContainerAsTemplateInput = {
  containerId: string;
  name?: string;
  description?: string | null;
  baseDate?: string | Date;
  actorType?: ActivityActorType;
};

export type CreateContainerFromTemplateInput = {
  templateId: string;
  workspaceId: string;
  name?: string;
  baseDate?: string | Date;
  actorType?: ActivityActorType;
};

export type ContainerTemplateCreationResult = {
  template: TemplateRecord;
  container: CreateProjectResult | CreateContactResult;
  tabs: ContainerTabRecord[];
  items: ItemRecord[];
};

export class TemplateService {
  private readonly repository: TemplateRepository;

  constructor(input: { connection: DatabaseConnection }) {
    this.repository = new TemplateRepository(input.connection);
  }

  validateTemplateJson(json: unknown): TemplateJsonV1 {
    return validateTemplateJson(json);
  }

  listTemplates(input: { workspaceId: string; kind?: TemplateKind }): TemplateRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return this.repository.listByWorkspace({
      workspaceId: input.workspaceId,
      ...(input.kind === undefined ? {} : { kind: input.kind })
    });
  }
}

export class ListTemplateService {
  readonly module = "templates";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TemplateServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TemplateServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async saveListAsTemplate(input: SaveListAsTemplateInput): Promise<TemplateRecord> {
    validateNonEmptyString(input.listId, "listId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const list = this.requireList(input.listId);
      const templateJson = this.buildListTemplateJson(list, input.baseDate ?? this.now());
      const name = normalizeOptionalString(input.name) ?? `${list.item.title} template`;

      const template = new TemplateRepository(this.connection).create({
        id: this.idFactory("template"),
        workspaceId: list.item.workspaceId,
        kind: "list",
        name,
        description: normalizeNullableString(input.description),
        sourceType: "list",
        sourceId: list.item.id,
        templateJson: JSON.stringify(templateJson),
        timestamp
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: template.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.templateCreated,
        targetType: "template",
        targetId: template.id,
        summary: `Saved list "${list.item.title}" as template "${template.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify(template),
        timestamp
      });

      return template;
    });
  }

  async createListFromTemplate(
    input: CreateListFromTemplateInput
  ): Promise<ListTemplateCreationResult> {
    validateNonEmptyString(input.templateId, "templateId");
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");

    return await this.transactionService.runInTransaction(async () => {
      const timestamp = createIsoTimestamp(this.now());
      const template = this.requireTemplate(input.templateId, input.workspaceId);
      const templateJson = validateTemplateJson(
        JSON.parse(template.templateJson)
      ) as TemplateListDefinitionJsonV1;
      const appliedTemplate = applyRelativeDates(templateJson, input.baseDate ?? this.now());
      const listTemplate = appliedTemplate.list;
      const listService = new ListService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const list = await listService.createList({
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        title: normalizeOptionalString(input.title) ?? listTemplate.title,
        body: listTemplate.body,
        categoryId: this.categoryExists(listTemplate.categoryId, input.workspaceId)
          ? listTemplate.categoryId
          : null,
        displayMode: listTemplate.displayMode,
        showCompleted: listTemplate.showCompleted,
        progressMode: listTemplate.progressMode,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });

      this.copyTags({
        workspaceId: input.workspaceId,
        targetType: "item",
        targetId: list.item.id,
        tags: listTemplate.tags,
        timestamp
      });
      const searchIndex = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      searchIndex.upsertItem(list.item, {
        timestamp,
        metadata: {
          displayMode: list.list.displayMode,
          showCompleted: list.list.showCompleted,
          progressMode: list.list.progressMode
        }
      });

      const listItems = await this.createListItemsFromTemplate({
        listService,
        listId: list.item.id,
        workspaceId: input.workspaceId,
        templateItems: listTemplate.items,
        timestamp,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.templateApplied,
        targetType: "template",
        targetId: template.id,
        summary: `Created list "${list.item.title}" from template "${template.name}".`,
        beforeJson: JSON.stringify(template),
        afterJson: JSON.stringify({ list: list.item, listItems }),
        timestamp
      });

      return { template, list, listItems };
    });
  }

  listTemplates(input: { workspaceId: string }): TemplateRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return new TemplateRepository(this.connection).listByWorkspace({
      workspaceId: input.workspaceId,
      kind: "list"
    });
  }

  validateTemplateJson(json: unknown): TemplateJsonV1 {
    return validateTemplateJson(json);
  }

  applyRelativeDates(
    template: TemplateListDefinitionJsonV1,
    baseDate: string | Date
  ): TemplateListDefinitionJsonV1 {
    return applyRelativeDates(template, baseDate);
  }

  private async createListItemsFromTemplate(input: {
    listService: ListService;
    listId: string;
    workspaceId: string;
    templateItems: TemplateListItemJsonV1[];
    timestamp: string;
    actorType?: ActivityActorType;
  }): Promise<ListItemRecord[]> {
    const createdByStableId = new Map<string, ListItemRecord>();
    const created: ListItemRecord[] = [];
    const orderedItems = [...input.templateItems].sort(
      (left, right) => left.sortOrder - right.sortOrder
    );

    for (const templateItem of orderedItems) {
      const parent =
        templateItem.parentStableId === null
          ? null
          : createdByStableId.get(templateItem.parentStableId) ?? null;
      const result = await input.listService.addListItem({
        listId: input.listId,
        title: templateItem.title,
        body: templateItem.body,
        status: templateItem.status,
        depth: parent === null ? templateItem.depth : parent.depth + 1,
        sortOrder: templateItem.sortOrder,
        listItemParentId: parent?.id ?? null,
        startAt: templateItem.startAt ?? null,
        dueAt: templateItem.dueAt ?? null,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });

      this.copyTags({
        workspaceId: input.workspaceId,
        targetType: "list_item",
        targetId: result.listItem.id,
        tags: templateItem.tags,
        timestamp: input.timestamp
      });
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertListItem(result.listItem, { timestamp: input.timestamp });
      createdByStableId.set(templateItem.stableId, result.listItem);
      created.push(result.listItem);
    }

    return created;
  }

  private buildListTemplateJson(
    list: ListWithItemRecord,
    baseDateInput: string | Date
  ): TemplateListDefinitionJsonV1 {
    const baseDate = toDateOnly(baseDateInput);
    const listRepository = new ListRepository(this.connection);
    const tagRepository = new TagRepository(this.connection);
    const listItems = listRepository.listItems(list.item.id);

    return {
      version: TEMPLATE_JSON_VERSION,
      kind: "list",
      createdFrom: {
        sourceType: "list",
        sourceId: list.item.id
      },
      baseDate,
      list: {
        title: list.item.title,
        body: list.item.body,
        categoryId: list.item.categoryId,
        displayMode: list.list.displayMode,
        showCompleted: list.list.showCompleted,
        progressMode: list.list.progressMode,
        tags: tagRepository
          .listTagsForTarget({
            workspaceId: list.item.workspaceId,
            targetType: "item",
            targetId: list.item.id
          })
          .map(toTemplateTagRef),
        items: listItems.map((listItem) => ({
          stableId: listItem.id,
          parentStableId: listItem.listItemParentId,
          title: listItem.title,
          body: listItem.body,
          status: listItem.status,
          depth: listItem.depth,
          sortOrder: listItem.sortOrder,
          ...toRelativeDateFields(listItem, baseDate),
          tags: tagRepository
            .listTagsForTarget({
              workspaceId: listItem.workspaceId,
              targetType: "list_item",
              targetId: listItem.id
            })
            .map(toTemplateTagRef)
        }))
      }
    };
  }

  private requireList(itemId: string): ListWithItemRecord {
    const list = new ListRepository(this.connection).getByItemId(itemId);

    if (list === null) {
      throw new Error(`List was not found: ${itemId}.`);
    }

    return list;
  }

  private requireTemplate(templateId: string, workspaceId: string): TemplateRecord {
    const template = new TemplateRepository(this.connection).getById(templateId);

    if (template === null || template.kind !== "list" || template.workspaceId !== workspaceId) {
      throw new Error(`List template was not found: ${templateId}.`);
    }

    return template;
  }

  private copyTags(input: {
    workspaceId: string;
    targetType: "item" | "list_item";
    targetId: string;
    tags: readonly TemplateTagRef[];
    timestamp: string;
  }): void {
    const tagRepository = new TagRepository(this.connection);

    for (const tag of input.tags) {
      if (tagRepository.getById(tag.tagId) === null) {
        continue;
      }

      tagRepository.createTagging({
        id: this.idFactory("tagging"),
        workspaceId: input.workspaceId,
        tagId: tag.tagId,
        targetType: input.targetType,
        targetId: input.targetId,
        source: tag.source,
        timestamp: input.timestamp
      });
    }
  }

  private categoryExists(categoryId: string | null, workspaceId: string): boolean {
    if (categoryId === null) {
      return false;
    }

    const category = new CategoryRepository(this.connection).getById(categoryId);

    return category !== null && category.workspaceId === workspaceId;
  }
}

export class ContainerTemplateService {
  readonly module = "templates";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TemplateServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TemplateServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async saveContainerAsTemplate(
    input: SaveContainerAsTemplateInput
  ): Promise<TemplateRecord> {
    validateNonEmptyString(input.containerId, "containerId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const container = this.requireTemplateableContainer(input.containerId);
      const templateJson = this.serialiseContainerTree({
        containerId: container.id,
        baseDate: input.baseDate ?? this.now()
      });
      const template = new TemplateRepository(this.connection).create({
        id: this.idFactory("template"),
        workspaceId: container.workspaceId,
        kind: container.type as TemplateContainerKind,
        name: normalizeOptionalString(input.name) ?? `${container.name} template`,
        description: normalizeNullableString(input.description),
        sourceType: container.type as TemplateContainerKind,
        sourceId: container.id,
        templateJson: JSON.stringify(templateJson),
        timestamp
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: template.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.templateCreated,
        targetType: "template",
        targetId: template.id,
        summary: `Saved ${container.type} "${container.name}" as template "${template.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify(template),
        timestamp
      });

      return template;
    });
  }

  async createContainerFromTemplate(
    input: CreateContainerFromTemplateInput
  ): Promise<ContainerTemplateCreationResult> {
    validateNonEmptyString(input.templateId, "templateId");
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return await this.transactionService.runInTransaction(async () => {
      const timestamp = createIsoTimestamp(this.now());
      const template = this.requireContainerTemplate(input.templateId, input.workspaceId);
      const templateJson = validateContainerTemplateJson(JSON.parse(template.templateJson));
      const appliedTemplate = applyContainerRelativeDates(
        templateJson,
        input.baseDate ?? this.now()
      );
      const snapshot = appliedTemplate.container;
      const container =
        appliedTemplate.kind === "project"
          ? await new ProjectService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createProject({
              workspaceId: input.workspaceId,
              name: normalizeOptionalString(input.name) ?? snapshot.name,
              description: snapshot.description,
              categoryId: this.categoryExists(snapshot.categoryId, input.workspaceId)
                ? snapshot.categoryId
                : null,
              color: snapshot.color,
              isFavorite: snapshot.isFavorite,
              ...(input.actorType === undefined ? {} : { actorType: input.actorType })
            })
          : await new ContactService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createContact({
              workspaceId: input.workspaceId,
              name: normalizeOptionalString(input.name) ?? snapshot.name,
              description: snapshot.description,
              categoryId: this.categoryExists(snapshot.categoryId, input.workspaceId)
                ? snapshot.categoryId
                : null,
              color: snapshot.color,
              isFavorite: snapshot.isFavorite,
              fields: snapshot.contactFields,
              ...(input.actorType === undefined ? {} : { actorType: input.actorType })
            });
      const createdContainer = "project" in container ? container.project : container.contact;

      this.copyTags({
        workspaceId: input.workspaceId,
        targetType: "container",
        targetId: createdContainer.id,
        tags: snapshot.tags,
        timestamp
      });

      const tabs = this.applyTabs({
        sourceTabs: snapshot.tabs,
        defaultTabId: container.defaultTab.id,
        createdContainer,
        timestamp,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
      const sortedSourceTabs = [...snapshot.tabs].sort(
        (left, right) => left.sortOrder - right.sortOrder
      );
      const tabIdByStableId = new Map(
        tabs.map((tab, index) => [sortedSourceTabs[index]?.stableId ?? tab.id, tab.id])
      );
      const items: ItemRecord[] = [];

      for (const itemTemplate of snapshot.items) {
        items.push(
          ...(await this.applyContainerItem({
            itemTemplate,
            workspaceId: input.workspaceId,
            containerId: createdContainer.id,
            containerTabId:
              itemTemplate.tabStableId === null
                ? null
                : tabIdByStableId.get(itemTemplate.tabStableId) ?? null,
            timestamp,
            ...(input.actorType === undefined ? {} : { actorType: input.actorType })
          }))
        );
      }

      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertContainer(createdContainer, { timestamp });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.templateApplied,
        targetType: "template",
        targetId: template.id,
        summary: `Created ${appliedTemplate.kind} "${createdContainer.name}" from template "${template.name}".`,
        beforeJson: JSON.stringify(template),
        afterJson: JSON.stringify({ container: createdContainer, tabs, itemIds: items.map((item) => item.id) }),
        timestamp
      });

      return { template, container, tabs, items };
    });
  }

  serialiseContainerTree(input: {
    containerId: string;
    baseDate?: string | Date;
  }): TemplateContainerJsonV1 {
    validateNonEmptyString(input.containerId, "containerId");
    const container = this.requireTemplateableContainer(input.containerId);
    const baseDate = toDateOnly(input.baseDate ?? this.now());
    const tagRepository = new TagRepository(this.connection);
    const tabs = new ContainerTabRepository(this.connection).listByContainer(container.id);
    const tabIds = new Set(tabs.map((tab) => tab.id));
    const items = new ItemRepository(this.connection)
      .listByContainer(container.id)
      .filter((item) => item.containerTabId === null || tabIds.has(item.containerTabId))
      .map((item) => this.serialiseContainerItem(item, baseDate, tagRepository))
      .filter((item): item is TemplateContainerItemJsonV1 => item !== null);

    return {
      version: TEMPLATE_JSON_VERSION,
      kind: container.type as TemplateContainerKind,
      createdFrom: {
        sourceType: container.type as TemplateContainerKind,
        sourceId: container.id
      },
      baseDate,
      container: {
        type: container.type as TemplateContainerKind,
        name: container.name,
        description: container.description,
        status: container.status,
        categoryId: container.categoryId,
        color: container.color,
        isFavorite: container.isFavorite,
        tags: tagRepository
          .listTagsForTarget({
            workspaceId: container.workspaceId,
            targetType: "container",
            targetId: container.id
          })
          .map(toTemplateTagRef),
        contactFields:
          container.type === "contact"
            ? new ContactFieldRepository(this.connection)
                .listForContact({
                  workspaceId: container.workspaceId,
                  containerId: container.id
                })
                .map(toTemplateContactField)
            : [],
        tabs: tabs.map((tab) => ({
          stableId: tab.id,
          name: tab.name,
          description: tab.description,
          sortOrder: tab.sortOrder,
          isDefault: tab.isDefault
        })),
        items
      }
    };
  }

  listTemplates(input: {
    workspaceId: string;
    kind?: TemplateContainerKind;
  }): TemplateRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return new TemplateRepository(this.connection).listByWorkspace({
      workspaceId: input.workspaceId,
      ...(input.kind === undefined ? {} : { kind: input.kind })
    });
  }

  private serialiseContainerItem(
    item: ItemRecord,
    baseDate: string,
    tagRepository: TagRepository
  ): TemplateContainerItemJsonV1 | null {
    const shared = {
      stableId: item.id,
      tabStableId: item.containerTabId,
      title: item.title,
      body: item.body,
      categoryId: item.categoryId,
      status: item.status,
      sortOrder: item.sortOrder,
      pinned: item.pinned,
      tags: tagRepository
        .listTagsForTarget({
          workspaceId: item.workspaceId,
          targetType: "item",
          targetId: item.id
        })
        .map(toTemplateTagRef)
    };

    if (item.type === "task") {
      const task = new TaskRepository(this.connection).getByItemId(item.id);
      if (task === null) {
        return null;
      }
      return {
        ...shared,
        type: "task",
        ...toRelativeDateFieldsFromValues(
          task.task.startAt,
          task.task.dueAt,
          task.task.completedAt,
          baseDate
        ),
        task: {
          taskStatus: task.task.taskStatus,
          priority: task.task.priority,
          allDay: task.task.allDay,
          timezone: task.task.timezone
        }
      };
    }

    if (item.type === "list") {
      const list = new ListRepository(this.connection).getByItemId(item.id);
      if (list === null) {
        return null;
      }
      return {
        ...shared,
        type: "list",
        startAt: null,
        dueAt: null,
        completedAt: null,
        startOffsetDays: null,
        dueOffsetDays: null,
        completedOffsetDays: null,
        list: {
          displayMode: list.list.displayMode,
          showCompleted: list.list.showCompleted,
          progressMode: list.list.progressMode,
          items: new ListRepository(this.connection).listItems(item.id).map((listItem) => ({
            stableId: listItem.id,
            parentStableId: listItem.listItemParentId,
            title: listItem.title,
            body: listItem.body,
            status: listItem.status,
            depth: listItem.depth,
            sortOrder: listItem.sortOrder,
            ...toRelativeDateFields(listItem, baseDate),
            tags: tagRepository
              .listTagsForTarget({
                workspaceId: listItem.workspaceId,
                targetType: "list_item",
                targetId: listItem.id
              })
              .map(toTemplateTagRef)
          }))
        }
      };
    }

    if (item.type === "note") {
      const note = new NoteRepository(this.connection).getByItemId(item.id);
      if (note === null) {
        return null;
      }
      return {
        ...shared,
        type: "note",
        startAt: null,
        dueAt: null,
        completedAt: null,
        startOffsetDays: null,
        dueOffsetDays: null,
        completedOffsetDays: null,
        note: {
          content: note.note.content,
          format: note.note.format
        }
      };
    }

    if (item.type === "file") {
      const attachments = new AttachmentRepository(this.connection).listForItem({
        workspaceId: item.workspaceId,
        itemId: item.id
      });
      return {
        ...shared,
        type: "file",
        startAt: null,
        dueAt: null,
        completedAt: null,
        startOffsetDays: null,
        dueOffsetDays: null,
        completedOffsetDays: null,
        filePlaceholder: {
          originalName: item.title,
          description: item.body,
          attachments: attachments.map(toTemplateAttachmentPlaceholder)
        }
      };
    }

    if (item.type === "link") {
      const link = new LinkRepository(this.connection).getByItemId(item.id);
      if (link === null) {
        return null;
      }
      return {
        ...shared,
        type: "link",
        startAt: null,
        dueAt: null,
        completedAt: null,
        startOffsetDays: null,
        dueOffsetDays: null,
        completedOffsetDays: null,
        link: {
          url: link.link.url,
          title: link.link.title,
          description: link.link.description
        }
      };
    }

    return null;
  }

  private applyTabs(input: {
    sourceTabs: TemplateContainerTabJsonV1[];
    defaultTabId: string;
    createdContainer: ContainerRecord;
    timestamp: string;
    actorType?: ActivityActorType;
  }): ContainerTabRecord[] {
    const tabRepository = new ContainerTabRepository(this.connection);
    const activityLog = new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    });
    const sortedTabs = [...input.sourceTabs].sort(
      (left, right) => left.sortOrder - right.sortOrder
    );
    const created: ContainerTabRecord[] = [];

    for (const [index, sourceTab] of sortedTabs.entries()) {
      if (index === 0) {
        const before = tabRepository.getById(input.defaultTabId);
        const tab = tabRepository.update(input.defaultTabId, {
          name: sourceTab.name,
          description: sourceTab.description,
          sortOrder: sourceTab.sortOrder,
          timestamp: input.timestamp
        });
        activityLog.logEvent({
          workspaceId: tab.workspaceId,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.containerTabUpdated,
          targetType: "container_tab",
          targetId: tab.id,
          summary: `Updated default tab "${tab.name}" for ${input.createdContainer.type} "${input.createdContainer.name}".`,
          beforeJson: before === null ? null : JSON.stringify(before),
          afterJson: JSON.stringify(tab),
          timestamp: input.timestamp
        });
        created.push(tab);
        continue;
      }

      const tab = tabRepository.create({
        id: this.idFactory("container_tab"),
        workspaceId: input.createdContainer.workspaceId,
        containerId: input.createdContainer.id,
        name: sourceTab.name,
        description: sourceTab.description,
        sortOrder: sourceTab.sortOrder,
        timestamp: input.timestamp
      });
      activityLog.logEvent({
        workspaceId: tab.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerTabCreated,
        targetType: "container_tab",
        targetId: tab.id,
        summary: `Created tab "${tab.name}" for ${input.createdContainer.type} "${input.createdContainer.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify(tab),
        timestamp: input.timestamp
      });
      created.push(tab);
    }

    return created.length === 0
      ? [tabRepository.getById(input.defaultTabId)].filter(
          (tab): tab is ContainerTabRecord => tab !== null
        )
      : created;
  }

  private async applyContainerItem(input: {
    itemTemplate: TemplateContainerItemJsonV1;
    workspaceId: string;
    containerId: string;
    containerTabId: string | null;
    timestamp: string;
    actorType?: ActivityActorType;
  }): Promise<ItemRecord[]> {
    const common = {
      workspaceId: input.workspaceId,
      containerId: input.containerId,
      containerTabId: input.containerTabId,
      title: input.itemTemplate.title,
      categoryId: this.categoryExists(input.itemTemplate.categoryId, input.workspaceId)
        ? input.itemTemplate.categoryId
        : null,
      sortOrder: input.itemTemplate.sortOrder,
      pinned: input.itemTemplate.pinned,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    };

    if (input.itemTemplate.type === "task" && input.itemTemplate.task !== undefined) {
      const result = await new TaskService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).createTask({
        ...common,
        body: input.itemTemplate.body,
        status: input.itemTemplate.task.taskStatus,
        priority: input.itemTemplate.task.priority,
        startAt: input.itemTemplate.startAt ?? null,
        dueAt: input.itemTemplate.dueAt ?? null,
        allDay: input.itemTemplate.task.allDay,
        timezone: input.itemTemplate.task.timezone
      });
      this.copyTagsForItem(result.item, input.itemTemplate.tags, input.timestamp);
      this.reindexTask(result, input.timestamp);
      return [result.item];
    }

    if (input.itemTemplate.type === "list" && input.itemTemplate.list !== undefined) {
      const listService = new ListService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const result = await listService.createList({
        ...common,
        body: input.itemTemplate.body,
        displayMode: input.itemTemplate.list.displayMode,
        showCompleted: input.itemTemplate.list.showCompleted,
        progressMode: input.itemTemplate.list.progressMode
      });
      this.copyTagsForItem(result.item, input.itemTemplate.tags, input.timestamp);
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertItem(result.item, { timestamp: input.timestamp });
      await this.createListItemsFromTemplate({
        listService,
        listId: result.item.id,
        workspaceId: input.workspaceId,
        templateItems: input.itemTemplate.list.items,
        timestamp: input.timestamp,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
      return [result.item];
    }

    if (input.itemTemplate.type === "note" && input.itemTemplate.note !== undefined) {
      const result = await new NoteService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).createNote({
        ...common,
        content: input.itemTemplate.note.content,
        format: input.itemTemplate.note.format
      });
      this.copyTagsForItem(result.item, input.itemTemplate.tags, input.timestamp);
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertNote(result.item, result.note, { timestamp: input.timestamp });
      return [result.item];
    }

    if (input.itemTemplate.type === "link" && input.itemTemplate.link !== undefined) {
      const result = await new LinkService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).createLink({
        ...common,
        url: input.itemTemplate.link.url,
        title: input.itemTemplate.link.title,
        description: input.itemTemplate.link.description
      });
      this.copyTagsForItem(result.item, input.itemTemplate.tags, input.timestamp);
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertLink(result.item, result.link, { timestamp: input.timestamp });
      return [result.item];
    }

    if (input.itemTemplate.type === "file") {
      const item = new ItemRepository(this.connection).create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId,
        type: "file",
        title: input.itemTemplate.filePlaceholder?.originalName ?? input.itemTemplate.title,
        body: input.itemTemplate.filePlaceholder?.description ?? input.itemTemplate.body,
        categoryId: common.categoryId,
        sortOrder: input.itemTemplate.sortOrder,
        pinned: input.itemTemplate.pinned,
        timestamp: input.timestamp
      });
      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: item.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.itemCreated,
        targetType: "item",
        targetId: item.id,
        summary: `Created file placeholder "${item.title}" from template.`,
        beforeJson: null,
        afterJson: JSON.stringify({ item, placeholder: input.itemTemplate.filePlaceholder ?? null }),
        timestamp: input.timestamp
      });
      this.copyTagsForItem(item, input.itemTemplate.tags, input.timestamp);
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertItem(item, {
        timestamp: input.timestamp,
        metadata: {
          templateFilePlaceholder: true,
          sourceAttachments: input.itemTemplate.filePlaceholder?.attachments ?? []
        }
      });
      return [item];
    }

    return [];
  }

  private async createListItemsFromTemplate(input: {
    listService: ListService;
    listId: string;
    workspaceId: string;
    templateItems: TemplateListItemJsonV1[];
    timestamp: string;
    actorType?: ActivityActorType;
  }): Promise<ListItemRecord[]> {
    const createdByStableId = new Map<string, ListItemRecord>();
    const created: ListItemRecord[] = [];
    const orderedItems = [...input.templateItems].sort(
      (left, right) => left.sortOrder - right.sortOrder
    );

    for (const templateItem of orderedItems) {
      const parent =
        templateItem.parentStableId === null
          ? null
          : createdByStableId.get(templateItem.parentStableId) ?? null;
      const result = await input.listService.addListItem({
        listId: input.listId,
        title: templateItem.title,
        body: templateItem.body,
        status: templateItem.status,
        depth: parent === null ? templateItem.depth : parent.depth + 1,
        sortOrder: templateItem.sortOrder,
        listItemParentId: parent?.id ?? null,
        startAt: templateItem.startAt ?? null,
        dueAt: templateItem.dueAt ?? null,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
      this.copyTags({
        workspaceId: input.workspaceId,
        targetType: "list_item",
        targetId: result.listItem.id,
        tags: templateItem.tags,
        timestamp: input.timestamp
      });
      new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertListItem(result.listItem, { timestamp: input.timestamp });
      createdByStableId.set(templateItem.stableId, result.listItem);
      created.push(result.listItem);
    }

    return created;
  }

  private requireTemplateableContainer(containerId: string): ContainerRecord {
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null || (container.type !== "project" && container.type !== "contact")) {
      throw new Error(`Project or contact container was not found: ${containerId}.`);
    }

    if (container.isSystem) {
      throw new Error("System containers cannot be saved as templates.");
    }

    return container;
  }

  private requireContainerTemplate(templateId: string, workspaceId: string): TemplateRecord {
    const template = new TemplateRepository(this.connection).getById(templateId);

    if (
      template === null ||
      template.workspaceId !== workspaceId ||
      (template.kind !== "project" && template.kind !== "contact")
    ) {
      throw new Error(`Project or contact template was not found: ${templateId}.`);
    }

    return template;
  }

  private copyTagsForItem(
    item: ItemRecord,
    tags: readonly TemplateTagRef[],
    timestamp: string
  ): void {
    this.copyTags({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      tags,
      timestamp
    });
  }

  private copyTags(input: {
    workspaceId: string;
    targetType: "container" | "item" | "list_item";
    targetId: string;
    tags: readonly TemplateTagRef[];
    timestamp: string;
  }): void {
    const tagRepository = new TagRepository(this.connection);

    for (const tag of input.tags) {
      const existing = tagRepository.getById(tag.tagId);

      if (existing === null || existing.workspaceId !== input.workspaceId) {
        continue;
      }

      tagRepository.createTagging({
        id: this.idFactory("tagging"),
        workspaceId: input.workspaceId,
        tagId: tag.tagId,
        targetType: input.targetType,
        targetId: input.targetId,
        source: tag.source,
        timestamp: input.timestamp
      });
    }
  }

  private reindexTask(result: TaskMutationResult, timestamp: string): void {
    new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(result.item, {
      timestamp,
      metadata: {
        taskStatus: result.task.taskStatus,
        priority: result.task.priority,
        startAt: result.task.startAt,
        dueAt: result.task.dueAt,
        allDay: result.task.allDay,
        timezone: result.task.timezone,
        completedAt: result.task.completedAt
      }
    });
  }

  private categoryExists(categoryId: string | null, workspaceId: string): boolean {
    if (categoryId === null) {
      return false;
    }

    const category = new CategoryRepository(this.connection).getById(categoryId);

    return category !== null && category.workspaceId === workspaceId;
  }
}

export const templatesModuleContract = {
  module: "templates",
  purpose: "Define reusable local list, project, and contact template structures.",
  owns: [
    "template definitions",
    "list template save/apply behavior",
    "container template save/apply behavior",
    "portable template file validation"
  ],
  doesNotOwn: ["cloud template sharing", "workflow execution", "binary attachment export"],
  integrationPoints: ["lists", "projects", "contacts", "metadata", "search", "activity", "export", "import"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

export function validateTemplateJson(json: unknown): TemplateJsonV1 {
  if (isRecord(json) && (json.kind === "project" || json.kind === "contact")) {
    return validateContainerTemplateJson(json);
  }

  if (!isRecord(json)) {
    throw new Error("Template JSON must be an object.");
  }

  if (json.version !== TEMPLATE_JSON_VERSION) {
    throw new Error("Template JSON version must be 1.");
  }

  if (json.kind !== "list") {
    throw new Error("Template JSON kind must be list.");
  }

  if (!isRecord(json.createdFrom) || json.createdFrom.sourceType !== "list") {
    throw new Error("Template JSON createdFrom source must be list.");
  }

  assertNonEmptyString(json.createdFrom.sourceId, "createdFrom.sourceId");
  assertNonEmptyString(json.baseDate, "baseDate");

  if (!isRecord(json.list)) {
    throw new Error("Template JSON list must be an object.");
  }

  const list = json.list;
  assertNonEmptyString(list.title, "list.title");
  assertOptionalNullableString(list.body, "list.body");
  assertOptionalNullableString(list.categoryId, "list.categoryId");

  if (typeof list.displayMode !== "string" || !isListDisplayMode(list.displayMode)) {
    throw new Error("list.displayMode must be checklist or pipeline.");
  }

  if (typeof list.showCompleted !== "boolean") {
    throw new Error("list.showCompleted must be a boolean.");
  }

  if (typeof list.progressMode !== "string" || !isListProgressMode(list.progressMode)) {
    throw new Error("list.progressMode must be count, manual, or none.");
  }

  if (!Array.isArray(list.tags) || !Array.isArray(list.items)) {
    throw new Error("list.tags and list.items must be arrays.");
  }

  const tags = list.tags.map(validateTagRef);
  const items = list.items.map(validateListItemTemplate);

  const sourceId = json.createdFrom.sourceId as string;
  const listTitle = list.title as string;
  const listBody = (list.body ?? null) as string | null;
  const categoryId = (list.categoryId ?? null) as string | null;
  const displayMode = list.displayMode as ListDisplayMode;
  const progressMode = list.progressMode as ListProgressMode;

  return {
    version: TEMPLATE_JSON_VERSION,
    kind: "list",
    createdFrom: {
      sourceType: "list",
      sourceId
    },
    baseDate: json.baseDate as string,
    list: {
      title: listTitle,
      body: listBody,
      categoryId,
      displayMode,
      showCompleted: list.showCompleted,
      progressMode,
      tags,
      items
    }
  };
}

export function validateContainerTemplateJson(json: unknown): TemplateContainerJsonV1 {
  if (!isRecord(json)) {
    throw new Error("Template JSON must be an object.");
  }

  if (json.version !== TEMPLATE_JSON_VERSION) {
    throw new Error("Template JSON version must be 1.");
  }

  if (json.kind !== "project" && json.kind !== "contact") {
    throw new Error("Template JSON kind must be project or contact.");
  }

  if (
    !isRecord(json.createdFrom) ||
    json.createdFrom.sourceType !== json.kind
  ) {
    throw new Error("Template JSON createdFrom source must match the container kind.");
  }

  assertNonEmptyString(json.createdFrom.sourceId, "createdFrom.sourceId");
  assertNonEmptyString(json.baseDate, "baseDate");

  if (!isRecord(json.container)) {
    throw new Error("Template JSON container must be an object.");
  }

  const container = json.container;

  if (container.type !== json.kind) {
    throw new Error("container.type must match template kind.");
  }

  assertNonEmptyString(container.name, "container.name");
  assertOptionalNullableString(container.description, "container.description");
  assertOptionalNullableString(container.status, "container.status");
  assertOptionalNullableString(container.categoryId, "container.categoryId");
  assertOptionalNullableString(container.color, "container.color");

  if (typeof container.isFavorite !== "boolean") {
    throw new Error("container.isFavorite must be a boolean.");
  }

  if (
    !Array.isArray(container.tags) ||
    !Array.isArray(container.tabs) ||
    !Array.isArray(container.items) ||
    !Array.isArray(container.contactFields)
  ) {
    throw new Error("container tags, tabs, contactFields, and items must be arrays.");
  }

  const kind = json.kind as TemplateContainerKind;

  return {
    version: TEMPLATE_JSON_VERSION,
    kind,
    createdFrom: {
      sourceType: kind,
      sourceId: json.createdFrom.sourceId as string
    },
    baseDate: json.baseDate as string,
    container: {
      type: kind,
      name: container.name as string,
      description: (container.description ?? null) as string | null,
      status: ((container.status ?? "active") as string),
      categoryId: (container.categoryId ?? null) as string | null,
      color: (container.color ?? null) as string | null,
      isFavorite: container.isFavorite,
      tags: container.tags.map(validateTagRef),
      contactFields: container.contactFields.map(validateContactFieldTemplate),
      tabs: container.tabs.map(validateContainerTabTemplate),
      items: container.items.map(validateContainerItemTemplate)
    }
  };
}

export function applyRelativeDates(
  template: TemplateListDefinitionJsonV1,
  baseDateInput: string | Date
): TemplateListDefinitionJsonV1 {
  const baseDate = toDateOnly(baseDateInput);

  return {
    ...template,
    baseDate,
    list: {
      ...template.list,
      items: template.list.items.map((item) => ({
        ...item,
        startAt: resolveTemplateDate(item.startAt, item.startOffsetDays, baseDate),
        dueAt: resolveTemplateDate(item.dueAt, item.dueOffsetDays, baseDate),
        completedAt: resolveTemplateDate(
          item.completedAt,
          item.completedOffsetDays,
          baseDate
        )
      }))
    }
  };
}

export function applyContainerRelativeDates(
  template: TemplateContainerJsonV1,
  baseDateInput: string | Date
): TemplateContainerJsonV1 {
  const baseDate = toDateOnly(baseDateInput);

  return {
    ...template,
    baseDate,
    container: {
      ...template.container,
      items: template.container.items.map((item) =>
        resolveContainerTemplateItemDates(item, baseDate)
      )
    }
  };
}

function resolveContainerTemplateItemDates(
  item: TemplateContainerItemJsonV1,
  baseDate: string
): TemplateContainerItemJsonV1 {
  const resolved = {
    ...item,
    startAt: resolveTemplateDate(item.startAt, item.startOffsetDays, baseDate),
    dueAt: resolveTemplateDate(item.dueAt, item.dueOffsetDays, baseDate),
    completedAt: resolveTemplateDate(
      item.completedAt,
      item.completedOffsetDays,
      baseDate
    )
  };

  if (item.list === undefined) {
    return resolved;
  }

  return {
    ...resolved,
    list: {
      ...item.list,
      items: item.list.items.map((listItem) => ({
        ...listItem,
        startAt: resolveTemplateDate(
          listItem.startAt,
          listItem.startOffsetDays,
          baseDate
        ),
        dueAt: resolveTemplateDate(
          listItem.dueAt,
          listItem.dueOffsetDays,
          baseDate
        ),
        completedAt: resolveTemplateDate(
          listItem.completedAt,
          listItem.completedOffsetDays,
          baseDate
        )
      }))
    }
  };
}

function validateListItemTemplate(value: unknown): TemplateListItemJsonV1 {
  if (!isRecord(value)) {
    throw new Error("list.items entries must be objects.");
  }

  assertNonEmptyString(value.stableId, "stableId");
  assertOptionalNullableString(value.parentStableId, "parentStableId");
  assertNonEmptyString(value.title, "title");
  assertOptionalNullableString(value.body, "body");

  if (typeof value.status !== "string" || !isListItemStatus(value.status)) {
    throw new Error("list item status must be open, done, waiting, or cancelled.");
  }

  assertNonNegativeInteger(value.depth, "depth");
  assertInteger(value.sortOrder, "sortOrder");
  assertOptionalNullableString(value.startAt, "startAt");
  assertOptionalNullableString(value.dueAt, "dueAt");
  assertOptionalNullableString(value.completedAt, "completedAt");
  assertOptionalNullableInteger(value.startOffsetDays, "startOffsetDays");
  assertOptionalNullableInteger(value.dueOffsetDays, "dueOffsetDays");
  assertOptionalNullableInteger(value.completedOffsetDays, "completedOffsetDays");

  if (!Array.isArray(value.tags)) {
    throw new Error("list item tags must be an array.");
  }

  return {
    stableId: value.stableId as string,
    parentStableId: (value.parentStableId ?? null) as string | null,
    title: value.title as string,
    body: (value.body ?? null) as string | null,
    status: value.status as ListItemStatus,
    depth: value.depth as number,
    sortOrder: value.sortOrder as number,
    startAt: (value.startAt ?? null) as string | null,
    dueAt: (value.dueAt ?? null) as string | null,
    completedAt: (value.completedAt ?? null) as string | null,
    startOffsetDays: (value.startOffsetDays ?? null) as number | null,
    dueOffsetDays: (value.dueOffsetDays ?? null) as number | null,
    completedOffsetDays: (value.completedOffsetDays ?? null) as number | null,
    tags: value.tags.map(validateTagRef)
  };
}

function validateContactFieldTemplate(value: unknown): TemplateContactFieldJsonV1 {
  if (!isRecord(value)) {
    throw new Error("contactFields entries must be objects.");
  }

  assertNonEmptyString(value.label, "contactField.label");
  assertNonEmptyString(value.value, "contactField.value");

  if (typeof value.type !== "string" || !isContactFieldType(value.type)) {
    throw new Error("contactField.type must be a supported contact field type.");
  }

  assertInteger(value.sortOrder, "contactField.sortOrder");

  return {
    label: value.label,
    value: value.value,
    type: value.type,
    sortOrder: value.sortOrder
  };
}

function validateContainerTabTemplate(value: unknown): TemplateContainerTabJsonV1 {
  if (!isRecord(value)) {
    throw new Error("tabs entries must be objects.");
  }

  assertNonEmptyString(value.stableId, "tab.stableId");
  assertNonEmptyString(value.name, "tab.name");
  assertOptionalNullableString(value.description, "tab.description");
  assertInteger(value.sortOrder, "tab.sortOrder");

  if (typeof value.isDefault !== "boolean") {
    throw new Error("tab.isDefault must be a boolean.");
  }

  return {
    stableId: value.stableId,
    name: value.name,
    description: (value.description ?? null) as string | null,
    sortOrder: value.sortOrder,
    isDefault: value.isDefault
  };
}

function validateContainerItemTemplate(value: unknown): TemplateContainerItemJsonV1 {
  if (!isRecord(value)) {
    throw new Error("container.items entries must be objects.");
  }

  assertNonEmptyString(value.stableId, "item.stableId");
  assertOptionalNullableString(value.tabStableId, "item.tabStableId");
  assertNonEmptyString(value.title, "item.title");
  assertOptionalNullableString(value.body, "item.body");
  assertOptionalNullableString(value.categoryId, "item.categoryId");
  assertNonEmptyString(value.status, "item.status");
  assertInteger(value.sortOrder, "item.sortOrder");
  assertOptionalNullableString(value.startAt, "item.startAt");
  assertOptionalNullableString(value.dueAt, "item.dueAt");
  assertOptionalNullableString(value.completedAt, "item.completedAt");
  assertOptionalNullableInteger(value.startOffsetDays, "item.startOffsetDays");
  assertOptionalNullableInteger(value.dueOffsetDays, "item.dueOffsetDays");
  assertOptionalNullableInteger(value.completedOffsetDays, "item.completedOffsetDays");

  if (typeof value.pinned !== "boolean") {
    throw new Error("item.pinned must be a boolean.");
  }

  if (
    value.type !== "task" &&
    value.type !== "list" &&
    value.type !== "note" &&
    value.type !== "file" &&
    value.type !== "link"
  ) {
    throw new Error("item.type must be task, list, note, file, or link.");
  }

  if (!Array.isArray(value.tags)) {
    throw new Error("item.tags must be an array.");
  }

  return {
    stableId: value.stableId as string,
    tabStableId: (value.tabStableId ?? null) as string | null,
    type: value.type,
    title: value.title as string,
    body: (value.body ?? null) as string | null,
    categoryId: (value.categoryId ?? null) as string | null,
    status: value.status as string,
    sortOrder: value.sortOrder as number,
    pinned: value.pinned,
    startAt: (value.startAt ?? null) as string | null,
    dueAt: (value.dueAt ?? null) as string | null,
    completedAt: (value.completedAt ?? null) as string | null,
    startOffsetDays: (value.startOffsetDays ?? null) as number | null,
    dueOffsetDays: (value.dueOffsetDays ?? null) as number | null,
    completedOffsetDays: (value.completedOffsetDays ?? null) as number | null,
    tags: value.tags.map(validateTagRef),
    ...(value.task === undefined ? {} : { task: validateTaskTemplate(value.task) }),
    ...(value.list === undefined ? {} : { list: validateNestedListTemplate(value.list) }),
    ...(value.note === undefined ? {} : { note: validateNoteTemplate(value.note) }),
    ...(value.filePlaceholder === undefined
      ? {}
      : { filePlaceholder: validateFilePlaceholderTemplate(value.filePlaceholder) }),
    ...(value.link === undefined ? {} : { link: validateLinkTemplate(value.link) })
  };
}

function validateTaskTemplate(value: unknown): NonNullable<TemplateContainerItemJsonV1["task"]> {
  if (!isRecord(value)) {
    throw new Error("item.task must be an object.");
  }

  if (typeof value.taskStatus !== "string" || !isTaskStatus(value.taskStatus)) {
    throw new Error("item.task.taskStatus must be a supported task status.");
  }

  if (
    value.priority !== null &&
    value.priority !== undefined &&
    (typeof value.priority !== "number" || !Number.isInteger(value.priority))
  ) {
    throw new Error("item.task.priority must be an integer or null.");
  }

  if (typeof value.allDay !== "boolean") {
    throw new Error("item.task.allDay must be a boolean.");
  }

  assertOptionalNullableString(value.timezone, "item.task.timezone");

  return {
    taskStatus: value.taskStatus,
    priority: (value.priority ?? null) as number | null,
    allDay: value.allDay,
    timezone: (value.timezone ?? null) as string | null
  };
}

function validateNestedListTemplate(
  value: unknown
): NonNullable<TemplateContainerItemJsonV1["list"]> {
  if (!isRecord(value)) {
    throw new Error("item.list must be an object.");
  }

  if (typeof value.displayMode !== "string" || !isListDisplayMode(value.displayMode)) {
    throw new Error("item.list.displayMode must be checklist or pipeline.");
  }

  if (typeof value.showCompleted !== "boolean") {
    throw new Error("item.list.showCompleted must be a boolean.");
  }

  if (typeof value.progressMode !== "string" || !isListProgressMode(value.progressMode)) {
    throw new Error("item.list.progressMode must be count, manual, or none.");
  }

  if (!Array.isArray(value.items)) {
    throw new Error("item.list.items must be an array.");
  }

  return {
    displayMode: value.displayMode,
    showCompleted: value.showCompleted,
    progressMode: value.progressMode,
    items: value.items.map(validateListItemTemplate)
  };
}

function validateNoteTemplate(value: unknown): NonNullable<TemplateContainerItemJsonV1["note"]> {
  if (!isRecord(value)) {
    throw new Error("item.note must be an object.");
  }

  assertNonEmptyString(value.content, "item.note.content");

  if (value.format !== "markdown") {
    throw new Error("item.note.format must be markdown.");
  }

  return {
    content: value.content,
    format: "markdown"
  };
}

function validateFilePlaceholderTemplate(
  value: unknown
): TemplateFileAttachmentPlaceholderJsonV1 & {
  originalName: string;
  description: string | null;
  attachments: TemplateFileAttachmentPlaceholderJsonV1[];
} {
  if (!isRecord(value)) {
    throw new Error("item.filePlaceholder must be an object.");
  }

  assertNonEmptyString(value.originalName, "item.filePlaceholder.originalName");
  assertOptionalNullableString(value.description, "item.filePlaceholder.description");

  if (!Array.isArray(value.attachments)) {
    throw new Error("item.filePlaceholder.attachments must be an array.");
  }

  return {
    originalName: value.originalName,
    storedName: value.originalName,
    mimeType: null,
    sizeBytes: 0,
    checksum: null,
    storagePath: "",
    description: (value.description ?? null) as string | null,
    attachments: value.attachments.map(validateAttachmentPlaceholder)
  };
}

function validateAttachmentPlaceholder(
  value: unknown
): TemplateFileAttachmentPlaceholderJsonV1 {
  if (!isRecord(value)) {
    throw new Error("attachment placeholder entries must be objects.");
  }

  assertNonEmptyString(value.originalName, "attachment.originalName");
  assertNonEmptyString(value.storedName, "attachment.storedName");
  assertOptionalNullableString(value.mimeType, "attachment.mimeType");
  assertOptionalNullableString(value.checksum, "attachment.checksum");
  assertOptionalNullableString(value.description, "attachment.description");
  assertNonEmptyString(value.storagePath, "attachment.storagePath");

  if (typeof value.sizeBytes !== "number" || !Number.isInteger(value.sizeBytes) || value.sizeBytes < 0) {
    throw new Error("attachment.sizeBytes must be a non-negative integer.");
  }

  return {
    originalName: value.originalName,
    storedName: value.storedName,
    mimeType: (value.mimeType ?? null) as string | null,
    sizeBytes: value.sizeBytes,
    checksum: (value.checksum ?? null) as string | null,
    description: (value.description ?? null) as string | null,
    storagePath: value.storagePath
  };
}

function validateLinkTemplate(value: unknown): NonNullable<TemplateContainerItemJsonV1["link"]> {
  if (!isRecord(value)) {
    throw new Error("item.link must be an object.");
  }

  assertNonEmptyString(value.url, "item.link.url");
  assertOptionalNullableString(value.title, "item.link.title");
  assertOptionalNullableString(value.description, "item.link.description");

  return {
    url: value.url,
    title: (value.title ?? null) as string | null,
    description: (value.description ?? null) as string | null
  };
}

function validateTagRef(value: unknown): TemplateTagRef {
  if (!isRecord(value)) {
    throw new Error("tag references must be objects.");
  }

  assertNonEmptyString(value.tagId, "tagId");
  assertNonEmptyString(value.name, "name");
  assertNonEmptyString(value.slug, "slug");

  if (value.source !== "inline" && value.source !== "manual" && value.source !== "imported") {
    throw new Error("tag source must be inline, manual, or imported.");
  }

  return {
    tagId: value.tagId,
    name: value.name,
    slug: value.slug,
    source: value.source
  };
}

function toTemplateTagRef(tag: {
  id: string;
  name: string;
  slug: string;
  taggingSource: TaggingSource;
}): TemplateTagRef {
  return {
    tagId: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: tag.taggingSource
  };
}

function toTemplateContactField(field: ContactFieldRecord): TemplateContactFieldJsonV1 {
  return {
    label: field.label,
    value: field.value,
    type: field.type,
    sortOrder: field.sortOrder
  };
}

function toTemplateAttachmentPlaceholder(
  attachment: AttachmentRecord
): TemplateFileAttachmentPlaceholderJsonV1 {
  return {
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    description: attachment.description,
    storagePath: attachment.storagePath
  };
}

function toRelativeDateFields(
  listItem: ListItemRecord,
  baseDate: string
): TemplateDateFields {
  return toRelativeDateFieldsFromValues(
    listItem.startAt,
    listItem.dueAt,
    listItem.completedAt,
    baseDate
  );
}

function toRelativeDateFieldsFromValues(
  startAt: string | null,
  dueAt: string | null,
  completedAt: string | null,
  baseDate: string
): TemplateDateFields {
  return {
    startAt: null,
    dueAt: null,
    completedAt: null,
    startOffsetDays: toDayOffset(startAt, baseDate),
    dueOffsetDays: toDayOffset(dueAt, baseDate),
    completedOffsetDays: toDayOffset(completedAt, baseDate)
  };
}

function resolveTemplateDate(
  fixedDate: string | null | undefined,
  offsetDays: number | null | undefined,
  baseDate: string
): string | null {
  if (offsetDays !== undefined && offsetDays !== null) {
    return addDays(baseDate, offsetDays);
  }

  return fixedDate ?? null;
}

function toDayOffset(date: string | null, baseDate: string): number | null {
  if (date === null) {
    return null;
  }

  return Math.round((toUtcMidnight(date).getTime() - toUtcMidnight(baseDate).getTime()) / 86400000);
}

function addDays(baseDate: string, offsetDays: number): string {
  const date = toUtcMidnight(baseDate);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function toDateOnly(input: string | Date): string {
  return toUtcMidnight(input).toISOString().slice(0, 10);
}

function toUtcMidnight(input: string | Date): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new Error("baseDate must be a valid date or ISO timestamp.");
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertOptionalNullableString(value: unknown, fieldName: string): void {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`${fieldName} must be a string, null, or undefined.`);
  }
}

function assertInteger(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertNonNegativeInteger(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

function assertOptionalNullableInteger(value: unknown, fieldName: string): void {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "number" || !Number.isInteger(value))
  ) {
    throw new Error(`${fieldName} must be an integer, null, or undefined.`);
  }
}
