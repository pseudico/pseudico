import { Command, Plus, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { QuickAddContext } from "../components/QuickAddModal";
import { getQuickAddContext } from "../components/CommandPaletteHost";
import { getRouteByPath } from "../routes";
import { useWorkspaceStore } from "../state/workspaceStore";

export function TopBar({
  onOpenCommandPalette = () => undefined,
  onQuickAdd = () => undefined
}: {
  onOpenCommandPalette?: () => void;
  onQuickAdd?: (context?: QuickAddContext) => void;
}): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const route = getRouteByPath(location.pathname);
  const { currentWorkspace } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (location.pathname !== "/search") {
      return;
    }

    setSearchQuery(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedQuery = searchQuery.trim();
    const suffix =
      trimmedQuery.length === 0 ? "" : `?q=${encodeURIComponent(trimmedQuery)}`;

    navigate(`/search${suffix}`);
  }

  return (
    <header className="top-bar">
      <div>
        <p className="top-eyebrow">Workspace shell</p>
        <h1>{route.title}</h1>
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Open command palette"
          onClick={onOpenCommandPalette}
        >
          <Command size={18} aria-hidden="true" />
          <span>Commands</span>
          <kbd>Ctrl/⌘ K</kbd>
        </button>
        <form className="search-control" role="search" onSubmit={submitSearch}>
          <label>
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder="Search local workspace"
              value={searchQuery}
              disabled={currentWorkspace === null}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </form>
        <button
          type="button"
          className="icon-button"
          disabled={currentWorkspace === null}
          aria-label="Quick Start"
          onClick={() => onQuickAdd(getQuickAddContext(location.pathname))}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Quick Start</span>
        </button>
      </div>
    </header>
  );
}
