import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NoteEditor,
  isNoteEditorDirty,
  parseNoteDraft,
  serializeNoteDraft,
  shouldAutosaveNoteEditor,
  shouldRecoverNoteDraft
} from "../src";

describe("NoteEditor autosave helpers", () => {
  it("detects dirty editor values and autosave candidates", () => {
    expect(
      isNoteEditorDirty(
        { title: " Draft ", content: "Changed" },
        { title: "Draft", content: "Saved" }
      )
    ).toBe(true);
    expect(
      shouldAutosaveNoteEditor(
        { title: "Draft", content: "Changed" },
        { title: "Draft", content: "Saved" }
      )
    ).toBe(true);
    expect(
      shouldAutosaveNoteEditor(
        { title: " ", content: "Changed" },
        { title: "", content: "" }
      )
    ).toBe(false);
  });

  it("serializes local drafts for recovery prompts", () => {
    const draft = {
      title: "Recovered",
      content: "Unsaved local text",
      baseVersion: "2026-05-01T00:00:00.000Z",
      savedAt: "2026-05-01T00:00:01.000Z"
    };

    expect(parseNoteDraft(serializeNoteDraft(draft))).toEqual(draft);
    expect(shouldRecoverNoteDraft(draft, { title: "Recovered", content: "" })).toBe(true);
    expect(parseNoteDraft("{not-json")).toBeNull();
  });

  it("renders autosave status affordance", () => {
    const html = renderToStaticMarkup(
      <NoteEditor
        contextLabel="Project"
        draftKey="local-work-os:note-draft:test"
        initialValues={{ title: "Note", content: "Body" }}
        autosave={{
          expectedVersion: "2026-05-01T00:00:00.000Z",
          onSave: () => undefined
        }}
        onSubmit={() => undefined}
      />
    );

    expect(html).toContain("Autosave ready.");
    expect(html).toContain("Save note");
  });
});
