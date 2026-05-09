import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type ActivityTargetType
} from "@local-work-os/core";
import {
  ActivityLogService,
  SearchIndexService,
  TransactionService,
  TrashRepository,
  type ClearTrashCounts,
  type DatabaseConnection,
  type RebuildWorkspaceIndexResult,
  type TrashEntryRecord,
  type TrashTargetType
} from "@local-work-os/db";

export type TrashServiceIdFactory = (prefix: string) => string;

export type ListTrashInput = {
  workspaceId: string;
};

export type RestoreTrashInput = {
  workspaceId: string;
  targetType: TrashTargetType;
  targetId: string;
  actorType?: ActivityActorType;
};

export type ClearTrashInput = {
  workspaceId: string;
  backupSnapshotId: string;
  actorType?: ActivityActorType;
};

export type RestoreTrashResult = {
  entry: TrashEntryRecord;
  searchIndex: RebuildWorkspaceIndexResult;
};

export type ClearTrashResult = {
  workspaceId: string;
  backupSnapshotId: string;
  counts: ClearTrashCounts;
  clearedCount: number;
  searchIndex: RebuildWorkspaceIndexResult;
};

export class TrashService {
  readonly module = "trash";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TrashServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TrashServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  listTrash(input: ListTrashInput): TrashEntryRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return new TrashRepository(this.connection).listDeletedByWorkspace(
      input.workspaceId
    );
  }

  async restore(input: RestoreTrashInput): Promise<RestoreTrashResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateTrashTargetType(input.targetType);
    validateNonEmptyString(input.targetId, "targetId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new TrashRepository(this.connection);
      const before = repository.getDeletedTarget(input);

      if (before === null) {
        throw new Error(`Trash target was not found: ${input.targetType} ${input.targetId}.`);
      }

      const entry = repository.restoreTarget({
        targetType: input.targetType,
        targetId: input.targetId,
        timestamp
      });
      const searchIndex = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).rebuildWorkspaceIndex(input.workspaceId);

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.trashRestored,
        targetType: mapTrashTargetToActivityTarget(input.targetType),
        targetId: input.targetId,
        summary: `Restored ${formatTrashTarget(input.targetType)} "${before.title}" from Trash.`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(entry),
        timestamp
      });

      return { entry, searchIndex };
    });
  }

  async clearTrash(input: ClearTrashInput): Promise<ClearTrashResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.backupSnapshotId, "backupSnapshotId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new TrashRepository(this.connection);
      const counts = repository.clearDeletedByWorkspace(input.workspaceId);
      const clearedCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const searchIndex = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).rebuildWorkspaceIndex(input.workspaceId);

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.trashCleared,
        targetType: "workspace",
        targetId: input.workspaceId,
        summary: `Cleared ${clearedCount} Trash record${clearedCount === 1 ? "" : "s"} after backup ${input.backupSnapshotId}.`,
        beforeJson: null,
        afterJson: JSON.stringify({ backupSnapshotId: input.backupSnapshotId, counts, clearedCount }),
        timestamp
      });

      return {
        workspaceId: input.workspaceId,
        backupSnapshotId: input.backupSnapshotId,
        counts,
        clearedCount,
        searchIndex
      };
    });
  }
}

export const trashModuleContract = {
  module: "trash",
  purpose: "List soft-deleted local records, restore recoverable targets, and guard clear-trash behind a backup preflight.",
  owns: ["trash listing", "restore workflow", "clear-trash workflow"],
  doesNotOwn: ["direct renderer database access", "cloud retention", "arbitrary filesystem deletion"],
  integrationPoints: ["items", "projects", "lists", "files", "search", "activity log", "backup"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateTrashTargetType(value: string): asserts value is TrashTargetType {
  if (!["container", "item", "list_item", "attachment"].includes(value)) {
    throw new Error("targetType must be container, item, list_item, or attachment.");
  }
}

function mapTrashTargetToActivityTarget(targetType: TrashTargetType): ActivityTargetType {
  return targetType;
}

function formatTrashTarget(targetType: TrashTargetType): string {
  return targetType.replace("_", " ");
}
