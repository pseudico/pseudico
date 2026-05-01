import type { FeatureModuleContract } from "../featureModuleContract";
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
  SearchIndexService,
  TransactionService,
  type ContainerRecord,
  type DatabaseConnection,
  type UpdateContainerPatch
} from "@local-work-os/db";
import type {
  CreateProjectInput,
  CreateProjectResult,
  ProjectRecord,
  UpdateProjectInput
} from "./ProjectCommands";

// Owns project container application operations.
// Does not own raw DB access or item type internals.
export type ProjectServiceIdFactory = (prefix: string) => string;

export class ProjectService {
  readonly module = "projects";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ProjectServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ProjectServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const containerTabRepository = new ContainerTabRepository(this.connection);
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const slug = this.createUniqueSlug(
        input.workspaceId,
        input.slug ?? input.name
      );
      const createContainerInput = {
        id: this.idFactory("container"),
        workspaceId: input.workspaceId,
        type: "project" as const,
        name: input.name.trim(),
        slug,
        description:
          input.description === undefined
            ? null
            : normalizeNullableString(input.description),
        status: "active" as const,
        categoryId:
          input.categoryId === undefined
            ? null
            : normalizeNullableString(input.categoryId),
        color:
          input.color === undefined ? null : normalizeNullableString(input.color),
        isSystem: false,
        timestamp
      };

      const project = asProjectRecord(
        containerRepository.create({
          ...createContainerInput,
          ...(input.isFavorite === undefined
            ? {}
            : { isFavorite: input.isFavorite }),
          ...(input.sortOrder === undefined
            ? {}
            : { sortOrder: input.sortOrder })
        })
      );
      const defaultTab = containerTabRepository.createDefaultTab({
        id: this.idFactory("container_tab"),
        workspaceId: input.workspaceId,
        containerId: project.id,
        timestamp
      });

      activityLogService.logEvent({
        workspaceId: project.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerCreated,
        targetType: "container",
        targetId: project.id,
        summary: `Created project "${project.name}".`,
        beforeJson: null,
        afterJson: JSON.stringify({
          project,
          defaultTabId: defaultTab.id
        }),
        timestamp
      });

      const searchRecord = searchIndexService.upsertContainer(project, {
        timestamp
      });

      return {
        project,
        defaultTab,
        searchRecord
      };
    });
  }

  async updateProject(input: UpdateProjectInput): Promise<ProjectRecord> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const before = this.requireProject(input.projectId);
      const patch: UpdateContainerPatch = { timestamp };

      if (input.name !== undefined) {
        patch.name = input.name.trim();
      }

      if (input.slug !== undefined) {
        patch.slug = this.createUniqueSlug(
          before.workspaceId,
          input.slug,
          before.id
        );
      }

      if (input.description !== undefined) {
        patch.description = normalizeNullableString(input.description);
      }

      if (input.status !== undefined) {
        patch.status = input.status;
      }

      if (input.categoryId !== undefined) {
        patch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.color !== undefined) {
        patch.color = normalizeNullableString(input.color);
      }

      if (input.isFavorite !== undefined) {
        patch.isFavorite = input.isFavorite;
      }

      if (input.sortOrder !== undefined) {
        patch.sortOrder = input.sortOrder;
      }

      const project = asProjectRecord(
        containerRepository.update(input.projectId, patch)
      );

      activityLogService.logEvent({
        workspaceId: project.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerUpdated,
        targetType: "container",
        targetId: project.id,
        summary: `Updated project "${project.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(project),
        timestamp
      });

      searchIndexService.upsertContainer(project, { timestamp });

      return project;
    });
  }

  async archiveProject(
    projectId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ProjectRecord> {
    validateNonEmptyString(projectId, "projectId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const before = this.requireProject(projectId);
      const project = asProjectRecord(
        containerRepository.archive(projectId, timestamp)
      );

      activityLogService.logEvent({
        workspaceId: project.workspaceId,
        actorType,
        action: ActivityAction.containerArchived,
        targetType: "container",
        targetId: project.id,
        summary: `Archived project "${project.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(project),
        timestamp
      });

      searchIndexService.upsertContainer(project, { timestamp });

      return project;
    });
  }

  async softDeleteProject(
    projectId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ProjectRecord> {
    validateNonEmptyString(projectId, "projectId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const containerRepository = new ContainerRepository(this.connection);
      const activityLogService = new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      });
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const before = this.requireProject(projectId);
      const project = asProjectRecord(
        containerRepository.softDelete(projectId, timestamp)
      );

      activityLogService.logEvent({
        workspaceId: project.workspaceId,
        actorType,
        action: ActivityAction.containerDeleted,
        targetType: "container",
        targetId: project.id,
        summary: `Soft-deleted project "${project.name}".`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(project),
        timestamp
      });

      searchIndexService.upsertContainer(project, { timestamp });

      return project;
    });
  }

  listProjects(workspaceId: string): ProjectRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId, { type: "project" })
      .map(asProjectRecord);
  }

  getProject(projectId: string): ProjectRecord | null {
    validateNonEmptyString(projectId, "projectId");

    const container = new ContainerRepository(this.connection).getById(projectId);

    if (container === null || container.type !== "project") {
      return null;
    }

    return asProjectRecord(container);
  }

  private requireProject(projectId: string): ProjectRecord {
    const project = this.getProject(projectId);

    if (project === null) {
      throw new Error(`Project was not found: ${projectId}.`);
    }

    if (project.isSystem) {
      throw new Error("System containers cannot be modified as projects.");
    }

    return project;
  }

  private createUniqueSlug(
    workspaceId: string,
    value: string,
    currentProjectId?: string
  ): string {
    const baseSlug = slugify(value);
    const existingSlugs = new Set(
      new ContainerRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .filter((container) => container.id !== currentProjectId)
        .map((container) => container.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;

    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private validateCreateInput(input: CreateProjectInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.name, "name");

    if (input.slug !== undefined) {
      validateNonEmptyString(input.slug, "slug");
    }
  }

  private validateUpdateInput(input: UpdateProjectInput): void {
    validateNonEmptyString(input.projectId, "projectId");

    if (input.name !== undefined) {
      validateNonEmptyString(input.name, "name");
    }

    if (input.slug !== undefined) {
      validateNonEmptyString(input.slug, "slug");
    }

    if (
      input.status !== undefined &&
      !["active", "waiting", "completed"].includes(input.status)
    ) {
      throw new Error("status must be active, waiting, or completed.");
    }

    if (
      input.name === undefined &&
      input.slug === undefined &&
      input.description === undefined &&
      input.status === undefined &&
      input.categoryId === undefined &&
      input.color === undefined &&
      input.isFavorite === undefined &&
      input.sortOrder === undefined
    ) {
      throw new Error("At least one project field must be provided.");
    }
  }
}

export const projectsModuleContract = {
  module: "projects",
  purpose: "Manage project container behavior and project-level work context.",
  owns: ["project application operations", "project summaries", "project item feed coordination"],
  doesNotOwn: ["raw database repositories", "contact-specific fields", "item type internals"],
  integrationPoints: ["metadata", "search", "tasks", "lists", "notes", "files", "links", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function asProjectRecord(container: ContainerRecord): ProjectRecord {
  if (container.type !== "project") {
    throw new Error(`Expected project container but received ${container.type}.`);
  }

  return container as ProjectRecord;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "project" : slug;
}
