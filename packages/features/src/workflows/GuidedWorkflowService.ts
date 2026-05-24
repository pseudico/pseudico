import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  TransactionService,
  WorkflowRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type WorkflowRunRecord
} from "@local-work-os/db";
import { NoteService } from "../notes/NoteService";
import { RelationshipService } from "../relationships/RelationshipService";
import { TaskService } from "../tasks/TaskService";
import {
  HOUSE_RENOVATION_PROJECT_ID,
  HOUSE_RENOVATION_PROJECT_NAME,
  HOUSE_RENOVATION_CONTACTS,
  getGuidedWorkflowTemplate,
  getHouseRenovationContact,
  listGuidedWorkflowTemplates,
  type GuidedWorkflowTemplate,
  type GuidedWorkflowTemplateId
} from "./GuidedWorkflowTemplates";

const GUIDED_WORKFLOW_PREVIEW_KIND = "local-work-os.guided-workflow-preview";
const GUIDED_WORKFLOW_PREVIEW_VERSION = 1;

export type GuidedWorkflowServiceIdFactory = (prefix: string) => string;

export type GuidedWorkflowInput = {
  workspaceId: string;
  templateId: GuidedWorkflowTemplateId;
  projectId?: string;
  contactId?: string;
  reviewFocus?: string;
  followUpType?: string;
  dueDate?: string;
  approvalArea?: string;
};

export type ExecuteGuidedWorkflowInput = GuidedWorkflowInput & {
  confirmed: true;
  actorType?: ActivityActorType;
};

export type GuidedWorkflowPlannedChange = {
  id: string;
  operation: "create" | "link";
  objectType: "task" | "note" | "relationship";
  title: string;
  description: string;
  targetProjectId: string | null;
  targetProjectName: string | null;
  targetContactId: string | null;
  targetContactName: string | null;
  tags: string[];
  categoryName: string | null;
  dueDate: string | null;
};

export type GuidedWorkflowPreview = {
  kind: typeof GUIDED_WORKFLOW_PREVIEW_KIND;
  version: typeof GUIDED_WORKFLOW_PREVIEW_VERSION;
  workspaceId: string;
  template: GuidedWorkflowTemplate;
  projectId: string;
  projectName: string | null;
  contactId: string | null;
  contactName: string | null;
  canRun: boolean;
  issues: string[];
  plannedChanges: GuidedWorkflowPlannedChange[];
  confirmationLabel: string;
};

export type GuidedWorkflowCreatedLink = {
  targetType: "item" | "relationship" | "workflow_run";
  targetId: string;
  title: string;
  route: string;
};

export type GuidedWorkflowActionResult = {
  changeId: string;
  status: "created" | "linked" | "skipped";
  targetType: "item" | "relationship";
  targetId: string | null;
  title: string;
};

export type GuidedWorkflowExecutionResult = {
  preview: GuidedWorkflowPreview;
  run: WorkflowRunRecord;
  status: "completed" | "failed";
  summary: string;
  partialFailure: boolean;
  createdLinks: GuidedWorkflowCreatedLink[];
  actionResults: GuidedWorkflowActionResult[];
  errorMessage: string | null;
};

export type GuidedWorkflowRunHistoryEntry = {
  runId: string;
  templateId: GuidedWorkflowTemplateId;
  templateName: string;
  status: WorkflowRunRecord["status"];
  projectName: string | null;
  contactName: string | null;
  plannedChangeCount: number;
  completedChangeCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type PlannedTaskStep = {
  id: string;
  kind: "task";
  title: string;
  body: string | null;
  tags: string[];
  dueAt?: string | null;
};

type PlannedNoteStep = {
  id: string;
  kind: "note";
  title: string;
  content: string;
  tags: string[];
};

type PlannedRelationshipStep = {
  id: string;
  kind: "relationship";
  title: string;
  description: string;
  sourceStepId: string;
  sourceKind: "task" | "note";
  relationType: "follow_up_for" | "references";
};

type PlannedStep = PlannedTaskStep | PlannedNoteStep | PlannedRelationshipStep;

type BuildPlanResult = {
  preview: GuidedWorkflowPreview;
  steps: PlannedStep[];
  project: ContainerRecord | null;
  contact: ContainerRecord | null;
};

type ProjectReviewFocus =
  | "balcony_approvals"
  | "painting"
  | "electrical"
  | "bathroom"
  | "budget_risk"
  | "all";

type ContactFollowUpType =
  | "call"
  | "email"
  | "quote"
  | "approval"
  | "availability";

type ApprovalReviewArea = "balcony" | "bathroom" | "electrical" | "all";

export class GuidedWorkflowService {
  readonly module = "workflows.guided";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: GuidedWorkflowServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: GuidedWorkflowServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  listTemplates(): GuidedWorkflowTemplate[] {
    return listGuidedWorkflowTemplates();
  }

  preview(input: GuidedWorkflowInput): GuidedWorkflowPreview {
    return this.buildPlan(input).preview;
  }

  async execute(
    input: ExecuteGuidedWorkflowInput
  ): Promise<GuidedWorkflowExecutionResult> {
    if (input.confirmed !== true) {
      throw new Error("Guided workflow execution requires explicit confirmation.");
    }

    const plan = this.buildPlan(input);
    if (!plan.preview.canRun) {
      return this.recordFailedRun({
        preview: plan.preview,
        errorMessage: "Guided workflow preview has blocking issues.",
        actorType: input.actorType ?? "local_user"
      });
    }

    try {
      return await this.transactionService.runInTransaction(async () => {
        const timestamp = createIsoTimestamp(this.now());
        const repository = new WorkflowRepository(this.connection);
        const runningRun = repository.createRun({
          id: this.idFactory("workflow_run"),
          workspaceId: input.workspaceId,
          workflowDefinitionId: null,
          status: "running",
          previewJson: JSON.stringify(plan.preview),
          startedAt: timestamp
        });
        const actionResults: GuidedWorkflowActionResult[] = [];
        const createdItemIdsByStep = new Map<string, string>();
        const createdLinks: GuidedWorkflowCreatedLink[] = [];

        for (const step of plan.steps) {
          if (step.kind === "task") {
            const result = await new TaskService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createTask({
              workspaceId: input.workspaceId,
              containerId: plan.preview.projectId,
              title: step.title,
              body: step.body,
              dueAt: step.dueAt ?? null,
              actorType: input.actorType ?? "local_user"
            });
            createdItemIdsByStep.set(step.id, result.item.id);
            actionResults.push({
              changeId: step.id,
              status: "created",
              targetType: "item",
              targetId: result.item.id,
              title: result.item.title
            });
            createdLinks.push(toItemLink(result.item.id, result.item.title));
          } else if (step.kind === "note") {
            const result = await new NoteService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createNote({
              workspaceId: input.workspaceId,
              containerId: plan.preview.projectId,
              title: step.title,
              content: step.content,
              actorType: input.actorType ?? "local_user"
            });
            createdItemIdsByStep.set(step.id, result.item.id);
            actionResults.push({
              changeId: step.id,
              status: "created",
              targetType: "item",
              targetId: result.item.id,
              title: result.item.title
            });
            createdLinks.push(toItemLink(result.item.id, result.item.title));
          } else {
            const sourceItemId = createdItemIdsByStep.get(step.sourceStepId);
            if (sourceItemId === undefined || plan.preview.contactId === null) {
              actionResults.push({
                changeId: step.id,
                status: "skipped",
                targetType: "relationship",
                targetId: null,
                title: step.title
              });
              continue;
            }

            const result = await new RelationshipService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createRelationship({
              workspaceId: input.workspaceId,
              source: { type: "item", id: sourceItemId },
              target: { type: "container", id: plan.preview.contactId },
              relationType: step.relationType,
              label: "guided_workflow_contact_follow_up",
              actorType: input.actorType ?? "local_user"
            });
            actionResults.push({
              changeId: step.id,
              status: result.changed ? "linked" : "skipped",
              targetType: "relationship",
              targetId: result.relationship.id,
              title: step.title
            });
          }
        }

        const completedAt = createIsoTimestamp(this.now());
        const completedRun = repository.updateRun({
          id: runningRun.id,
          status: "completed",
          actionResultsJson: JSON.stringify(actionResults),
          completedAt
        });

        this.logWorkflowRunEvent({
          workspaceId: input.workspaceId,
          templateId: plan.preview.template.id,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.workflowRunCompleted,
          summary: `Ran guided workflow "${plan.preview.template.name}" (${actionResults.length} steps).`,
          before: runningRun,
          after: completedRun,
          timestamp: completedAt
        });

        createdLinks.push({
          targetType: "workflow_run",
          targetId: completedRun.id,
          title: `Run history: ${plan.preview.template.name}`,
          route: "/workflows"
        });

        return {
          preview: plan.preview,
          run: completedRun,
          status: "completed",
          summary: `Created or linked ${actionResults.filter((result) => result.status !== "skipped").length} workflow changes.`,
          partialFailure: false,
          createdLinks,
          actionResults,
          errorMessage: null
        };
      });
    } catch (error) {
      return this.recordFailedRun({
        preview: plan.preview,
        errorMessage: error instanceof Error ? error.message : "Guided workflow run failed.",
        actorType: input.actorType ?? "local_user"
      });
    }
  }

  listRunHistory(input: {
    workspaceId: string;
    limit?: number;
  }): GuidedWorkflowRunHistoryEntry[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    return new WorkflowRepository(this.connection)
      .listRuns({ workspaceId: input.workspaceId, limit: input.limit ?? 25 })
      .map(toGuidedWorkflowHistoryEntry)
      .filter(isPresent);
  }

  private buildPlan(input: GuidedWorkflowInput): BuildPlanResult {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.templateId, "templateId");
    const template = getGuidedWorkflowTemplate(input.templateId);
    if (template === null) {
      throw new Error(`Unknown guided workflow template: ${input.templateId}.`);
    }

    const projectId = input.projectId?.trim() || HOUSE_RENOVATION_PROJECT_ID;
    const contactId = input.templateId === "house_contact_follow_up"
      ? input.contactId?.trim() || HOUSE_RENOVATION_CONTACTS[0].id
      : null;
    const reviewFocus = normalizeProjectReviewFocus(input.reviewFocus);
    const followUpType = normalizeContactFollowUpType(input.followUpType);
    const approvalArea = normalizeApprovalReviewArea(input.approvalArea);
    const dueDate = normalizeOptionalDueDate(input.dueDate);
    const repository = new ContainerRepository(this.connection);
    const project = repository.getById(projectId);
    const knownContact = contactId === null ? null : getHouseRenovationContact(contactId);
    const contact = contactId === null ? null : repository.getById(contactId);
    const issues: string[] = [];

    if (project === null || project.workspaceId !== input.workspaceId || project.type !== "project") {
      issues.push(`Project was not found in this workspace: ${projectId}.`);
    }

    if (input.templateId === "house_contact_follow_up") {
      if (contactId === "") {
        issues.push("Choose a contact before previewing this workflow.");
      } else if (knownContact === null) {
        issues.push("Choose one of the supported renovation contacts.");
      } else if (contact === null || contact.workspaceId !== input.workspaceId || contact.type !== "contact") {
        issues.push(`Contact was not found in this workspace: ${contactId}.`);
      }

      if (input.followUpType !== undefined && followUpType === null) {
        issues.push("Choose a supported follow-up type: call, email, quote, approval, or availability.");
      }

      if (dueDate === "invalid") {
        issues.push("Optional due date must use YYYY-MM-DD.");
      }
    }

    if (input.templateId === "house_project_review" && input.reviewFocus !== undefined && reviewFocus === null) {
      issues.push("Choose a supported review focus.");
    }

    if (input.templateId === "house_approval_decision_review" && input.approvalArea !== undefined && approvalArea === null) {
      issues.push("Choose a supported approval area.");
    }

    const steps = buildSteps({
      templateId: input.templateId,
      projectName: project?.name ?? HOUSE_RENOVATION_PROJECT_NAME,
      contact: knownContact,
      reviewFocus: reviewFocus ?? "all",
      followUpType: followUpType ?? defaultFollowUpTypeForContact(knownContact?.id ?? null),
      dueDate: dueDate === "invalid" ? null : dueDate,
      approvalArea: approvalArea ?? "all"
    });

    const plannedChanges = steps.map((step): GuidedWorkflowPlannedChange => {
      const tags = step.kind === "relationship" ? [] : step.tags;
      return {
        id: step.id,
        operation: step.kind === "relationship" ? "link" : "create",
        objectType: step.kind === "relationship" ? "relationship" : step.kind,
        title: step.title,
        description: step.kind === "relationship" ? step.description : describeCreateStep(step),
        targetProjectId: projectId,
        targetProjectName: project?.name ?? null,
        targetContactId: contactId,
        targetContactName: contact?.name ?? knownContact?.name ?? null,
        tags,
        categoryName: tags.includes("approval") ? "Strata / approval" : null,
        dueDate: step.kind === "task" ? step.dueAt ?? null : null
      };
    });

    return {
      preview: {
        kind: GUIDED_WORKFLOW_PREVIEW_KIND,
        version: GUIDED_WORKFLOW_PREVIEW_VERSION,
        workspaceId: input.workspaceId,
        template,
        projectId,
        projectName: project?.name ?? null,
        contactId,
        contactName: contact?.name ?? knownContact?.name ?? null,
        canRun: issues.length === 0,
        issues,
        plannedChanges,
        confirmationLabel: `Create ${plannedChanges.filter((change) => change.operation === "create").length} items${plannedChanges.some((change) => change.operation === "link") ? " and links" : ""}`
      },
      steps,
      project,
      contact
    };
  }

  private recordFailedRun(input: {
    preview: GuidedWorkflowPreview;
    errorMessage: string;
    actorType: ActivityActorType;
  }): GuidedWorkflowExecutionResult {
    const timestamp = createIsoTimestamp(this.now());
    const run = new WorkflowRepository(this.connection).createRun({
      id: this.idFactory("workflow_run"),
      workspaceId: input.preview.workspaceId,
      workflowDefinitionId: null,
      status: "failed",
      previewJson: JSON.stringify(input.preview),
      actionResultsJson: "[]",
      errorMessage: input.errorMessage,
      startedAt: timestamp,
      completedAt: timestamp
    });

    this.logWorkflowRunEvent({
      workspaceId: input.preview.workspaceId,
      templateId: input.preview.template.id,
      actorType: input.actorType,
      action: ActivityAction.workflowRunFailed,
      summary: `Guided workflow "${input.preview.template.name}" failed: ${input.errorMessage}`,
      before: null,
      after: run,
      timestamp
    });

    return {
      preview: input.preview,
      run,
      status: "failed",
      summary: "No workflow changes were created.",
      partialFailure: false,
      createdLinks: [{
        targetType: "workflow_run",
        targetId: run.id,
        title: `Failed run: ${input.preview.template.name}`,
        route: "/workflows"
      }],
      actionResults: [],
      errorMessage: input.errorMessage
    };
  }

  private logWorkflowRunEvent(input: {
    workspaceId: string;
    templateId: string;
    actorType: ActivityActorType;
    action: typeof ActivityAction.workflowRunCompleted | typeof ActivityAction.workflowRunFailed;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "workflow",
      targetId: input.templateId,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

function buildSteps(input: {
  templateId: GuidedWorkflowTemplateId;
  projectName: string;
  contact: ReturnType<typeof getHouseRenovationContact>;
  reviewFocus: ProjectReviewFocus;
  followUpType: ContactFollowUpType;
  dueDate: string | null;
  approvalArea: ApprovalReviewArea;
}): PlannedStep[] {
  if (input.templateId === "house_project_review") {
    const reviewTasks: PlannedTaskStep[] = [
      task("review-balcony-approvals", "Review open balcony approvals @review @balcony", "Check strata responses, defect evidence, and by-law questions before the next follow-up.", ["review", "balcony"]),
      task("review-budget-risk", "Review active budget-risk items @review @budget-risk", "Look for quote, auction, furniture, bathroom, and hot-water items that could affect budget.", ["review", "budget-risk"]),
      task("review-bathroom", "Confirm deferred bathroom decisions @review @bathroom", "Confirm what remains deferred to 2027 and what approval questions still need strata.", ["review", "bathroom"]),
      task("review-contacts", "Check unfinished contact follow-ups @review @contacts", "Review Strata, Phillipa, Terry, DJ, LikeButter, auction, Alibaba, and bathroom builder follow-ups.", ["review", "contacts"]),
      task("review-painting", "Review spring painting weekend plan @review @painting", "Check Phillipa coordination, prep tasks, paint samples, and weekend sequencing.", ["review", "painting"]),
      task("review-electrical", "Review electrical and fan scope before contacting DJ @review @electrical", "Confirm lighting, ceiling fan, conduit, power-point, and networking scope before the bundled follow-up.", ["review", "electrical"])
    ];
    const selectedTasks = reviewTasks.filter((step) => shouldIncludeProjectReviewTask(step.id, input.reviewFocus));
    return [
      {
        id: "review-note",
        kind: "note",
        title: `Workflow review: ${input.projectName}`,
        content: [
          `# Workflow review: ${input.projectName}`,
          "",
          "Use this note to review open renovation context without losing track of approvals, budget risk, bathroom deferrals, and contact follow-ups.",
          "",
          "Starting points:",
          "- Balcony defect chronology and evidence @balcony @evidence",
          "- Decision log: balcony screen and BBQ deferred @decision @deferred",
          "- Measurements register @measurements",
          "- Electrical scope for DJ @electrical",
          "",
          "Outcome: decide which review tasks can be closed, deferred, or escalated."
        ].join("\n"),
        tags: ["review", "renovation", "house"]
      },
      ...selectedTasks
    ];
  }

  if (input.templateId === "house_contact_follow_up") {
    const contact = input.contact;
    const taskId = "contact-task";
    const noteId = "contact-note";
    return contact === null
      ? []
      : [
          {
            id: taskId,
            kind: "task",
            title: getContactFollowUpTaskTitle(contact, input.followUpType),
            body: `Follow-up type: ${input.followUpType}. Follow-up for ${contact.name}. ${contact.notePrompt} Tags: ${[...contact.tags, input.followUpType].map((tag) => `@${tag}`).join(" ")}`,
            tags: [...contact.tags, input.followUpType],
            dueAt: input.dueDate
          },
          {
            id: noteId,
            kind: "note",
            title: contact.noteTitle,
            content: [
              `# ${contact.noteTitle}`,
              "",
              `Contact: ${contact.name}`,
              "",
              contact.notePrompt,
              "",
              "Before calling, review the relevant renovation notes, measurements, defects, and deferred decisions.",
              "",
              `Tags: ${contact.tags.map((tag) => `@${tag}`).join(" ")}`
            ].join("\n"),
            tags: [...contact.tags]
          },
          {
            id: "link-contact-task",
            kind: "relationship",
            title: `Link task to ${contact.name}`,
            description: "Creates a local follow-up relationship from the new task to the selected contact.",
            sourceStepId: taskId,
            sourceKind: "task",
            relationType: "follow_up_for"
          },
          {
            id: "link-contact-note",
            kind: "relationship",
            title: `Link note to ${contact.name}`,
            description: "Creates a local reference relationship from the new note to the selected contact.",
            sourceStepId: noteId,
            sourceKind: "note",
            relationType: "references"
          }
        ];
  }

  const approvalTasks: PlannedTaskStep[] = [
    task("approval-bbq-screen", "Confirm balcony BBQ/screen by-law path @approval @balcony", "Ask strata which by-laws and mounting constraints apply to balcony screen and BBQ decisions.", ["approval", "review", "balcony"]),
    task("approval-bathroom-path", "Confirm bathroom approval path with strata @approval @bathroom", "Clarify whether bathroom plumbing/layout changes need strata approval before quote scoping.", ["bathroom", "approval", "review"]),
    task("approval-electrical-path", "Confirm electrical/fan approval path with strata @approval @electrical", "Clarify whether recessed lighting, fans, conduit, or power-point work needs strata approval before scoping.", ["electrical", "approval", "review"]),
    task("approval-deferred-decisions", "Record deferred decisions after approval review @decision", "Decide whether each deferred balcony screen, BBQ, bathroom, or electrical item stays deferred, becomes blocked, or needs a new next action.", ["decision", "deferred", "review"])
  ];
  const selectedApprovalTasks = approvalTasks.filter((step) => shouldIncludeApprovalTask(step.id, input.approvalArea));

  return [
    {
      id: "approval-note",
      kind: "note",
      title: `Approval review: ${input.projectName}`,
      content: [
        `# Approval review: ${input.projectName}`,
        "",
        "Use this note to gather unresolved approval paths and deferred renovation decisions before contacting strata.",
        "",
        "Review these existing records:",
        "- Confirm by-laws for BBQ/screen mounting @approval",
        "- Ask strata about bathroom approval path @bathroom @approval",
        "- Decision log: balcony screen and BBQ deferred @decision @deferred",
        "- Decision log: bathroom deferred to 2027 @decision @bathroom @deferred",
        "",
        "Record what is approved, blocked, waiting, or deferred."
      ].join("\n"),
      tags: ["approval", "review", "balcony", "bathroom"]
    },
    ...selectedApprovalTasks
  ];
}

function task(
  id: string,
  title: string,
  body: string,
  tags: string[]
): PlannedTaskStep {
  return { id, kind: "task", title, body, tags };
}

function describeCreateStep(step: PlannedTaskStep | PlannedNoteStep): string {
  return step.kind === "task"
    ? `Creates a local task in the selected project${step.dueAt === undefined || step.dueAt === null ? "." : ` due ${step.dueAt}.`}`
    : "Creates a local Markdown note in the selected project.";
}

function shouldIncludeProjectReviewTask(taskId: string, focus: ProjectReviewFocus): boolean {
  if (focus === "all") {
    return ["review-balcony-approvals", "review-budget-risk", "review-bathroom", "review-contacts"].includes(taskId);
  }

  return (focus === "balcony_approvals" && taskId === "review-balcony-approvals") ||
    (focus === "painting" && taskId === "review-painting") ||
    (focus === "electrical" && taskId === "review-electrical") ||
    (focus === "bathroom" && taskId === "review-bathroom") ||
    (focus === "budget_risk" && taskId === "review-budget-risk");
}

function shouldIncludeApprovalTask(taskId: string, area: ApprovalReviewArea): boolean {
  if (area === "all") {
    return ["approval-bbq-screen", "approval-bathroom-path", "approval-deferred-decisions"].includes(taskId);
  }

  return (area === "balcony" && (taskId === "approval-bbq-screen" || taskId === "approval-deferred-decisions")) ||
    (area === "bathroom" && (taskId === "approval-bathroom-path" || taskId === "approval-deferred-decisions")) ||
    (area === "electrical" && (taskId === "approval-electrical-path" || taskId === "approval-deferred-decisions"));
}

function getContactFollowUpTaskTitle(
  contact: NonNullable<ReturnType<typeof getHouseRenovationContact>>,
  followUpType: ContactFollowUpType
): string {
  if (followUpType === defaultFollowUpTypeForContact(contact.id)) {
    return contact.taskTitle;
  }

  const prefix = {
    call: "Call",
    email: "Email",
    quote: "Request quote from",
    approval: "Request approval update from",
    availability: "Confirm availability with"
  } satisfies Record<ContactFollowUpType, string>;

  return `${prefix[followUpType]} ${contact.name} about renovation follow-up @${followUpType}`;
}

function defaultFollowUpTypeForContact(contactId: string | null): ContactFollowUpType {
  if (contactId === "container_mpg4y33l_1rugx8alx10") {
    return "availability";
  }
  if (contactId === "container_mpg4y34c_1w7afibnvbq" || contactId === "container_mpg4y33y_0icdh4olyn8") {
    return "quote";
  }
  return "approval";
}

function normalizeProjectReviewFocus(value: string | undefined): ProjectReviewFocus | null {
  if (value === undefined || value === "") {
    return "all";
  }
  return value === "balcony_approvals" ||
    value === "painting" ||
    value === "electrical" ||
    value === "bathroom" ||
    value === "budget_risk" ||
    value === "all"
    ? value
    : null;
}

function normalizeContactFollowUpType(value: string | undefined): ContactFollowUpType | null {
  if (value === undefined || value === "") {
    return "approval";
  }
  return value === "call" ||
    value === "email" ||
    value === "quote" ||
    value === "approval" ||
    value === "availability"
    ? value
    : null;
}

function normalizeApprovalReviewArea(value: string | undefined): ApprovalReviewArea | null {
  if (value === undefined || value === "") {
    return "all";
  }
  return value === "balcony" || value === "bathroom" || value === "electrical" || value === "all"
    ? value
    : null;
}

function normalizeOptionalDueDate(value: string | undefined): string | null | "invalid" {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(new Date(`${trimmed}T00:00:00.000Z`).getTime())) {
    return "invalid";
  }

  return trimmed;
}

function toItemLink(itemId: string, title: string): GuidedWorkflowCreatedLink {
  return {
    targetType: "item",
    targetId: itemId,
    title,
    route: `/search?q=${encodeURIComponent(title)}`
  };
}

function toGuidedWorkflowHistoryEntry(
  run: WorkflowRunRecord
): GuidedWorkflowRunHistoryEntry | null {
  const preview = parsePreview(run.previewJson);
  if (preview === null) {
    return null;
  }

  const actionResults = parseActionResults(run.actionResultsJson);

  return {
    runId: run.id,
    templateId: preview.template.id,
    templateName: preview.template.name,
    status: run.status,
    projectName: preview.projectName,
    contactName: preview.contactName,
    plannedChangeCount: preview.plannedChanges.length,
    completedChangeCount: actionResults.filter((result) => result.status !== "skipped").length,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt,
    completedAt: run.completedAt
  };
}

function parsePreview(value: string): GuidedWorkflowPreview | null {
  try {
    const parsed = JSON.parse(value) as GuidedWorkflowPreview;
    return parsed.kind === GUIDED_WORKFLOW_PREVIEW_KIND &&
      parsed.version === GUIDED_WORKFLOW_PREVIEW_VERSION
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function parseActionResults(value: string): GuidedWorkflowActionResult[] {
  try {
    const parsed = JSON.parse(value) as GuidedWorkflowActionResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function validateNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

export const guidedWorkflowsModuleContract = {
  module: "workflows.guided",
  purpose:
    "Expose predefined local-only guided workflows with read-only preview, explicit confirmation, service-backed execution, and run history.",
  owns: ["guided workflow templates", "guided workflow preview", "guided workflow execution summaries"],
  doesNotOwn: ["background automation", "user-authored scripts", "cloud workflows", "remote execution"],
  integrationPoints: ["tasks", "notes", "relationships", "activity", "search", "workflow_runs"],
  priority: "V1"
} as const;
