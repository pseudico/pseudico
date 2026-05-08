import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ContainerTabSummary } from "../../preload/api";

type ContainerTabsPanelProps = {
  activeTabId: string | null;
  busy?: boolean;
  error?: string | null;
  tabs: readonly ContainerTabSummary[];
  onCreateTab: (name: string) => Promise<boolean> | boolean;
  onDeleteTab: (tabId: string) => Promise<void> | void;
  onRenameTab: (tabId: string, name: string) => Promise<boolean> | boolean;
  onReorderTabs: (tabIds: string[]) => Promise<void> | void;
  onSelectTab: (tabId: string) => void;
};

export function ContainerTabsPanel({
  activeTabId,
  busy = false,
  error = null,
  tabs,
  onCreateTab,
  onDeleteTab,
  onRenameTab,
  onReorderTabs,
  onSelectTab
}: ContainerTabsPanelProps): React.JSX.Element {
  const [newTabName, setNewTabName] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function submitNewTab(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const name = newTabName.trim();

    if (name.length === 0) {
      return;
    }

    if (await onCreateTab(name)) {
      setNewTabName("");
    }
  }

  async function submitRename(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (editingTabId === null) {
      return;
    }

    const name = editingName.trim();

    if (name.length === 0) {
      return;
    }

    if (await onRenameTab(editingTabId, name)) {
      setEditingTabId(null);
      setEditingName("");
    }
  }

  function moveTab(tabId: string, direction: -1 | 1): void {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tabs.length) {
      return;
    }

    const nextIds = tabs.map((tab) => tab.id);
    const [movedId] = nextIds.splice(currentIndex, 1);

    if (movedId === undefined) {
      return;
    }

    nextIds.splice(targetIndex, 0, movedId);
    void onReorderTabs(nextIds);
  }

  return (
    <section className="container-tabs-panel" aria-label="Content tabs">
      <div className="panel-heading-actions">
        <div className="panel-heading">
          <h3>Tabs</h3>
        </div>
        <form className="container-tab-create-form" onSubmit={(event) => void submitNewTab(event)}>
          <label className="sr-only" htmlFor="new-container-tab-name">
            New tab name
          </label>
          <input
            id="new-container-tab-name"
            placeholder="New tab name"
            value={newTabName}
            disabled={busy}
            onChange={(event) => setNewTabName(event.target.value)}
          />
          <button className="secondary-button compact-button" disabled={busy || newTabName.trim().length === 0} type="submit">
            <Plus size={15} aria-hidden="true" />
            Add tab
          </button>
        </form>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <div className="container-tabs-list" role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => {
          const selected = activeTabId === tab.id;
          const editing = editingTabId === tab.id;

          return (
            <div className="container-tab-row" key={tab.id}>
              {editing ? (
                <form className="container-tab-rename-form" onSubmit={(event) => void submitRename(event)}>
                  <label className="sr-only" htmlFor={`container-tab-name-${tab.id}`}>
                    Rename tab
                  </label>
                  <input
                    id={`container-tab-name-${tab.id}`}
                    value={editingName}
                    disabled={busy}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <button className="secondary-button compact-button" disabled={busy || editingName.trim().length === 0} type="submit">
                    Save
                  </button>
                  <button
                    className="secondary-button compact-button"
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      setEditingTabId(null);
                      setEditingName("");
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className={selected ? "container-tab-pill is-active" : "container-tab-pill"}
                    role="tab"
                    aria-selected={selected}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                  >
                    {tab.name}
                    {tab.isDefault ? <span>Main</span> : null}
                  </button>
                  <div className="container-tab-actions">
                    <button
                      aria-label={`Move ${tab.name} left`}
                      className="icon-button"
                      disabled={busy || index === 0}
                      type="button"
                      onClick={() => moveTab(tab.id, -1)}
                    >
                      <ChevronLeft size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Move ${tab.name} right`}
                      className="icon-button"
                      disabled={busy || index === tabs.length - 1}
                      type="button"
                      onClick={() => moveTab(tab.id, 1)}
                    >
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Rename ${tab.name}`}
                      className="icon-button"
                      disabled={busy}
                      type="button"
                      onClick={() => {
                        setEditingTabId(tab.id);
                        setEditingName(tab.name);
                      }}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Delete ${tab.name}`}
                      className="icon-button danger-button"
                      disabled={busy || tab.isDefault || tabs.length <= 1}
                      type="button"
                      onClick={() => void onDeleteTab(tab.id)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
