import { describe, expect, it } from "vitest";
import { NoteAutosaveService } from "../src";

describe("NoteAutosaveService", () => {
  it("creates stable local draft keys scoped to workspace, container, tab, and item", () => {
    const service = new NoteAutosaveService();

    expect(
      service.createDraftKey({
        workspaceId: "workspace_1",
        containerId: "project_1",
        containerTabId: "tab_1",
        itemId: "item_1"
      })
    ).toBe("local-work-os:note-draft:workspace_1:project_1:tab_1:item_1");
  });

  it("detects dirty autosave candidates without saving empty titles", () => {
    const service = new NoteAutosaveService();

    expect(
      service.shouldAutosave({
        current: { title: "Note", content: "Draft" },
        lastSaved: { title: "Note", content: "Saved" }
      })
    ).toBe(true);
    expect(
      service.shouldAutosave({
        current: { title: " ", content: "Draft" },
        lastSaved: { title: "", content: "" }
      })
    ).toBe(false);
  });

  it("detects expected-version conflicts", () => {
    const service = new NoteAutosaveService();

    expect(
      service.checkConflict({
        expectedNoteUpdatedAt: "2026-05-01T00:00:00.000Z",
        currentNoteUpdatedAt: "2026-05-01T00:00:01.000Z"
      })
    ).toBe(true);
  });
});
