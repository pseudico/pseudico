import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  normalizeWikilinkTitle,
  parseUniqueWikilinkTitles,
  type ActivityActorType,
  type RelationshipObjectType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  ItemRepository,
  RelationshipRepository,
  TransactionService,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type RelationshipRecord
} from "@local-work-os/db";

export type WikilinkTargetKind = "project" | "contact" | "item";
export type WikilinkResolutionStatus = "resolved" | "broken" | "ambiguous";

export type WikilinkResolvedTarget = {
  type: RelationshipObjectType;
  id: string;
  kind: WikilinkTargetKind;
  title: string;
  containerId?: string;
  containerType?: string;
};

export type WikilinkResolution = {
  title: string;
  status: WikilinkResolutionStatus;
  target: WikilinkResolvedTarget | null;
  candidates: WikilinkResolvedTarget[];
};

export type SyncWikilinksForItemInput = {
  workspaceId: string;
  sourceItemId: string;
  content: string;
  actorType?: ActivityActorType;
};

export type WikilinkSyncResult = {
  resolutions: WikilinkResolution[];
  relationships: RelationshipRecord[];
  createdCount: number;
};

export type WikilinkServiceIdFactory = (prefix: string) => string;

export class WikilinkService {
  readonly module = "wikilinks";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: WikilinkServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: WikilinkServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  resolveContent(input: {
    workspaceId: string;
    content: string;
    sourceItemId?: string;
  }): WikilinkResolution[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return parseUniqueWikilinkTitles(input.content).map((title) =>
      this.resolveTitle({
        workspaceId: input.workspaceId,
        title,
        ...(input.sourceItemId === undefined ? {} : { sourceItemId: input.sourceItemId })
      })
    );
  }

  resolveTitle(input: {
    workspaceId: string;
    title: string;
    sourceItemId?: string;
  }): WikilinkResolution {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.title, "title");

    const normalizedTitle = normalizeWikilinkTitle(input.title);
    const candidates = this.listCandidates(input.workspaceId)
      .filter((candidate) => normalizeWikilinkTitle(candidate.title) === normalizedTitle)
      .filter((candidate) =>
        input.sourceItemId === undefined ||
        !(candidate.type === "item" && candidate.id === input.sourceItemId)
      );

    if (candidates.length === 0) {
      return {
        title: input.title,
        status: "broken",
        target: null,
        candidates: []
      };
    }

    if (candidates.length > 1) {
      return {
        title: input.title,
        status: "ambiguous",
        target: null,
        candidates
      };
    }

    return {
      title: input.title,
      status: "resolved",
      target: candidates[0]!,
      candidates
    };
  }

  async syncRelationshipsForItem(
    input: SyncWikilinksForItemInput
  ): Promise<WikilinkSyncResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.sourceItemId, "sourceItemId");

    return await this.transactionService.runInTransaction(() =>
      this.syncRelationshipsForItemInCurrentTransaction(input)
    );
  }

  syncRelationshipsForItemInCurrentTransaction(
    input: SyncWikilinksForItemInput
  ): WikilinkSyncResult {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.sourceItemId, "sourceItemId");

    const source = new ItemRepository(this.connection).getById(input.sourceItemId);

    if (source === null || source.workspaceId !== input.workspaceId) {
      throw new Error(`Wikilink source item was not found: ${input.sourceItemId}.`);
    }

    const timestamp = createIsoTimestamp(this.now());
    const repository = new RelationshipRepository(this.connection);
    const resolutions = this.resolveContent({
      workspaceId: input.workspaceId,
      content: input.content,
      sourceItemId: input.sourceItemId
    });
    const relationships: RelationshipRecord[] = [];
    let createdCount = 0;

    for (const resolution of resolutions) {
      if (resolution.status !== "resolved" || resolution.target === null) {
        continue;
      }

      const duplicate = repository.findActiveDuplicate({
        workspaceId: input.workspaceId,
        sourceType: "item",
        sourceId: input.sourceItemId,
        targetType: resolution.target.type,
        targetId: resolution.target.id,
        relationType: "references",
        label: resolution.title
      });

      if (duplicate !== null) {
        relationships.push(duplicate);
        continue;
      }

      const relationship = repository.create({
        id: this.idFactory("relationship"),
        workspaceId: input.workspaceId,
        sourceType: "item",
        sourceId: input.sourceItemId,
        targetType: resolution.target.type,
        targetId: resolution.target.id,
        relationType: "references",
        label: resolution.title,
        timestamp
      });
      relationships.push(relationship);
      createdCount += 1;

      this.logRelationshipCreated({
        relationship,
        actorType: input.actorType ?? "local_user",
        resolution,
        timestamp
      });
    }

    return {
      resolutions,
      relationships,
      createdCount
    };
  }

  private listCandidates(workspaceId: string): WikilinkResolvedTarget[] {
    const containers = new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId)
      .filter((container) => container.type === "project" || container.type === "contact")
      .map(toContainerTarget);
    const items = new ItemRepository(this.connection)
      .listByWorkspace(workspaceId)
      .map((item) => toItemTarget(item, this.getContainer(item.containerId)));

    return [...containers, ...items].sort((left, right) =>
      left.title.localeCompare(right.title) ||
      left.kind.localeCompare(right.kind) ||
      left.id.localeCompare(right.id)
    );
  }

  private getContainer(containerId: string): ContainerRecord | null {
    return new ContainerRepository(this.connection).getById(containerId);
  }

  private logRelationshipCreated(input: {
    relationship: RelationshipRecord;
    actorType: ActivityActorType;
    resolution: WikilinkResolution;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.relationship.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.relationshipCreated,
      targetType: "relationship",
      targetId: input.relationship.id,
      summary: `Created wikilink reference to "${input.resolution.title}".`,
      beforeJson: null,
      afterJson: JSON.stringify({
        relationship: input.relationship,
        wikilink: input.resolution
      }),
      timestamp: input.timestamp
    });
  }
}

export const wikilinksModuleContract = {
  module: "wikilinks",
  purpose: "Parse and resolve local [[wikilinks]] from Markdown notes to projects, contacts, and items.",
  owns: ["wikilink parsing coordination", "local target resolution", "relationship creation from confirmed note saves"],
  doesNotOwn: ["cloud graph services", "remote previews", "rich text editor internals"],
  integrationPoints: ["notes", "relationships", "projects", "contacts", "items", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function toContainerTarget(container: ContainerRecord): WikilinkResolvedTarget {
  return {
    type: "container",
    id: container.id,
    kind: container.type === "contact" ? "contact" : "project",
    title: container.name,
    containerId: container.id,
    containerType: container.type
  };
}

function toItemTarget(
  item: ItemRecord,
  container: ContainerRecord | null
): WikilinkResolvedTarget {
  return {
    type: "item",
    id: item.id,
    kind: "item",
    title: item.title,
    containerId: item.containerId,
    ...(container?.type === undefined ? {} : { containerType: container.type })
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}