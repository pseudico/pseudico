import type {
  ActivityActorType,
  ListDisplayMode,
  ListItemStatus,
  ListProgressMode,
  TaggingSource
} from "@local-work-os/core";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isListDisplayMode,
  isListItemStatus,
  isListProgressMode
} from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  ListRepository,
  SearchIndexService,
  TagRepository,
  TemplateRepository,
  TransactionService,
  type DatabaseConnection,
  type ListItemRecord,
  type ListWithItemRecord,
  type TemplateRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { ListService, type ListMutationResult } from "../lists";

export const TEMPLATE_JSON_VERSION = 1;
export type TemplateKind = "list";
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

export type TemplateJsonV1 = {
  version: typeof TEMPLATE_JSON_VERSION;
  kind: TemplateKind;
  createdFrom: {
    sourceType: "list";
    sourceId: string;
  };
  baseDate: string;
  list: TemplateListJsonV1;
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
      const templateJson = validateTemplateJson(JSON.parse(template.templateJson));
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

  applyRelativeDates(template: TemplateJsonV1, baseDate: string | Date): TemplateJsonV1 {
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
  ): TemplateJsonV1 {
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

export const templatesModuleContract = {
  module: "templates",
  purpose: "Define reusable local list structures before broader template types.",
  owns: ["template definitions", "list template save/apply behavior"],
  doesNotOwn: ["cloud template sharing", "workflow execution", "project templates"],
  integrationPoints: ["lists", "metadata", "search", "activity"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

export function validateTemplateJson(json: unknown): TemplateJsonV1 {
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

export function applyRelativeDates(
  template: TemplateJsonV1,
  baseDateInput: string | Date
): TemplateJsonV1 {
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

function toRelativeDateFields(
  listItem: ListItemRecord,
  baseDate: string
): TemplateDateFields {
  return {
    startAt: null,
    dueAt: null,
    completedAt: null,
    startOffsetDays: toDayOffset(listItem.startAt, baseDate),
    dueOffsetDays: toDayOffset(listItem.dueAt, baseDate),
    completedOffsetDays: toDayOffset(listItem.completedAt, baseDate)
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
