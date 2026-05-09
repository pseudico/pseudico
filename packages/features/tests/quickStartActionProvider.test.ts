import { describe, expect, it } from "vitest";
import {
  getQuickStartActions,
  resolveQuickStartTargets,
  type QuickStartTarget
} from "../src";

const inbox: QuickStartTarget = {
  id: "container_inbox",
  name: "Inbox",
  type: "inbox",
  status: "active",
  deletedAt: null
};

const project: QuickStartTarget = {
  id: "container_project_1",
  name: "Launch Plan",
  type: "project",
  status: "active",
  deletedAt: null
};

const contact: QuickStartTarget = {
  id: "container_contact_1",
  name: "Ada Lovelace",
  type: "contact",
  status: "active",
  deletedAt: null
};

describe("Quick Start target resolution", () => {
  it("defaults to Inbox when there is no current container", () => {
    const resolution = resolveQuickStartTargets({
      inbox,
      projects: [project],
      contacts: [contact]
    });

    expect(resolution.defaultContainerId).toBe(inbox.id);
    expect(resolution.defaultContainerTabId).toBeNull();
    expect(resolution.targets.map((target) => target.name)).toEqual([
      "Inbox",
      "Launch Plan",
      "Ada Lovelace"
    ]);
  });

  it("defaults to the current project/contact tab when active", () => {
    const resolution = resolveQuickStartTargets({
      context: {
        containerId: contact.id,
        containerType: "contact",
        containerTabId: "tab_contact_main"
      },
      inbox,
      projects: [project],
      contacts: [contact]
    });

    expect(resolution.defaultContainerId).toBe(contact.id);
    expect(resolution.defaultContainerTabId).toBe("tab_contact_main");
  });

  it("falls back to Inbox when the contextual target is archived or deleted", () => {
    const resolution = resolveQuickStartTargets({
      context: { containerId: project.id, containerType: "project" },
      inbox,
      projects: [{ ...project, status: "archived" }],
      contacts: [{ ...contact, deletedAt: "2026-05-01T00:00:00.000Z" }]
    });

    expect(resolution.defaultContainerId).toBe(inbox.id);
    expect(resolution.targets).toEqual([inbox]);
  });
});

describe("Quick Start action providers", () => {
  it("exposes capture and container actions with disabled reasons", () => {
    const actions = getQuickStartActions({
      workspaceOpen: true,
      targetAvailable: true
    });

    expect(actions.map((action) => action.id)).toEqual([
      "task",
      "note",
      "list",
      "file",
      "link",
      "project",
      "contact"
    ]);
    expect(actions.every((action) => action.disabledReason === null)).toBe(true);

    const disabled = getQuickStartActions({
      workspaceOpen: false,
      targetAvailable: false
    });
    expect(disabled.map((action) => action.disabledReason)).toEqual(
      Array(7).fill("Open a local workspace first.")
    );
  });
});
