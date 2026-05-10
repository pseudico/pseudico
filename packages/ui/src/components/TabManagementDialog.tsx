export type TabManagementTabViewModel = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  hiddenAt: string | null;
  archivedAt: string | null;
};

export type TabTemplateOption = {
  id: string;
  name: string;
  description: string | null;
};

export type TabManagementDialogProps = {
  busy?: boolean;
  tabs: readonly TabManagementTabViewModel[];
  templates: readonly TabTemplateOption[];
  onArchiveTab: (tabId: string) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onHideTab: (tabId: string) => void;
  onShowTab: (tabId: string) => void;
};

export function TabManagementDialog({
  busy = false,
  tabs,
  templates,
  onArchiveTab,
  onCreateFromTemplate,
  onDuplicateTab,
  onHideTab,
  onShowTab
}: TabManagementDialogProps): React.JSX.Element {
  const activeTabs = tabs.filter((tab) => tab.archivedAt === null);
  const visibleCount = activeTabs.filter((tab) => tab.hiddenAt === null).length;

  return (
    <section className="tab-management-dialog" aria-label="Manage content tabs">
      <div className="panel-heading">
        <h3>Manage tabs</h3>
        <p className="muted-text">Create tabs from templates, hide local tabs, duplicate, or archive them.</p>
      </div>

      <div className="tab-template-picker" aria-label="Tab templates">
        {templates.length === 0 ? (
          <p className="muted-text">No tab templates are available.</p>
        ) : (
          templates.map((template) => (
            <button
              className="secondary-button compact-button"
              disabled={busy}
              key={template.id}
              type="button"
              onClick={() => onCreateFromTemplate(template.id)}
            >
              Add {template.name}
            </button>
          ))
        )}
      </div>

      <ul className="tab-management-list">
        {tabs.map((tab) => {
          const isHidden = tab.hiddenAt !== null;
          const isArchived = tab.archivedAt !== null;
          const cannotHide = busy || tab.isDefault || isArchived || (!isHidden && visibleCount <= 1);

          return (
            <li className="tab-management-row" key={tab.id}>
              <span>
                <strong>{tab.name}</strong>
                {tab.isDefault ? <small>Main</small> : null}
                {isHidden ? <small>Hidden locally</small> : null}
                {isArchived ? <small>Archived</small> : null}
                {tab.description === null ? null : <em>{tab.description}</em>}
              </span>
              <div className="tab-management-actions">
                {isHidden ? (
                  <button
                    className="secondary-button compact-button"
                    disabled={busy || isArchived}
                    type="button"
                    onClick={() => onShowTab(tab.id)}
                  >
                    Show
                  </button>
                ) : (
                  <button
                    className="secondary-button compact-button"
                    disabled={cannotHide}
                    type="button"
                    onClick={() => onHideTab(tab.id)}
                  >
                    Hide
                  </button>
                )}
                <button
                  className="secondary-button compact-button"
                  disabled={busy || isArchived}
                  type="button"
                  onClick={() => onDuplicateTab(tab.id)}
                >
                  Duplicate
                </button>
                <button
                  className="secondary-button compact-button danger-button"
                  disabled={busy || tab.isDefault || isArchived}
                  type="button"
                  onClick={() => onArchiveTab(tab.id)}
                >
                  Archive
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
