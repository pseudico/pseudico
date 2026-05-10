import { useEffect, useState } from "react";
import type {
  ContainerPreferencesSummary,
  ContainerTabSummary
} from "../../preload/api";

export type ContainerPreferencesDraft = Pick<
  ContainerPreferencesSummary,
  | "defaultView"
  | "defaultTabId"
  | "showCompleted"
  | "grouping"
  | "defaultQuickAddType"
  | "summaryFirst"
  | "compactMode"
>;

export type ContainerPreferencesPanelProps = {
  open: boolean;
  preferences: ContainerPreferencesSummary | null;
  tabs: readonly ContainerTabSummary[];
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (draft: ContainerPreferencesDraft) => void | Promise<void>;
};

const fallbackPreferences: ContainerPreferencesDraft = {
  defaultView: "feed",
  defaultTabId: null,
  showCompleted: true,
  grouping: "none",
  defaultQuickAddType: "task",
  summaryFirst: false,
  compactMode: false
};

export function ContainerPreferencesPanel({
  open,
  preferences,
  tabs,
  saving = false,
  error = null,
  onClose,
  onSave
}: ContainerPreferencesPanelProps): React.JSX.Element | null {
  const [draft, setDraft] = useState<ContainerPreferencesDraft>(
    preferencesToDraft(preferences)
  );

  useEffect(() => {
    if (open) {
      setDraft(preferencesToDraft(preferences));
    }
  }, [open, preferences]);

  if (!open) {
    return null;
  }

  return (
    <section
      aria-label="Container display settings"
      className="container-preferences-dialog"
      role="dialog"
    >
      <div className="project-dialog-header">
        <div>
          <h3>Display settings</h3>
          <p className="muted-text">
            These local preferences are saved only for this project or contact.
          </p>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={saving}
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <form
        className="container-preferences-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(draft);
        }}
      >
        <label>
          Default view
          <select
            value={draft.defaultView}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                defaultView: event.target.value as ContainerPreferencesDraft["defaultView"]
              }))
            }
          >
            <option value="feed">Content feed</option>
            <option value="tab">Default tab</option>
            <option value="summary">Summary first</option>
          </select>
        </label>

        <label>
          Default tab
          <select
            value={draft.defaultTabId ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                defaultTabId: event.target.value.length === 0 ? null : event.target.value
              }))
            }
          >
            <option value="">First available tab</option>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Grouping
          <select
            value={draft.grouping}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                grouping: event.target.value as ContainerPreferencesDraft["grouping"]
              }))
            }
          >
            <option value="none">Manual order</option>
            <option value="type">Content type</option>
            <option value="tab">Tab</option>
            <option value="status">Status</option>
          </select>
        </label>

        <label>
          Default quick-add type
          <select
            value={draft.defaultQuickAddType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                defaultQuickAddType:
                  event.target.value as ContainerPreferencesDraft["defaultQuickAddType"]
              }))
            }
          >
            <option value="task">Task</option>
            <option value="note">Note</option>
            <option value="list">List</option>
            <option value="link">Link</option>
            <option value="file">File</option>
          </select>
        </label>

        <label className="checkbox-row">
          <input
            checked={draft.showCompleted}
            type="checkbox"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                showCompleted: event.target.checked
              }))
            }
          />
          Show completed tasks and list rows
        </label>

        <label className="checkbox-row">
          <input
            checked={draft.summaryFirst}
            type="checkbox"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                summaryFirst: event.target.checked
              }))
            }
          />
          Show tab summary before related panels
        </label>

        <label className="checkbox-row">
          <input
            checked={draft.compactMode}
            type="checkbox"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                compactMode: event.target.checked
              }))
            }
          />
          Compact mode
        </label>

        {error === null ? null : (
          <p className="form-message form-message-error">{error}</p>
        )}

        <div className="button-row">
          <button className="primary-button compact-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}

function preferencesToDraft(
  preferences: ContainerPreferencesSummary | null
): ContainerPreferencesDraft {
  if (preferences === null) {
    return fallbackPreferences;
  }

  return {
    defaultView: preferences.defaultView,
    defaultTabId: preferences.defaultTabId,
    showCompleted: preferences.showCompleted,
    grouping: preferences.grouping,
    defaultQuickAddType: preferences.defaultQuickAddType,
    summaryFirst: preferences.summaryFirst,
    compactMode: preferences.compactMode
  };
}
