import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ContactFieldsEditor,
  ContactTimeline,
  FollowUpSummaryCard,
  RelatedContactsPanel,
  RelatedProjectsPanel,
  validateContactFormValues
} from "../src";

describe("ContactForm validation", () => {
  it("requires a non-empty contact name", () => {
    expect(validateContactFormValues({ name: "   " })).toEqual({
      name: "Contact name is required."
    });
  });

  it("accepts a trimmed contact name", () => {
    expect(validateContactFormValues({ name: "  Alex Chen  " })).toEqual({});
  });
});

describe("ContactFieldsEditor", () => {
  it("renders existing editable fields and add-field controls", () => {
    const html = renderToStaticMarkup(
      <ContactFieldsEditor
        fields={[
          {
            id: "contact_field_1",
            label: "Email",
            value: "alex@example.com",
            type: "email",
            sortOrder: 10
          }
        ]}
        onAddField={() => undefined}
        onUpdateField={() => undefined}
      />
    );

    expect(html).toContain("Profile fields");
    expect(html).toContain("Email");
    expect(html).toContain("alex@example.com");
    expect(html).toContain("Save");
    expect(html).toContain("Add");
  });
});

describe("Relationship panels", () => {
  it("renders related contacts with follow-up and activity summaries", () => {
    const html = renderToStaticMarkup(
      <RelatedContactsPanel
        availableContacts={[{ id: "contact_2", name: "Morgan Lee" }]}
        relatedContacts={[
          {
            relationshipId: "relationship_1",
            contactId: "contact_1",
            name: "Alex Chen",
            description: "Client stakeholder",
            status: "active",
            openTaskCount: 2,
            recentActivityCount: 1,
            recentActivity: [
              {
                id: "activity_1",
                description: "Updated Alex Chen.",
                createdAt: "2026-05-01T00:00:00.000Z"
              }
            ]
          }
        ]}
        selectedContactId="contact_2"
        onLinkContact={() => undefined}
        onSelectedContactChange={() => undefined}
        onUnlinkContact={() => undefined}
      />
    );

    expect(html).toContain("Related contacts");
    expect(html).toContain("Alex Chen");
    expect(html).toContain("2 open follow-ups");
    expect(html).toContain("Updated Alex Chen.");
  });

  it("renders related projects with link controls", () => {
    const html = renderToStaticMarkup(
      <RelatedProjectsPanel
        availableProjects={[{ id: "project_2", name: "Operations" }]}
        relatedProjects={[
          {
            relationshipId: "relationship_2",
            projectId: "project_1",
            name: "Launch Plan",
            description: null,
            status: "active",
            openTaskCount: 1,
            recentActivityCount: 0,
            recentActivity: []
          }
        ]}
        selectedProjectId="project_2"
        onLinkProject={() => undefined}
        onSelectedProjectChange={() => undefined}
        onUnlinkProject={() => undefined}
      />
    );

    expect(html).toContain("Related projects");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("1 open follow-up");
    expect(html).toContain("Link project");
  });
});

describe("Contact timeline UI", () => {
  it("renders empty timeline and follow-up summary states", () => {
    const html = renderToStaticMarkup(
      <>
        <FollowUpSummaryCard
          summary={{
            openFollowUpCount: 0,
            overdueTaskCount: 0,
            nextDueTask: null,
            openFollowUps: []
          }}
        />
        <ContactTimeline entries={[]} filter="activity" />
      </>
    );

    expect(html).toContain("Follow-up summary");
    expect(html).toContain("No open follow-ups for this contact.");
    expect(html).toContain("Interaction timeline");
    expect(html).toContain("No timeline entries match this filter yet.");
    expect(html).toContain("aria-pressed=\"true\"");
  });

  it("renders filtered timeline entries with overdue due labels", () => {
    const html = renderToStaticMarkup(
      <ContactTimeline
        filter="follow_up"
        entries={[
          {
            id: "item:task_1",
            kind: "task",
            sourceType: "item",
            title: "Follow up with Alex",
            description: "Confirm contract timing.",
            occurredAt: "2026-05-09T11:00:00.000Z",
            status: "open",
            dueAt: "2026-05-08T00:00:00.000Z",
            overdue: true,
            actorLabel: null,
            relatedTargetName: null
          }
        ]}
      />
    );

    expect(html).toContain("Follow-ups");
    expect(html).toContain("Follow up with Alex");
    expect(html).toContain("Confirm contract timing.");
    expect(html).toContain("Due 2026-05-08 - overdue");
  });
});
