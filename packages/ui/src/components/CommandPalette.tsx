import type { ActionShortcut } from "@local-work-os/core";

export type CommandPaletteAction = {
  id: string;
  title: string;
  group: string;
  subtitle?: string;
  shortcut?: ActionShortcut;
  disabledReason: string | null;
};

export type CommandPaletteProps = {
  actions: readonly CommandPaletteAction[];
  activeActionId?: string | null;
  query: string;
  open: boolean;
  placeholder?: string;
  onClose: () => void;
  onExecute: (actionId: string) => void;
  onHighlight: (actionId: string) => void;
  onQueryChange: (query: string) => void;
};

export type CommandPaletteKey =
  | "close"
  | "execute"
  | "next"
  | "previous"
  | "none";

export function CommandPalette({
  actions,
  activeActionId,
  onClose,
  onExecute,
  onHighlight,
  onQueryChange,
  open,
  placeholder = "Search commands",
  query
}: CommandPaletteProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  const activeId = activeActionId ?? actions[0]?.id ?? null;

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>
  ): void {
    const command = getCommandPaletteKey(event.key);

    if (command === "none") {
      return;
    }

    event.preventDefault();

    if (command === "close") {
      onClose();
      return;
    }

    if (command === "execute") {
      if (activeId !== null) {
        onExecute(activeId);
      }

      return;
    }

    const nextIndex = getNextCommandPaletteIndex({
      actionCount: actions.length,
      currentIndex: actions.findIndex((action) => action.id === activeId),
      direction: command === "next" ? "next" : "previous"
    });
    const nextAction = nextIndex === null ? null : actions[nextIndex];

    if (nextAction !== null && nextAction !== undefined) {
      onHighlight(nextAction.id);
    }
  }

  return (
    <div
      aria-modal="true"
      className="command-palette-backdrop"
      role="dialog"
      onKeyDown={handleKeyDown}
    >
      <section className="command-palette-dialog">
        <div className="command-palette-header">
          <div>
            <p className="top-eyebrow">Command palette</p>
            <h2>Run a command</h2>
          </div>
          <button
            aria-label="Close command palette"
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className="command-palette-search">
          <span className="sr-only">Command search</span>
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={placeholder}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>

        {actions.length === 0 ? (
          <p className="command-palette-empty">No matching commands.</p>
        ) : (
          <ul
            aria-activedescendant={
              activeId === null ? undefined : `command-palette-${activeId}`
            }
            aria-label="Command results"
            className="command-palette-list"
            role="listbox"
          >
            {actions.map((action) => {
              const active = action.id === activeId;
              const disabled = action.disabledReason !== null;

              return (
                <li
                  aria-disabled={disabled}
                  aria-selected={active}
                  className={
                    active
                      ? "command-palette-item command-palette-item-active"
                      : "command-palette-item"
                  }
                  id={`command-palette-${action.id}`}
                  key={action.id}
                  role="option"
                >
                  <button
                    disabled={disabled}
                    type="button"
                    onClick={() => onExecute(action.id)}
                    onMouseEnter={() => onHighlight(action.id)}
                  >
                    <span>
                      <strong>{action.title}</strong>
                      <small>{action.subtitle ?? action.group}</small>
                      {action.disabledReason === null ? null : (
                        <em>{action.disabledReason}</em>
                      )}
                    </span>
                    {action.shortcut?.label === undefined ? null : (
                      <kbd>{action.shortcut.label}</kbd>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export function getCommandPaletteKey(key: string): CommandPaletteKey {
  if (key === "Escape") {
    return "close";
  }

  if (key === "Enter") {
    return "execute";
  }

  if (key === "ArrowDown") {
    return "next";
  }

  if (key === "ArrowUp") {
    return "previous";
  }

  return "none";
}

export function getNextCommandPaletteIndex(input: {
  actionCount: number;
  currentIndex: number;
  direction: "next" | "previous";
}): number | null {
  if (input.actionCount <= 0) {
    return null;
  }

  const currentIndex =
    input.currentIndex < 0 ? 0 : input.currentIndex % input.actionCount;

  if (input.direction === "next") {
    return (currentIndex + 1) % input.actionCount;
  }

  return (currentIndex - 1 + input.actionCount) % input.actionCount;
}
