import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isTaggingSource,
  isTaggingTargetType,
  normalizeTagName,
  parseInlineTagSlugs,
  slugifyTagName,
  type ActivityActorType,
  type TaggingSource,
  type TaggingTargetType
} from "@local-work-os/core";
import {
  ActivityLogService,
  SearchIndexRepository,
  TagRepository,
  TransactionService,
  type DatabaseConnection,
  type SearchIndexRecord,
  type TaggedTargetRecord,
  type TaggingRecord,
  type TagRecord
} from "@local-work-os/db";

// Owns tag application operations.
// Does not own saved-view storage or external taxonomy systems.
export type TagServiceIdFactory = (prefix: string) => string;

export type TaggingTargetInput = {
  workspaceId: string;
  targetType: TaggingTargetType;
  targetId: string;
};

export type AddTagToTargetInput = TaggingTargetInput & {
  name: string;
  actorType?: ActivityActorType;
  source?: TaggingSource;
};

export type RemoveTagFromTargetInput = TaggingTargetInput & {
  actorType?: ActivityActorType;
  name?: string;
  tagId?: string;
};

export type SyncInlineTagsInput = TaggingTargetInput & {
  text: string | string[];
  actorType?: ActivityActorType;
};

export type TagMutationResult = {
  tag: TagRecord;
  tagging: TaggingRecord | null;
  changed: boolean;
  searchRecord: SearchIndexRecord;
};

export type SyncInlineTagsResult = {
  inlineTagSlugs: string[];
  added: TaggingRecord[];
  removed: TaggingRecord[];
  searchRecord: SearchIndexRecord;
};

export class TagService {
  readonly module = "metadata.tags";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TagServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TagServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  parseInlineTags(text: string | string[]): string[] {
    return parseInlineTagSlugs(text);
  }

  async findOrCreateTag(
    workspaceId: string,
    name: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<TagRecord> {
    validateNonEmptyString(workspaceId, "workspaceId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      return this.findOrCreateTagInCurrentTransaction({
        workspaceId,
        name,
        actorType,
        timestamp
      });
    });
  }

  async addTagToTarget(input: AddTagToTargetInput): Promise<TagMutationResult> {
    this.validateTargetInput(input);
    validateNonEmptyString(input.name, "name");

    if (input.source !== undefined && !isTaggingSource(input.source)) {
      throw new Error("source must be inline, manual, or imported.");
    }

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tag = this.findOrCreateTagInCurrentTransaction({
        workspaceId: input.workspaceId,
        name: input.name,
        actorType: input.actorType ?? "local_user",
        timestamp
      });
      const repository = new TagRepository(this.connection);
      const before = repository.findActiveTagging({
        workspaceId: input.workspaceId,
        tagId: tag.id,
        targetType: input.targetType,
        targetId: input.targetId
      });
      const tagging = repository.createTagging({
        id: this.idFactory("tagging"),
        workspaceId: input.workspaceId,
        tagId: tag.id,
        targetType: input.targetType,
        targetId: input.targetId,
        source: input.source ?? "manual",
        timestamp
      });
      const changed = before === null;

      if (changed) {
        this.logTaggingEvent({
          workspaceId: input.workspaceId,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.tagAdded,
          targetType: input.targetType,
          targetId: input.targetId,
          summary: `Added @${tag.slug}.`,
          before: null,
          after: { tag, tagging },
          timestamp
        });
      }

      const searchRecord = this.updateSearchIndexForTarget(input, timestamp);

      return { tag, tagging, changed, searchRecord };
    });
  }

  async removeTagFromTarget(
    input: RemoveTagFromTargetInput
  ): Promise<TagMutationResult | null> {
    this.validateTargetInput(input);

    if (input.tagId === undefined && input.name === undefined) {
      throw new Error("Either tagId or name must be provided.");
    }

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new TagRepository(this.connection);
      const tag =
        input.tagId === undefined
          ? this.findTagByName(input.workspaceId, input.name)
          : repository.getById(input.tagId);

      if (tag === null) {
        return null;
      }

      const tagging = repository.findActiveTagging({
        workspaceId: input.workspaceId,
        tagId: tag.id,
        targetType: input.targetType,
        targetId: input.targetId
      });

      if (tagging === null) {
        const searchRecord = this.updateSearchIndexForTarget(input, timestamp);
        return { tag, tagging: null, changed: false, searchRecord };
      }

      const removed = repository.softDeleteTagging(tagging.id, timestamp);
      this.logTaggingEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.tagRemoved,
        targetType: input.targetType,
        targetId: input.targetId,
        summary: `Removed @${tag.slug}.`,
        before: { tag, tagging },
        after: { tag, tagging: removed },
        timestamp
      });

      const searchRecord = this.updateSearchIndexForTarget(input, timestamp);

      return { tag, tagging: removed, changed: true, searchRecord };
    });
  }

  async syncInlineTags(input: SyncInlineTagsInput): Promise<SyncInlineTagsResult> {
    this.validateTargetInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const inlineTagSlugs = parseInlineTagSlugs(input.text);
      const desiredSlugs = new Set(inlineTagSlugs);
      const repository = new TagRepository(this.connection);
      const existingInlineTags = repository.listTagsForTarget({
        workspaceId: input.workspaceId,
        targetType: input.targetType,
        targetId: input.targetId,
        source: "inline"
      });
      const existingInlineSlugs = new Set(
        existingInlineTags.map((tag) => tag.slug)
      );
      const added: TaggingRecord[] = [];
      const removed: TaggingRecord[] = [];

      for (const slug of inlineTagSlugs) {
        if (existingInlineSlugs.has(slug)) {
          continue;
        }

        const tag = this.findOrCreateTagInCurrentTransaction({
          workspaceId: input.workspaceId,
          name: slug,
          actorType: input.actorType ?? "local_user",
          timestamp
        });
        const before = repository.findActiveTagging({
          workspaceId: input.workspaceId,
          tagId: tag.id,
          targetType: input.targetType,
          targetId: input.targetId
        });
        const tagging = repository.createTagging({
          id: this.idFactory("tagging"),
          workspaceId: input.workspaceId,
          tagId: tag.id,
          targetType: input.targetType,
          targetId: input.targetId,
          source: "inline",
          timestamp
        });

        if (before === null) {
          added.push(tagging);
          this.logTaggingEvent({
            workspaceId: input.workspaceId,
            actorType: input.actorType ?? "local_user",
            action: ActivityAction.tagAdded,
            targetType: input.targetType,
            targetId: input.targetId,
            summary: `Added inline @${tag.slug}.`,
            before: null,
            after: { tag, tagging },
            timestamp
          });
        }
      }

      for (const tag of existingInlineTags) {
        if (desiredSlugs.has(tag.slug)) {
          continue;
        }

        const deleted = repository.softDeleteTagging(tag.taggingId, timestamp);
        removed.push(deleted);
        this.logTaggingEvent({
          workspaceId: input.workspaceId,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.tagRemoved,
          targetType: input.targetType,
          targetId: input.targetId,
          summary: `Removed inline @${tag.slug}.`,
          before: { tag, taggingId: tag.taggingId },
          after: { tag, tagging: deleted },
          timestamp
        });
      }

      const searchRecord = this.updateSearchIndexForTarget(input, timestamp);

      return { inlineTagSlugs, added, removed, searchRecord };
    });
  }

  listTagsForTarget(input: TaggingTargetInput): TaggedTargetRecord[] {
    this.validateTargetInput(input);

    return new TagRepository(this.connection).listTagsForTarget(input);
  }

  private findOrCreateTagInCurrentTransaction(input: {
    workspaceId: string;
    name: string;
    actorType: ActivityActorType;
    timestamp: string;
  }): TagRecord {
    const name = normalizeTagName(input.name);
    const slug = slugifyTagName(name);

    if (slug === null) {
      throw new Error("Tag name must contain only letters, numbers, and hyphens.");
    }

    const repository = new TagRepository(this.connection);
    const existing = repository.findBySlug({
      workspaceId: input.workspaceId,
      slug,
      includeDeleted: true
    });

    if (existing !== null) {
      if (existing.deletedAt !== null) {
        return repository.restoreTag(existing.id, input.timestamp);
      }

      return existing;
    }

    const tag = repository.create({
      id: this.idFactory("tag"),
      workspaceId: input.workspaceId,
      name,
      slug,
      timestamp: input.timestamp
    });

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.tagCreated,
      targetType: "tag",
      targetId: tag.id,
      summary: `Created @${tag.slug}.`,
      beforeJson: null,
      afterJson: JSON.stringify(tag),
      timestamp: input.timestamp
    });

    return tag;
  }

  private findTagByName(
    workspaceId: string,
    name: string | undefined
  ): TagRecord | null {
    if (name === undefined) {
      return null;
    }

    const normalizedName = normalizeTagName(name);
    const slug = slugifyTagName(normalizedName);

    if (slug === null) {
      return null;
    }

    return new TagRepository(this.connection).findBySlug({
      workspaceId,
      slug
    });
  }

  private updateSearchIndexForTarget(
    input: TaggingTargetInput,
    timestamp: string
  ): SearchIndexRecord {
    const repository = new SearchIndexRepository(this.connection);
    const existing = repository.getByTarget({
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId
    });
    const tags = new TagRepository(this.connection).listTagsForTarget(input);
    const tagSlugs = tags.map((tag) => tag.slug);
    const metadata = parseMetadata(existing?.metadataJson);

    return repository.upsert({
      id: existing?.id ?? this.idFactory("search"),
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      title: existing?.title ?? "",
      body: existing?.body ?? "",
      tags: tagSlugs.join(" "),
      category: existing?.category ?? null,
      metadataJson: JSON.stringify({
        ...metadata,
        tagIds: tags.map((tag) => tag.id),
        tagSlugs
      }),
      isDeleted: existing?.isDeleted ?? false,
      timestamp
    });
  }

  private logTaggingEvent(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    action: typeof ActivityAction.tagAdded | typeof ActivityAction.tagRemoved;
    targetType: TaggingTargetType;
    targetId: string;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private validateTargetInput(input: TaggingTargetInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.targetId, "targetId");

    if (!isTaggingTargetType(input.targetType)) {
      throw new Error("targetType must be container, item, or list_item.");
    }
  }
}

export const tagsModuleContract = {
  module: "metadata.tags",
  purpose: "Manage local tag operations and tagging contracts.",
  owns: ["tag operations", "tagging contracts", "tag search projections"],
  doesNotOwn: ["saved-view storage", "dashboard rendering", "external taxonomy"],
  integrationPoints: ["all content modules", "search", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function parseMetadata(metadataJson: string | undefined): Record<string, unknown> {
  if (metadataJson === undefined) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadataJson);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
