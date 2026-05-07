import {
  ContactRelationshipService,
  type ActivityEventView,
  type ContactProjectRelationshipResult as FeatureContactProjectRelationshipResult,
  type ContactRecord,
  type ProjectRecord,
  type RelatedContactSummary as FeatureRelatedContactSummary,
  type RelatedProjectSummary as FeatureRelatedProjectSummary
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type RelationshipRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ActivitySummary,
  type ApiResult,
  type ContactProjectRelationshipResult,
  type ContactSummary,
  type LinkContactToProjectInput,
  type ProjectSummary,
  type RelatedContactSummary,
  type RelatedProjectSummary,
  type RelationshipSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type RelationshipIpcHandlers = {
  handleLinkContactToProject: (
    input: unknown
  ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
  handleUnlinkContactFromProject: (
    input: unknown
  ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
  handleListContactsForProject: (
    input: unknown
  ) => Promise<ApiResult<RelatedContactSummary[]>>;
  handleListProjectsForContact: (
    input: unknown
  ) => Promise<ApiResult<RelatedProjectSummary[]>>;
};

export function createRelationshipIpcHandlers(
  workspaceService: CurrentWorkspaceService
): RelationshipIpcHandlers {
  return {
    async handleLinkContactToProject(input) {
      if (!isLinkContactToProjectInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "linkContactToProject requires contactId and projectId strings."
        );
      }

      return await withRelationshipService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.relationshipService.linkContactToProject({
          ...input,
          workspaceId
        });

        return apiOk(toRelationshipMutationResult(result));
      });
    },

    async handleUnlinkContactFromProject(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "unlinkContactFromProject requires a relationshipId string."
        );
      }

      return await withRelationshipService(workspaceService, async (context) =>
        apiOk(
          toRelationshipMutationResult(
            await context.relationshipService.unlinkContactFromProject(input)
          )
        )
      );
    },

    async handleListContactsForProject(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listContactsForProject requires a projectId string."
        );
      }

      return await withRelationshipService(workspaceService, async (context) =>
        apiOk(
          context.relationshipService
            .listContactsForProject({
              workspaceId: context.workspace.id,
              projectId: input
            })
            .map(toRelatedContactSummary)
        )
      );
    },

    async handleListProjectsForContact(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listProjectsForContact requires a contactId string."
        );
      }

      return await withRelationshipService(workspaceService, async (context) =>
        apiOk(
          context.relationshipService
            .listProjectsForContact({
              workspaceId: context.workspace.id,
              contactId: input
            })
            .map(toRelatedProjectSummary)
        )
      );
    }
  };
}

async function withRelationshipService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    relationshipService: ContactRelationshipService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      relationshipService: new ContactRelationshipService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Relationship operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Relationship workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toRelationshipMutationResult(
  result: FeatureContactProjectRelationshipResult
): ContactProjectRelationshipResult {
  return {
    relationship: toRelationshipSummary(result.relationship),
    changed: result.changed
  };
}

function toRelatedContactSummary(
  summary: FeatureRelatedContactSummary
): RelatedContactSummary {
  return {
    relationshipId: summary.relationshipId,
    relationshipCreatedAt: summary.relationshipCreatedAt,
    contact: toContactSummary(summary.contact),
    openTaskCount: summary.openTaskCount,
    recentActivityCount: summary.recentActivityCount,
    recentActivity: summary.recentActivity.map(toActivitySummary)
  };
}

function toRelatedProjectSummary(
  summary: FeatureRelatedProjectSummary
): RelatedProjectSummary {
  return {
    relationshipId: summary.relationshipId,
    relationshipCreatedAt: summary.relationshipCreatedAt,
    project: toProjectSummary(summary.project),
    openTaskCount: summary.openTaskCount,
    recentActivityCount: summary.recentActivityCount,
    recentActivity: summary.recentActivity.map(toActivitySummary)
  };
}

function toRelationshipSummary(
  relationship: RelationshipRecord
): RelationshipSummary {
  return {
    id: relationship.id,
    workspaceId: relationship.workspaceId,
    sourceType: relationship.sourceType,
    sourceId: relationship.sourceId,
    targetType: relationship.targetType,
    targetId: relationship.targetId,
    relationType: relationship.relationType,
    label: relationship.label,
    createdAt: relationship.createdAt,
    deletedAt: relationship.deletedAt
  };
}

function toContactSummary(contact: ContactRecord): ContactSummary {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: "contact",
    name: contact.name,
    slug: contact.slug,
    description: contact.description,
    status: contact.status,
    categoryId: contact.categoryId,
    color: contact.color,
    isFavorite: contact.isFavorite,
    sortOrder: contact.sortOrder,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    archivedAt: contact.archivedAt,
    deletedAt: contact.deletedAt
  };
}

function toProjectSummary(project: ProjectRecord): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    type: "project",
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    categoryId: project.categoryId,
    color: project.color,
    isFavorite: project.isFavorite,
    sortOrder: project.sortOrder,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
    deletedAt: project.deletedAt
  };
}

function toActivitySummary(activity: ActivityEventView): ActivitySummary {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    actorType: activity.actorType,
    action: activity.action,
    targetType: activity.targetType,
    targetId: activity.targetId,
    summary: activity.summary,
    beforeJson: activity.beforeJson,
    afterJson: activity.afterJson,
    createdAt: activity.createdAt,
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    description: activity.description
  };
}

function isLinkContactToProjectInput(
  input: unknown
): input is LinkContactToProjectInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.contactId) &&
    isNonEmptyString(input.projectId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}
