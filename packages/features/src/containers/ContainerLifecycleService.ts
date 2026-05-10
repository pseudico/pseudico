import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  SearchIndexService,
  TaskRepository,
  TransactionService,
  type ContainerRecord,
  type DatabaseConnection,
  type SearchIndexRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";

export type ContainerLifecycleAction = "archive" | "complete" | "restore";

export type TransitionContainerInput = {
  containerId: string;
  action: ContainerLifecycleAction;
  actorType?: ActivityActorType;
  confirmOpenTasks?: boolean;
};

export type ContainerLifecycleResult = {
  container: ContainerRecord;
  action: ContainerLifecycleAction;
  openTaskCount: number;
  searchRecord: SearchIndexRecord;
};

export type ContainerLifecycleServiceIdFactory = (prefix: string) => string;

export class ContainerLifecycleService {
  readonly module = "containers.lifecycle";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ContainerLifecycleServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ContainerLifecycleServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async transitionContainer(
    input: TransitionContainerInput
  ): Promise<ContainerLifecycleResult> {
    validateNonEmptyString(input.containerId, "containerId");

    if (!["archive", "complete", "restore"].includes(input.action)) {
      throw new Error("action must be archive, complete, or restore.");
    }

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const before = this.requireMutableContainer(input.containerId);
      const openTaskCount = this.countOpenTasks(before.id);

      if (
        (input.action === "archive" || input.action === "complete") &&
        openTaskCount > 0 &&
        input.confirmOpenTasks !== true
      ) {
        throw new Error(
          `${formatContainerType(before.type)} "${before.name}" has ${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}. Confirm the transition to keep those tasks with the ${input.action === "archive" ? "archived" : "completed"} container.`
        );
      }

      const container = this.applyTransition({
        action: input.action,
        containerId: before.id,
        repository: containerRepository,
        timestamp
      });
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });

      activityLogService.logEvent({
        workspaceId: container.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: toActivityAction(input.action),
        targetType: "container",
        targetId: container.id,
        summary: `${toPastTense(input.action)} ${formatContainerType(container.type)} "${container.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({
          container,
          openTaskCount
        }),
        timestamp
      });

      const searchRecord = searchIndexService.upsertContainer(container, {
        timestamp
      });

      return {
        container,
        action: input.action,
        openTaskCount,
        searchRecord
      };
    });
  }

  async archiveContainer(
    input: Omit<TransitionContainerInput, "action"> | string
  ): Promise<ContainerLifecycleResult> {
    return await this.transitionContainer({
      ...normalizeInput(input),
      action: "archive"
    });
  }

  async completeContainer(
    input: Omit<TransitionContainerInput, "action"> | string
  ): Promise<ContainerLifecycleResult> {
    return await this.transitionContainer({
      ...normalizeInput(input),
      action: "complete"
    });
  }

  async restoreContainer(
    input: Omit<TransitionContainerInput, "action"> | string
  ): Promise<ContainerLifecycleResult> {
    return await this.transitionContainer({
      ...normalizeInput(input),
      action: "restore"
    });
  }

  getOpenTaskCount(containerId: string): number {
    validateNonEmptyString(containerId, "containerId");
    this.requireMutableContainer(containerId);

    return this.countOpenTasks(containerId);
  }

  private requireMutableContainer(containerId: string): ContainerRecord {
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    if (container.type === "inbox" || container.isSystem) {
      throw new Error("System containers cannot be archived, completed, or restored.");
    }

    if (container.type !== "project" && container.type !== "contact") {
      throw new Error("Only project and contact containers support lifecycle transitions.");
    }

    return container;
  }

  private applyTransition(input: {
    action: ContainerLifecycleAction;
    containerId: string;
    repository: ContainerRepository;
    timestamp: string;
  }): ContainerRecord {
    switch (input.action) {
      case "archive":
        return input.repository.archive(input.containerId, input.timestamp);
      case "complete":
        return input.repository.complete(input.containerId, input.timestamp);
      case "restore":
        return input.repository.restore(input.containerId, input.timestamp);
    }
  }

  private countOpenTasks(containerId: string): number {
    return new TaskRepository(this.connection)
      .listByContainer(containerId)
      .filter(isOpenTask)
      .length;
  }
}

export const containerLifecycleModuleContract = {
  module: "containers.lifecycle",
  purpose: "Manage reversible archive, completion, and restore transitions for project/contact containers.",
  owns: ["container lifecycle transitions", "open-task confirmation guard", "archive search visibility"],
  doesNotOwn: ["item type internals", "trash hard deletes", "cloud lifecycle state"],
  integrationPoints: ["projects", "contacts", "activity log", "search", "tasks"],
  priority: "V1"
} as const;

function normalizeInput(
  input: Omit<TransitionContainerInput, "action"> | string
): Omit<TransitionContainerInput, "action"> {
  return typeof input === "string" ? { containerId: input } : input;
}

function isOpenTask(task: TaskWithItemRecord): boolean {
  return (
    task.item.archivedAt === null &&
    task.item.deletedAt === null &&
    task.item.completedAt === null &&
    task.task.completedAt === null &&
    (task.task.taskStatus === "open" || task.task.taskStatus === "waiting")
  );
}

function toActivityAction(action: ContainerLifecycleAction): ActivityAction {
  switch (action) {
    case "archive":
      return ActivityAction.containerArchived;
    case "complete":
      return ActivityAction.containerCompleted;
    case "restore":
      return ActivityAction.containerRestored;
  }
}

function toPastTense(action: ContainerLifecycleAction): string {
  switch (action) {
    case "archive":
      return "Archived";
    case "complete":
      return "Completed";
    case "restore":
      return "Restored";
  }
}

function formatContainerType(type: string): string {
  return type === "contact" ? "contact" : "project";
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
