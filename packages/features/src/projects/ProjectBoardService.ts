import type { ActivityActorType } from "@local-work-os/core";
import {
  CategoryRepository,
  ContainerRepository,
  type CategoryRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  ProjectService,
  type ProjectServiceIdFactory
} from "./ProjectService";
import type { ProjectMutableStatus, ProjectRecord } from "./ProjectCommands";

export type ProjectBoardGrouping = "status" | "category" | "project_phase";

export type ProjectBoardColumnKind = "status" | "category" | "uncategorized";

export type ProjectBoardProjectCard = Pick<
  ProjectRecord,
  | "id"
  | "workspaceId"
  | "name"
  | "description"
  | "status"
  | "categoryId"
  | "color"
  | "isFavorite"
  | "sortOrder"
  | "updatedAt"
> & {
  columnId: string;
  categoryName: string | null;
};

export type ProjectBoardColumn = {
  id: string;
  kind: ProjectBoardColumnKind;
  title: string;
  description: string;
  color: string | null;
  projects: ProjectBoardProjectCard[];
};

export type ProjectBoardViewModel = {
  workspaceId: string;
  grouping: ProjectBoardGrouping;
  columns: ProjectBoardColumn[];
  projectCount: number;
};

export type GetProjectBoardInput = {
  workspaceId: string;
  grouping?: ProjectBoardGrouping;
};

export type MoveProjectBoardCardInput = {
  projectId: string;
  targetColumnId: string;
  grouping?: ProjectBoardGrouping;
  actorType?: ActivityActorType;
};

const STATUS_COLUMNS: Array<{
  id: ProjectMutableStatus;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: "active",
    title: "Active",
    description: "Projects currently moving forward.",
    color: "#245c55"
  },
  {
    id: "waiting",
    title: "Waiting",
    description: "Projects paused by a blocker or external response.",
    color: "#ad7c18"
  },
  {
    id: "completed",
    title: "Completed",
    description: "Finished projects kept visible for review.",
    color: "#4f6f52"
  }
];

const UNCATEGORIZED_COLUMN_ID = "uncategorized";

export class ProjectBoardService {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: ProjectServiceIdFactory | undefined;
  private readonly now: (() => Date) | undefined;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ProjectServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory;
    this.now = input.now;
  }

  getBoard(input: GetProjectBoardInput): ProjectBoardViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const grouping = input.grouping ?? "status";
    const projects = this.listProjectRecords(input.workspaceId);
    const categories = new CategoryRepository(this.connection).listByWorkspace(
      input.workspaceId
    );
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name])
    );

    if (grouping === "category") {
      return {
        workspaceId: input.workspaceId,
        grouping,
        columns: this.createCategoryColumns(projects, categories, categoryNames),
        projectCount: projects.length
      };
    }

    if (grouping !== "status" && grouping !== "project_phase") {
      throw new Error("Project board grouping must be status, category, or project_phase.");
    }

    return {
      workspaceId: input.workspaceId,
      grouping,
      columns: this.createStatusColumns(projects, categoryNames),
      projectCount: projects.length
    };
  }

  async moveProjectCard(input: MoveProjectBoardCardInput): Promise<ProjectRecord> {
    validateNonEmptyString(input.projectId, "projectId");
    validateNonEmptyString(input.targetColumnId, "targetColumnId");

    const grouping = input.grouping ?? "status";
    const projectService = new ProjectService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
    const project = projectService.getProject(input.projectId);

    if (project === null) {
      throw new Error(`Project was not found: ${input.projectId}.`);
    }

    if (grouping === "category") {
      const categoryId = this.resolveTargetCategoryId(
        project.workspaceId,
        input.targetColumnId
      );

      return await projectService.updateProject({
        projectId: input.projectId,
        categoryId,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
    }

    if (grouping === "status" || grouping === "project_phase") {
      if (!isProjectMutableStatus(input.targetColumnId)) {
        throw new Error("Project status column must be active, waiting, or completed.");
      }

      return await projectService.updateProject({
        projectId: input.projectId,
        status: input.targetColumnId,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
    }

    throw new Error("Project board grouping must be status, category, or project_phase.");
  }

  private listProjectRecords(workspaceId: string): ProjectRecord[] {
    return new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId, { type: "project" })
      .map((container) => {
        if (container.type !== "project") {
          throw new Error(`Expected project container but received ${container.type}.`);
        }

        return container as ProjectRecord;
      });
  }

  private createStatusColumns(
    projects: ProjectRecord[],
    categoryNames: Map<string, string>
  ): ProjectBoardColumn[] {
    return STATUS_COLUMNS.map((column) => ({
      id: column.id,
      kind: "status",
      title: column.title,
      description: column.description,
      color: column.color,
      projects: projects
        .filter((project) => project.status === column.id)
        .map((project) => toProjectCard(project, column.id, categoryNames))
    }));
  }

  private createCategoryColumns(
    projects: ProjectRecord[],
    categories: CategoryRecord[],
    categoryNames: Map<string, string>
  ): ProjectBoardColumn[] {
    const uncategorized: ProjectBoardColumn = {
      id: UNCATEGORIZED_COLUMN_ID,
      kind: "uncategorized",
      title: "Uncategorized",
      description: "Projects without a local category.",
      color: null,
      projects: projects
        .filter((project) => project.categoryId === null)
        .map((project) =>
          toProjectCard(project, UNCATEGORIZED_COLUMN_ID, categoryNames)
        )
    };

    return [
      uncategorized,
      ...categories.map((category) => ({
        id: category.id,
        kind: "category" as const,
        title: category.name,
        description: category.description ?? "Projects assigned to this category.",
        color: category.color,
        projects: projects
          .filter((project) => project.categoryId === category.id)
          .map((project) => toProjectCard(project, category.id, categoryNames))
      }))
    ];
  }

  private resolveTargetCategoryId(
    workspaceId: string,
    targetColumnId: string
  ): string | null {
    if (targetColumnId === UNCATEGORIZED_COLUMN_ID) {
      return null;
    }

    const category = new CategoryRepository(this.connection).getById(targetColumnId);

    if (category === null || category.workspaceId !== workspaceId) {
      throw new Error(`Project board category column was not found: ${targetColumnId}.`);
    }

    return category.id;
  }
}

export const PROJECT_BOARD_UNCATEGORIZED_COLUMN_ID = UNCATEGORIZED_COLUMN_ID;

function toProjectCard(
  project: ProjectRecord,
  columnId: string,
  categoryNames: Map<string, string>
): ProjectBoardProjectCard {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status,
    categoryId: project.categoryId,
    color: project.color,
    isFavorite: project.isFavorite,
    sortOrder: project.sortOrder,
    updatedAt: project.updatedAt,
    columnId,
    categoryName:
      project.categoryId === null ? null : categoryNames.get(project.categoryId) ?? null
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isProjectMutableStatus(value: string): value is ProjectMutableStatus {
  return value === "active" || value === "waiting" || value === "completed";
}
