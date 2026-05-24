export const HOUSE_RENOVATION_WORKSPACE_ID = "workspace_mpg4xgw1_1twlscuxhd8";
export const HOUSE_RENOVATION_PROJECT_ID = "container_mpg4xp68_0703fc0zpbr";
export const HOUSE_RENOVATION_PROJECT_NAME = "House Renovation and Fit-Out 2026";

export const HOUSE_RENOVATION_CONTACTS = [
  {
    id: "container_mpg4y338_1f6bjrvu1at",
    name: "Strata manager / owners corporation",
    shortName: "Strata",
    taskTitle: "Follow up strata about balcony inspection status @balcony @strata",
    noteTitle: "Strata follow-up call notes",
    tags: ["balcony", "strata", "approval", "contacts"],
    notePrompt:
      "Use this note during the next strata call. Capture inspection status, common-property advice, by-law path, owner-corporation blockers, and next date promised."
  },
  {
    id: "container_mpg4y33l_1rugx8alx10",
    name: "Phillipa",
    shortName: "Phillipa",
    taskTitle: "Confirm spring painting availability with Phillipa @painting",
    noteTitle: "Painting weekend coordination notes",
    tags: ["painting", "spring", "contacts"],
    notePrompt:
      "Use this note to confirm the painting weekend, paint contribution, prep list, and who is buying sample pots, rollers, drop sheets, and masking tape."
  },
  {
    id: "container_mpg4y34c_1w7afibnvbq",
    name: "Terry",
    shortName: "Terry",
    taskTitle: "Ask Terry for balcony screen feasibility and quote @balcony",
    noteTitle: "Balcony screen fabrication notes",
    tags: ["balcony", "quote", "vendor", "contacts"],
    notePrompt:
      "Use this note to capture Terry's view on screen fabrication, powder coating, mounting points, trellis ring bolts, and approval constraints."
  },
  {
    id: "container_mpg4y33y_0icdh4olyn8",
    name: "DJ DeRiu",
    shortName: "DJ",
    taskTitle: "Send DJ bundled electrical/fan/power-point scope @electrical",
    noteTitle: "Electrical scope call notes",
    tags: ["electrical", "quote", "contacts"],
    notePrompt:
      "Use this note to capture lighting, ceiling-fan, power-point, conduit, and networking advice for one bundled electrical visit."
  }
] as const;

export type GuidedWorkflowTemplateId =
  | "house_project_review"
  | "house_contact_follow_up"
  | "house_approval_decision_review";

export type GuidedWorkflowField =
  | {
      id: "projectId";
      label: string;
      kind: "project";
      required: true;
      defaultValue: string;
      helpText: string;
    }
  | {
      id: "contactId";
      label: string;
      kind: "contact";
      required: true;
      defaultValue: string;
      helpText: string;
      options: Array<{ id: string; label: string }>;
    }
  | {
      id: "reviewFocus";
      label: string;
      kind: "select";
      required: false;
      defaultValue: "all";
      helpText: string;
      options: Array<{ id: "balcony_approvals" | "painting" | "electrical" | "bathroom" | "budget_risk" | "all"; label: string }>;
    }
  | {
      id: "followUpType";
      label: string;
      kind: "select";
      required: true;
      defaultValue: "approval";
      helpText: string;
      options: Array<{ id: "call" | "email" | "quote" | "approval" | "availability"; label: string }>;
    }
  | {
      id: "dueDate";
      label: string;
      kind: "date";
      required: false;
      defaultValue: "";
      helpText: string;
    }
  | {
      id: "approvalArea";
      label: string;
      kind: "select";
      required: true;
      defaultValue: "all";
      helpText: string;
      options: Array<{ id: "balcony" | "bathroom" | "electrical" | "all"; label: string }>;
    };

export type GuidedWorkflowTemplate = {
  id: GuidedWorkflowTemplateId;
  name: string;
  purpose: string;
  safeSummary: string;
  fields: GuidedWorkflowField[];
  creates: readonly string[];
  doesNotDo: readonly string[];
};

export const GUIDED_WORKFLOW_TEMPLATES: readonly GuidedWorkflowTemplate[] = [
  {
    id: "house_project_review",
    name: "Project review",
    purpose: "Review the renovation project without losing context.",
    safeSummary:
      "Creates one review note and four review tasks in the selected project after you confirm the preview.",
    fields: [
      {
        id: "projectId",
        label: "Project",
        kind: "project",
        required: true,
        defaultValue: HOUSE_RENOVATION_PROJECT_ID,
        helpText: "Choose the project that should receive the review note and tasks."
      },
      {
        id: "reviewFocus",
        label: "Review focus",
        kind: "select",
        required: false,
        defaultValue: "all",
        helpText: "Choose the part of the project to review, or keep All for the full beta review set.",
        options: [
          { id: "all", label: "All" },
          { id: "balcony_approvals", label: "Balcony approvals" },
          { id: "painting", label: "Painting" },
          { id: "electrical", label: "Electrical" },
          { id: "bathroom", label: "Bathroom" },
          { id: "budget_risk", label: "Budget risk" }
        ]
      }
    ],
    creates: [
      `Workflow review: ${HOUSE_RENOVATION_PROJECT_NAME}`,
      "Review open balcony approvals @review @balcony",
      "Review active budget-risk items @review @budget-risk",
      "Confirm deferred bathroom decisions @review @bathroom",
      "Check unfinished contact follow-ups @review @contacts"
    ],
    doesNotDo: ["No data changes during preview.", "No background automation.", "No scripts or cloud actions."]
  },
  {
    id: "house_contact_follow_up",
    name: "Contact follow-up",
    purpose: "Create a follow-up task and call note for a renovation contact.",
    safeSummary:
      "Creates one task and one note in the renovation project, then links both new items to the selected contact.",
    fields: [
      {
        id: "projectId",
        label: "Project",
        kind: "project",
        required: true,
        defaultValue: HOUSE_RENOVATION_PROJECT_ID,
        helpText: "Choose the project where the follow-up work should appear."
      },
      {
        id: "contactId",
        label: "Contact",
        kind: "contact",
        required: true,
        defaultValue: HOUSE_RENOVATION_CONTACTS[0].id,
        helpText: "Choose the contact this follow-up is for.",
        options: HOUSE_RENOVATION_CONTACTS.map((contact) => ({
          id: contact.id,
          label: contact.name
        }))
      },
      {
        id: "followUpType",
        label: "Follow-up type",
        kind: "select",
        required: true,
        defaultValue: "approval",
        helpText: "Choose the kind of follow-up task to prepare.",
        options: [
          { id: "call", label: "Call" },
          { id: "email", label: "Email" },
          { id: "quote", label: "Quote" },
          { id: "approval", label: "Approval" },
          { id: "availability", label: "Availability" }
        ]
      },
      {
        id: "dueDate",
        label: "Optional due date",
        kind: "date",
        required: false,
        defaultValue: "",
        helpText: "Optional local task due date. Leave blank if this follow-up is not dated yet."
      }
    ],
    creates: [
      "One contact-specific follow-up task.",
      "One contact-specific note.",
      "Local relationships from the new items to the selected contact."
    ],
    doesNotDo: ["No automatic reminders.", "No background follow-up.", "No external messages are sent."]
  },
  {
    id: "house_approval_decision_review",
    name: "Approval and decision review",
    purpose: "Turn unresolved approvals and deferred decisions into a reviewable set of work.",
    safeSummary:
      "Creates one approval review note and three approval/deferred-decision tasks in the selected project.",
    fields: [
      {
        id: "projectId",
        label: "Project",
        kind: "project",
        required: true,
        defaultValue: HOUSE_RENOVATION_PROJECT_ID,
        helpText: "Choose the project that should receive approval review work."
      },
      {
        id: "approvalArea",
        label: "Approval area",
        kind: "select",
        required: true,
        defaultValue: "all",
        helpText: "Choose the approval/decision area to review.",
        options: [
          { id: "all", label: "All" },
          { id: "balcony", label: "Balcony" },
          { id: "bathroom", label: "Bathroom" },
          { id: "electrical", label: "Electrical" }
        ]
      }
    ],
    creates: [
      `Approval review: ${HOUSE_RENOVATION_PROJECT_NAME}`,
      "Confirm balcony BBQ/screen by-law path @approval @balcony",
      "Confirm bathroom approval path with strata @approval @bathroom",
      "Record deferred decisions after approval review @decision"
    ],
    doesNotDo: ["No approval is submitted.", "No vendor is contacted.", "No decisions are changed automatically."]
  }
] as const;

export function listGuidedWorkflowTemplates(): GuidedWorkflowTemplate[] {
  return GUIDED_WORKFLOW_TEMPLATES.map((template) => ({
    ...template,
    fields: template.fields.map((field) => ({ ...field }))
  }));
}

export function getGuidedWorkflowTemplate(
  templateId: string
): GuidedWorkflowTemplate | null {
  return listGuidedWorkflowTemplates().find((template) => template.id === templateId) ?? null;
}

export function getHouseRenovationContact(contactId: string) {
  return HOUSE_RENOVATION_CONTACTS.find((contact) => contact.id === contactId) ?? null;
}
