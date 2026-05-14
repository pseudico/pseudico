import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import { CategoryService } from "../metadata/CategoryService";
import { TagService } from "../metadata/TagService";
import { ContactService } from "../contacts/ContactService";
import { FileAttachmentService, type CopiedAttachmentFileInput } from "../files/FileAttachmentService";
import { LinkService } from "../links/LinkService";
import { ListService } from "../lists/ListService";
import { NoteService } from "../notes/NoteService";
import { ProjectService } from "../projects/ProjectService";
import { RelationshipService } from "../relationships/RelationshipService";
import { SavedViewService } from "../savedViews/SavedViewService";
import { TaskService } from "../tasks/TaskService";

export type DemoWorkspaceServiceIdFactory = (prefix: string) => string;

export type DemoWorkspaceSeedInput = {
  workspaceId: string;
  actorType?: ActivityActorType;
  sampleFile?: CopiedAttachmentFileInput;
};

export type DemoWorkspaceSeedResult = {
  workspaceId: string;
  categoryIds: string[];
  projectIds: string[];
  contactIds: string[];
  taskItemIds: string[];
  noteItemIds: string[];
  listItemIds: string[];
  linkItemIds: string[];
  fileItemIds: string[];
  savedViewIds: string[];
  relationshipIds: string[];
  activityId: string;
};

const DEMO_ACTOR: ActivityActorType = "system";

export class DemoWorkspaceService {
  readonly module = "demoWorkspace";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: DemoWorkspaceServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: DemoWorkspaceServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  async seedDemoWorkspace(input: DemoWorkspaceSeedInput): Promise<DemoWorkspaceSeedResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const actorType = input.actorType ?? DEMO_ACTOR;
    const timestamp = createIsoTimestamp(this.now());
    const serviceInput = {
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    };
    const categoryService = new CategoryService(serviceInput);
    const projectService = new ProjectService(serviceInput);
    const contactService = new ContactService(serviceInput);
    const taskService = new TaskService(serviceInput);
    const noteService = new NoteService(serviceInput);
    const listService = new ListService(serviceInput);
    const linkService = new LinkService(serviceInput);
    const fileService = new FileAttachmentService(serviceInput);
    const tagService = new TagService(serviceInput);
    const relationshipService = new RelationshipService(serviceInput);
    const savedViewService = new SavedViewService(serviceInput);

    const inbox = new ContainerRepository(this.connection).findSystemInbox(input.workspaceId);

    if (inbox === null) {
      throw new Error("Demo workspace seed requires a system Inbox container.");
    }

    const operations = await categoryService.createCategory({
      workspaceId: input.workspaceId,
      name: "Operations",
      color: "#245c55",
      description: "Demo work related to launches, coordination, and local QA.",
      actorType
    });
    const clientWork = await categoryService.createCategory({
      workspaceId: input.workspaceId,
      name: "Client Work",
      color: "#7c3aed",
      description: "Demo client-facing projects and contact follow-ups.",
      actorType
    });

    const launch = await projectService.createProject({
      workspaceId: input.workspaceId,
      name: "Launch Readiness",
      description: "Demo project showing tasks, notes, files, links, tags, and dashboard-ready activity.",
      categoryId: operations.id,
      color: "#245c55",
      isFavorite: true,
      actorType
    });
    const research = await projectService.createProject({
      workspaceId: input.workspaceId,
      name: "Customer Research Sprint",
      description: "Demo project for interviews, synthesis, and follow-up planning.",
      categoryId: clientWork.id,
      color: "#7c3aed",
      actorType
    });

    const alex = await contactService.createContact({
      workspaceId: input.workspaceId,
      name: "Alex Morgan",
      description: "Demo stakeholder for the launch workspace. Fictional sample contact.",
      categoryId: clientWork.id,
      isFavorite: true,
      actorType,
      fields: [
        { label: "Role", value: "Product sponsor", type: "text", sortOrder: 0 },
        { label: "Email", value: "alex@example.test", type: "email", sortOrder: 1 },
        { label: "Timezone", value: "Australia/Sydney", type: "text", sortOrder: 2 }
      ]
    });
    const casey = await contactService.createContact({
      workspaceId: input.workspaceId,
      name: "Casey Rivera",
      description: "Demo operations partner. Fictional sample contact.",
      categoryId: operations.id,
      actorType,
      fields: [
        { label: "Role", value: "QA coordinator", type: "text", sortOrder: 0 },
        { label: "Email", value: "casey@example.test", type: "email", sortOrder: 1 }
      ]
    });

    const today = startOfLocalDay(this.now(), 0);
    const tomorrow = startOfLocalDay(this.now(), 1);
    const nextWeek = startOfLocalDay(this.now(), 7);

    const inboxTask = await taskService.createTask({
      workspaceId: input.workspaceId,
      containerId: inbox.id,
      title: "Triage imported feedback @demo",
      body: "Inbox demo task showing quick capture before work is organized.",
      dueAt: today,
      priority: 2,
      actorType
    });
    const qaTask = await taskService.createTask({
      workspaceId: input.workspaceId,
      containerId: launch.project.id,
      title: "Run release smoke checklist @launch",
      body: "Walk through dashboard, projects, contacts, search, attachments, and exports.",
      dueAt: tomorrow,
      priority: 1,
      categoryId: operations.id,
      actorType
    });
    const waitingTask = await taskService.createTask({
      workspaceId: input.workspaceId,
      containerId: research.project.id,
      title: "Confirm interview slots with Alex @research",
      body: "Waiting on stakeholder availability before scheduling synthesis work.",
      dueAt: nextWeek,
      priority: 3,
      status: "waiting",
      categoryId: clientWork.id,
      actorType
    });

    const launchNote = await noteService.createNote({
      workspaceId: input.workspaceId,
      containerId: launch.project.id,
      title: "Demo workspace orientation",
      content: [
        "# Demo workspace orientation",
        "",
        "This sample workspace is generated locally and uses fictional names, domains, and assets.",
        "",
        "Try the dashboard, Today view, project pages, contact pages, local search, tags, categories, and attachments.",
        "",
        "Related work: [[Customer Research Sprint]] @demo @launch"
      ].join("\n"),
      categoryId: operations.id,
      pinned: true,
      actorType
    });
    const researchNote = await noteService.createNote({
      workspaceId: input.workspaceId,
      containerId: research.project.id,
      title: "Interview synthesis notes",
      content: "Capture findings here after each fictional interview. @research\n\n- Pain point\n- Decision criteria\n- Follow-up owner",
      categoryId: clientWork.id,
      actorType
    });

    const checklist = await listService.createList({
      workspaceId: input.workspaceId,
      containerId: launch.project.id,
      title: "Demo tour checklist",
      body: "A short path for reviewers validating the generated workspace.",
      categoryId: operations.id,
      progressMode: "count",
      actorType
    });
    const checklistItems = [
      await listService.addListItem({
        listId: checklist.item.id,
        title: "Open the dashboard and review widgets",
        status: "done",
        actorType
      }),
      await listService.addListItem({
        listId: checklist.item.id,
        title: "Browse Launch Readiness project content",
        actorType
      }),
      await listService.addListItem({
        listId: checklist.item.id,
        title: "Search for @demo and review results",
        dueAt: tomorrow,
        actorType
      })
    ];

    const privacyLink = await linkService.createLink({
      workspaceId: input.workspaceId,
      containerId: launch.project.id,
      url: "https://example.test/local-work-os/demo-privacy",
      title: "Demo local-only reference link",
      description: "Fictional link metadata stored locally for UI review.",
      categoryId: operations.id,
      actorType
    });

    const fileResult = input.sampleFile === undefined
      ? null
      : await fileService.attachFileToContainer({
          workspaceId: input.workspaceId,
          containerId: launch.project.id,
          copiedFile: input.sampleFile,
          description: "Generated local demo brief stored under workspace attachments.",
          actorType
        });

    await tagService.addTagToTarget({
      workspaceId: input.workspaceId,
      targetType: "container",
      targetId: launch.project.id,
      name: "demo",
      actorType
    });
    await tagService.addTagToTarget({
      workspaceId: input.workspaceId,
      targetType: "container",
      targetId: research.project.id,
      name: "research",
      actorType
    });
    await tagService.addTagToTarget({
      workspaceId: input.workspaceId,
      targetType: "item",
      targetId: privacyLink.item.id,
      name: "reference",
      actorType
    });

    const relationships = [
      await relationshipService.createRelationship({
        workspaceId: input.workspaceId,
        source: { type: "container", id: alex.contact.id },
        target: { type: "container", id: research.project.id },
        relationType: "related",
        label: "Research sponsor",
        actorType
      }),
      await relationshipService.createRelationship({
        workspaceId: input.workspaceId,
        source: { type: "container", id: casey.contact.id },
        target: { type: "container", id: launch.project.id },
        relationType: "related",
        label: "Launch QA partner",
        actorType
      }),
      await relationshipService.createRelationship({
        workspaceId: input.workspaceId,
        source: { type: "item", id: qaTask.item.id },
        target: { type: "item", id: checklist.item.id },
        relationType: "references",
        label: "Smoke path",
        actorType
      })
    ];

    const savedViews = [
      await savedViewService.createSavedView({
        workspaceId: input.workspaceId,
        type: "collection",
        name: "Demo tagged work",
        description: "Generated collection for all sample work tagged @demo.",
        query: {
          version: 1,
          match: "all",
          targets: ["item", "container"],
          conditions: [{ field: "tag", operator: "has", value: "demo" }],
          groupBy: "container",
          sort: [{ field: "updatedAt", direction: "desc" }]
        },
        display: { kind: "tag", tagSlug: "demo" },
        isFavorite: true,
        actorType
      }),
      await savedViewService.createSavedView({
        workspaceId: input.workspaceId,
        type: "smart_list",
        name: "Demo waiting follow-ups",
        description: "Waiting sample tasks for reviewer planning checks.",
        query: {
          version: 1,
          match: "all",
          targets: ["item"],
          conditions: [
            { field: "itemType", operator: "is", value: "task" },
            { field: "taskStatus", operator: "is", value: "waiting" }
          ],
          groupBy: "status",
          sort: [{ field: "dueAt", direction: "asc" }]
        },
        display: { kind: "task_review" },
        isFavorite: true,
        actorType
      })
    ];

    const activityId = this.idFactory("activity");
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      id: activityId,
      workspaceId: input.workspaceId,
      actorType,
      action: ActivityAction.workspacePreferencesUpdated,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: "Generated optional demo workspace sample data.",
      beforeJson: null,
      afterJson: JSON.stringify({
        projects: [launch.project.id, research.project.id],
        contacts: [alex.contact.id, casey.contact.id],
        sampleFile: fileResult?.attachment.id ?? null
      }),
      timestamp
    });

    return {
      workspaceId: input.workspaceId,
      categoryIds: [operations.id, clientWork.id],
      projectIds: [launch.project.id, research.project.id],
      contactIds: [alex.contact.id, casey.contact.id],
      taskItemIds: [inboxTask.item.id, qaTask.item.id, waitingTask.item.id],
      noteItemIds: [launchNote.item.id, researchNote.item.id],
      listItemIds: checklistItems.map((item) => item.listItem.id),
      linkItemIds: [privacyLink.item.id],
      fileItemIds: fileResult === null ? [] : [fileResult.item.id],
      savedViewIds: savedViews.map((view) => view.savedView.id),
      relationshipIds: relationships.map((result) => result.relationship.id),
      activityId
    };
  }
}

function startOfLocalDay(reference: Date, offsetDays: number): string {
  const date = new Date(reference);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}


