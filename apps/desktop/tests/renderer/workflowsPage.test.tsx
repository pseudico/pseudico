import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { WorkflowsPage } from "../../src/renderer/pages/WorkflowsPage";
import type {
  GuidedWorkflowPreviewSummary,
  GuidedWorkflowRunHistoryEntrySummary,
  GuidedWorkflowTemplateSummary
} from "../../src/preload/api";

describe("WorkflowsPage", () => {
  it("renders the nontechnical guided workflow loop with preview, confirmation, result, and history states", () => {
    const html = renderToString(
      <MemoryRouter>
        <WorkflowsPage
          initialWorkspaceId="workspace_mpg4xgw1_1twlscuxhd8"
          initialTemplates={templates}
          initialPreview={preview}
          initialRuns={runs}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Guided workflows");
    expect(html).toContain("Safe beta rules");
    expect(html).toContain("Predefined templates only.");
    expect(html).toContain("Preview before anything changes");
    expect(html).toContain("I understand this will create or link the items shown above.");
    expect(html).toContain("Project review");
    expect(html).toContain("Contact follow-up");
    expect(html).toContain("Workflow review: House Renovation and Fit-Out 2026");
    expect(html).toContain("Review open balcony approvals @review @balcony");
    expect(html).toContain("Run history");
    expect(html).toContain("changes");
    expect(html).not.toContain("webhook");
    expect(html).not.toContain("shell command");
  });
});

const templates: GuidedWorkflowTemplateSummary[] = [
  {
    id: "house_project_review",
    name: "Project review",
    purpose: "Review the renovation project without losing context.",
    safeSummary: "Creates one review note and four review tasks.",
    fields: [
      {
        id: "projectId",
        label: "Project",
        kind: "project",
        required: true,
        defaultValue: "container_mpg4xp68_0703fc0zpbr",
        helpText: "Choose the project."
      }
    ],
    creates: ["Workflow review"],
    doesNotDo: ["No scripts or cloud actions."]
  },
  {
    id: "house_contact_follow_up",
    name: "Contact follow-up",
    purpose: "Create follow-up work for a renovation contact.",
    safeSummary: "Creates one task and one note.",
    fields: [
      {
        id: "projectId",
        label: "Project",
        kind: "project",
        required: true,
        defaultValue: "container_mpg4xp68_0703fc0zpbr",
        helpText: "Choose the project."
      },
      {
        id: "contactId",
        label: "Contact",
        kind: "contact",
        required: true,
        defaultValue: "container_mpg4y338_1f6bjrvu1at",
        helpText: "Choose the contact.",
        options: [
          {
            id: "container_mpg4y338_1f6bjrvu1at",
            label: "Strata manager / owners corporation"
          }
        ]
      }
    ],
    creates: ["Follow-up task", "Follow-up note"],
    doesNotDo: ["No external messages are sent."]
  }
];

const preview: GuidedWorkflowPreviewSummary = {
  workspaceId: "workspace_mpg4xgw1_1twlscuxhd8",
  template: templates[0]!,
  projectId: "container_mpg4xp68_0703fc0zpbr",
  projectName: "House Renovation and Fit-Out 2026",
  contactId: null,
  contactName: null,
  canRun: true,
  issues: [],
  confirmationLabel: "Create 5 items",
  plannedChanges: [
    {
      id: "review-note",
      operation: "create",
      objectType: "note",
      title: "Workflow review: House Renovation and Fit-Out 2026",
      description: "Creates a local Markdown note in the selected project.",
      targetProjectId: "container_mpg4xp68_0703fc0zpbr",
      targetProjectName: "House Renovation and Fit-Out 2026",
      targetContactId: null,
      targetContactName: null,
      tags: ["review", "renovation"],
      categoryName: null
    },
    {
      id: "review-balcony-approvals",
      operation: "create",
      objectType: "task",
      title: "Review open balcony approvals @review @balcony",
      description: "Creates a local task in the selected project.",
      targetProjectId: "container_mpg4xp68_0703fc0zpbr",
      targetProjectName: "House Renovation and Fit-Out 2026",
      targetContactId: null,
      targetContactName: null,
      tags: ["review", "balcony"],
      categoryName: null
    }
  ]
};

const runs: GuidedWorkflowRunHistoryEntrySummary[] = [
  {
    runId: "workflow_run_1",
    templateId: "house_project_review",
    templateName: "Project review",
    status: "completed",
    projectName: "House Renovation and Fit-Out 2026",
    contactName: null,
    plannedChangeCount: 5,
    completedChangeCount: 5,
    errorMessage: null,
    createdAt: "2026-05-24T01:02:03.000Z",
    completedAt: "2026-05-24T01:02:03.000Z"
  }
];
