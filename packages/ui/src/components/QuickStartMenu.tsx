import { FilePlus, FolderPlus, Link2, ListChecks, StickyNote, UserPlus, CheckSquare } from "lucide-react";

export type QuickStartMenuAction = {
  id: string;
  title: string;
  description: string;
  group: string;
  disabledReason?: string | null;
};

export type QuickStartMenuProps = {
  actions: readonly QuickStartMenuAction[];
  selectedActionId: string;
  onSelectAction: (actionId: string) => void;
};

export function QuickStartMenu({
  actions,
  selectedActionId,
  onSelectAction
}: QuickStartMenuProps): React.JSX.Element {
  const groups = groupActions(actions);

  return (
    <div className="quick-start-menu" aria-label="Quick start actions">
      {groups.map((group) => (
        <section className="quick-start-menu-group" key={group.name}>
          <p className="quick-start-menu-group-label">{group.name}</p>
          <div className="quick-start-action-grid">
            {group.actions.map((action) => {
              const selected = action.id === selectedActionId;
              const disabled = action.disabledReason != null;

              return (
                <button
                  aria-pressed={selected}
                  className={`quick-start-action-card${selected ? " selected" : ""}`}
                  disabled={disabled}
                  key={action.id}
                  title={action.disabledReason ?? action.description}
                  type="button"
                  onClick={() => onSelectAction(action.id)}
                >
                  {renderActionIcon(action.id)}
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.disabledReason ?? action.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupActions(actions: readonly QuickStartMenuAction[]): Array<{
  name: string;
  actions: QuickStartMenuAction[];
}> {
  const names = Array.from(new Set(actions.map((action) => action.group)));

  return names.map((name) => ({
    name,
    actions: actions.filter((action) => action.group === name)
  }));
}

function renderActionIcon(actionId: string): React.JSX.Element {
  switch (actionId) {
    case "note":
      return <StickyNote size={18} aria-hidden="true" />;
    case "list":
      return <ListChecks size={18} aria-hidden="true" />;
    case "file":
      return <FilePlus size={18} aria-hidden="true" />;
    case "link":
      return <Link2 size={18} aria-hidden="true" />;
    case "project":
      return <FolderPlus size={18} aria-hidden="true" />;
    case "contact":
      return <UserPlus size={18} aria-hidden="true" />;
    case "task":
    default:
      return <CheckSquare size={18} aria-hidden="true" />;
  }
}
