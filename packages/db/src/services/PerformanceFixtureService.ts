import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import { ActivityLogRepository } from "../repositories/ActivityLogRepository";
import { ContainerRepository } from "../repositories/ContainerRepository";
import { ItemRepository } from "../repositories/ItemRepository";
import { SearchIndexRepository } from "../repositories/SearchIndexRepository";

export type LargeWorkspaceFixtureInput = {
  workspaceId: string;
  itemCount: number;
  containerCount?: number;
  timestamp?: string;
  idPrefix?: string;
};

export type LargeWorkspaceFixtureResult = {
  workspaceId: string;
  containerCount: number;
  itemCount: number;
  searchRecordCount: number;
  activityEventCount: number;
};

export class PerformanceFixtureService {
  readonly module = "performance.fixtures";

  private readonly connection: DatabaseConnection;

  constructor(input: { connection: DatabaseConnection }) {
    this.connection = input.connection;
  }

  seedLargeWorkspace(
    input: LargeWorkspaceFixtureInput
  ): LargeWorkspaceFixtureResult {
    const normalized = normalizeFixtureInput(input);
    const containers = new ContainerRepository(this.connection);
    const items = new ItemRepository(this.connection);
    const search = new SearchIndexRepository(this.connection);
    const activity = new ActivityLogRepository(this.connection);

    const transaction = this.connection.sqlite.transaction(() => {
      for (let index = 0; index < normalized.containerCount; index += 1) {
        containers.create({
          id: `${normalized.idPrefix}_container_${index}`,
          workspaceId: normalized.workspaceId,
          type: "project",
          name: `Performance Project ${index + 1}`,
          slug: `performance-project-${index + 1}`,
          sortOrder: index,
          timestamp: normalized.timestamp
        });
      }

      for (let index = 0; index < normalized.itemCount; index += 1) {
        const containerIndex = index % normalized.containerCount;
        const containerId = `${normalized.idPrefix}_container_${containerIndex}`;
        const itemId = `${normalized.idPrefix}_item_${index}`;
        const title = `Performance fixture item ${index + 1}`;
        const body = `Generated large-workspace fixture row ${index + 1} for pagination, virtualization, search, and activity diagnostics.`;

        items.create({
          id: itemId,
          workspaceId: normalized.workspaceId,
          containerId,
          type: index % 5 === 0 ? "note" : "task",
          title,
          body,
          sortOrder: index,
          timestamp: normalized.timestamp
        });

        search.upsert({
          id: `${normalized.idPrefix}_search_${index}`,
          workspaceId: normalized.workspaceId,
          targetType: "item",
          targetId: itemId,
          title,
          body,
          tags: "performance fixture large-workspace",
          metadataJson: JSON.stringify({ fixture: true, index }),
          timestamp: normalized.timestamp
        });

        activity.create({
          id: `${normalized.idPrefix}_activity_${index}`,
          workspaceId: normalized.workspaceId,
          actorType: "system",
          action: "performance_fixture_seeded",
          targetType: "item",
          targetId: itemId,
          summary: `Seeded ${title}.`,
          timestamp: normalized.timestamp
        });
      }
    });

    transaction();

    return {
      workspaceId: normalized.workspaceId,
      containerCount: normalized.containerCount,
      itemCount: normalized.itemCount,
      searchRecordCount: normalized.itemCount,
      activityEventCount: normalized.itemCount
    };
  }
}

function normalizeFixtureInput(
  input: LargeWorkspaceFixtureInput
): Required<LargeWorkspaceFixtureInput> {
  validateNonEmptyString(input.workspaceId, "workspaceId");

  if (
    !Number.isFinite(input.itemCount) ||
    !Number.isInteger(input.itemCount) ||
    input.itemCount < 1 ||
    input.itemCount > 100_000
  ) {
    throw new Error("itemCount must be an integer between 1 and 100000.");
  }

  const containerCount = input.containerCount ?? Math.min(50, input.itemCount);

  if (
    !Number.isFinite(containerCount) ||
    !Number.isInteger(containerCount) ||
    containerCount < 1 ||
    containerCount > input.itemCount
  ) {
    throw new Error("containerCount must be an integer between 1 and itemCount.");
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  const idPrefix = input.idPrefix ?? "perf_fixture";
  validateNonEmptyString(timestamp, "timestamp");
  validateNonEmptyString(idPrefix, "idPrefix");

  return {
    workspaceId: input.workspaceId,
    itemCount: input.itemCount,
    containerCount,
    timestamp,
    idPrefix
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
