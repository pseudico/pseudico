export type NoteAutosaveValues = {
  title: string;
  content: string;
};

export type NoteDraftIdentity = {
  workspaceId: string;
  containerId: string;
  itemId?: string | null;
  containerTabId?: string | null;
};

export type NoteConflictCheckInput = {
  expectedNoteUpdatedAt?: string;
  currentNoteUpdatedAt: string;
};

export class NoteAutosaveService {
  createDraftKey(identity: NoteDraftIdentity): string {
    const scope = identity.itemId?.trim() || "new";
    const tab = identity.containerTabId?.trim() || "feed";

    return [
      "local-work-os",
      "note-draft",
      identity.workspaceId.trim(),
      identity.containerId.trim(),
      tab,
      scope
    ].join(":");
  }

  isDirty(
    current: NoteAutosaveValues,
    baseline: NoteAutosaveValues
  ): boolean {
    return normalizeTitle(current.title) !== normalizeTitle(baseline.title) ||
      current.content !== baseline.content;
  }

  shouldAutosave(input: {
    current: NoteAutosaveValues;
    lastSaved: NoteAutosaveValues;
    saving?: boolean;
  }): boolean {
    return (
      input.saving !== true &&
      normalizeTitle(input.current.title).length > 0 &&
      this.isDirty(input.current, input.lastSaved)
    );
  }

  checkConflict(input: NoteConflictCheckInput): boolean {
    return (
      input.expectedNoteUpdatedAt !== undefined &&
      input.expectedNoteUpdatedAt !== input.currentNoteUpdatedAt
    );
  }
}

function normalizeTitle(value: string): string {
  return value.trim();
}
