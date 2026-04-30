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
  TransactionService,
  type CreateContainerInput,
  type ContainerRecord,
  type ContainerTabRecord,
  type DatabaseConnection
} from "@local-work-os/db";

export type CreateContainerCommandInput = {
  workspaceId: string;
  type: "project" | "contact";
  name: string;
  slug: string;
  actorType?: ActivityActorType;
  description?: string | null;
  color?: string | null;
  isFavorite?: boolean;
  sortOrder?: number;
};

export type CreateContainerCommandResult = {
  container: ContainerRecord;
  defaultTab: ContainerTabRecord;
};

export type CreateContainerCommandIdFactory = (prefix: string) => string;

export class CreateContainerCommand {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: CreateContainerCommandIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: CreateContainerCommandIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async execute(
    input: CreateContainerCommandInput
  ): Promise<CreateContainerCommandResult> {
    this.validateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const containerTabRepository = new ContainerTabRepository(this.connection);
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });

      const createContainerInput: CreateContainerInput = {
        id: this.idFactory("container"),
        workspaceId: input.workspaceId,
        type: input.type,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description ?? null,
        color: input.color ?? null,
        timestamp
      };

      if (input.isFavorite !== undefined) {
        createContainerInput.isFavorite = input.isFavorite;
      }

      if (input.sortOrder !== undefined) {
        createContainerInput.sortOrder = input.sortOrder;
      }

      const container = containerRepository.create(createContainerInput);
      const defaultTab = containerTabRepository.createDefaultTab({
        id: this.idFactory("container_tab"),
        workspaceId: input.workspaceId,
        containerId: container.id,
        timestamp
      });

      activityLogService.logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerCreated,
        targetType: "container",
        targetId: container.id,
        summary: `Created ${input.type} container "${container.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify({
          id: container.id,
          type: container.type,
          name: container.name,
          slug: container.slug,
          defaultTabId: defaultTab.id
        }),
        timestamp
      });

      return {
        container,
        defaultTab
      };
    });
  }

  private validateInput(input: CreateContainerCommandInput): void {
    if (input.workspaceId.trim().length === 0) {
      throw new Error("workspaceId must be a non-empty string.");
    }

    if (input.name.trim().length === 0) {
      throw new Error("name must be a non-empty string.");
    }

    if (input.slug.trim().length === 0) {
      throw new Error("slug must be a non-empty string.");
    }
  }
}
