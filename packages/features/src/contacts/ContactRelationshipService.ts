import type { ActivityActorType } from "@local-work-os/core";
import {
  ContainerRepository,
  RelationshipRepository,
  TaskRepository,
  type BacklinkRecord,
  type DatabaseConnection,
  type RelationshipRecord
} from "@local-work-os/db";
import {
  ActivityService,
  type ActivityEventView
} from "../activity";
import {
  RelationshipService,
  type RelationshipMutationResult
} from "../relationships";
import type { ContactRecord } from "./ContactCommands";
import type { ProjectRecord } from "../projects";

export const PROJECT_CONTACT_RELATIONSHIP_LABEL = "project_contact";

export type LinkContactToProjectInput = {
  workspaceId: string;
  contactId: string;
  projectId: string;
  actorType?: ActivityActorType;
};

export type UnlinkContactFromProjectInput = {
  relationshipId: string;
  actorType?: ActivityActorType;
};

export type ContactProjectRelationshipResult = RelationshipMutationResult;

export type RelatedContactSummary = {
  relationshipId: string;
  relationshipCreatedAt: string;
  contact: ContactRecord;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: ActivityEventView[];
};

export type RelatedProjectSummary = {
  relationshipId: string;
  relationshipCreatedAt: string;
  project: ProjectRecord;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: ActivityEventView[];
};

export class ContactRelationshipService {
  readonly module = "contactRelationships";

  private readonly connection: DatabaseConnection;
  private readonly relationshipService: RelationshipService;
  private readonly containerRepository: ContainerRepository;
  private readonly taskRepository: TaskRepository;
  private readonly activityService: ActivityService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: (prefix: string) => string;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.relationshipService = new RelationshipService(input);
    this.containerRepository = new ContainerRepository(input.connection);
    this.taskRepository = new TaskRepository(input.connection);
    this.activityService = new ActivityService({ connection: input.connection });
  }

  async linkContactToProject(
    input: LinkContactToProjectInput
  ): Promise<ContactProjectRelationshipResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.contactId, "contactId");
    validateNonEmptyString(input.projectId, "projectId");
    this.requireContact(input.workspaceId, input.contactId);
    this.requireProject(input.workspaceId, input.projectId);

    return await this.relationshipService.createRelationship({
      workspaceId: input.workspaceId,
      source: { type: "container", id: input.contactId },
      target: { type: "container", id: input.projectId },
      relationType: "related",
      label: PROJECT_CONTACT_RELATIONSHIP_LABEL,
      actorType: input.actorType ?? "local_user"
    });
  }

  async unlinkContactFromProject(
    input: UnlinkContactFromProjectInput | string
  ): Promise<ContactProjectRelationshipResult> {
    return await this.relationshipService.removeRelationship(input);
  }

  listContactsForProject(input: {
    workspaceId: string;
    projectId: string;
  }): RelatedContactSummary[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.projectId, "projectId");
    this.requireProject(input.workspaceId, input.projectId);

    return this.listProjectContactBacklinks(input.workspaceId, input.projectId)
      .map((backlink) => {
        const contactId = otherContainerId(backlink, input.projectId);
        const contact = contactId === null
          ? null
          : this.toActiveContact(input.workspaceId, contactId);

        return contact === null
          ? null
          : this.toRelatedContact(backlink.relationship, contact);
      })
      .filter(isPresent);
  }

  listProjectsForContact(input: {
    workspaceId: string;
    contactId: string;
  }): RelatedProjectSummary[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.contactId, "contactId");
    this.requireContact(input.workspaceId, input.contactId);

    return this.listProjectContactBacklinks(input.workspaceId, input.contactId)
      .map((backlink) => {
        const projectId = otherContainerId(backlink, input.contactId);
        const project = projectId === null
          ? null
          : this.toActiveProject(input.workspaceId, projectId);

        return project === null
          ? null
          : this.toRelatedProject(backlink.relationship, project);
      })
      .filter(isPresent);
  }

  private listProjectContactBacklinks(
    workspaceId: string,
    containerId: string
  ): BacklinkRecord[] {
    return new RelationshipRepository(this.connection)
      .listBacklinks({
        workspaceId,
        target: { type: "container", id: containerId }
      })
      .filter((backlink) =>
        backlink.relationship.relationType === "related" &&
        backlink.relationship.label === PROJECT_CONTACT_RELATIONSHIP_LABEL &&
        backlink.relationship.sourceType === "container" &&
        backlink.relationship.targetType === "container"
      );
  }

  private toRelatedContact(
    relationship: RelationshipRecord,
    contact: ContactRecord
  ): RelatedContactSummary {
    const recentActivity = this.listRecentActivity(contact.id);

    return {
      relationshipId: relationship.id,
      relationshipCreatedAt: relationship.createdAt,
      contact,
      openTaskCount: this.countOpenFollowUps(contact.id),
      recentActivityCount: recentActivity.length,
      recentActivity: recentActivity.slice(0, 3)
    };
  }

  private toRelatedProject(
    relationship: RelationshipRecord,
    project: ProjectRecord
  ): RelatedProjectSummary {
    const recentActivity = this.listRecentActivity(project.id);

    return {
      relationshipId: relationship.id,
      relationshipCreatedAt: relationship.createdAt,
      project,
      openTaskCount: this.countOpenFollowUps(project.id),
      recentActivityCount: recentActivity.length,
      recentActivity: recentActivity.slice(0, 3)
    };
  }

  private countOpenFollowUps(containerId: string): number {
    return this.taskRepository
      .listByContainer(containerId)
      .filter(({ item, task }) =>
        item.completedAt === null &&
        task.completedAt === null &&
        (task.taskStatus === "open" || task.taskStatus === "waiting")
      ).length;
  }

  private listRecentActivity(containerId: string): ActivityEventView[] {
    return this.activityService.listActivityForTarget(
      "container",
      containerId,
      100
    );
  }

  private requireContact(workspaceId: string, contactId: string): ContactRecord {
    const contact = this.toActiveContact(workspaceId, contactId);

    if (contact === null) {
      throw new Error(`Contact was not found: ${contactId}.`);
    }

    return contact;
  }

  private requireProject(workspaceId: string, projectId: string): ProjectRecord {
    const project = this.toActiveProject(workspaceId, projectId);

    if (project === null) {
      throw new Error(`Project was not found: ${projectId}.`);
    }

    return project;
  }

  private toActiveContact(
    workspaceId: string,
    contactId: string
  ): ContactRecord | null {
    const container = this.containerRepository.getById(contactId);

    if (
      container === null ||
      container.workspaceId !== workspaceId ||
      container.type !== "contact" ||
      container.archivedAt !== null
    ) {
      return null;
    }

    return container as ContactRecord;
  }

  private toActiveProject(
    workspaceId: string,
    projectId: string
  ): ProjectRecord | null {
    const container = this.containerRepository.getById(projectId);

    if (
      container === null ||
      container.workspaceId !== workspaceId ||
      container.type !== "project" ||
      container.archivedAt !== null
    ) {
      return null;
    }

    return container as ProjectRecord;
  }
}

function otherContainerId(
  backlink: BacklinkRecord,
  currentContainerId: string
): string | null {
  const { relationship } = backlink;

  if (backlink.direction === "incoming") {
    return relationship.targetId === currentContainerId
      ? relationship.sourceId
      : null;
  }

  return relationship.sourceId === currentContainerId
    ? relationship.targetId
    : null;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
