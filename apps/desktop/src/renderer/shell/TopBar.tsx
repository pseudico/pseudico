import { ArrowLeft, ArrowRight, Clock3, Command, Plus, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { QuickAddContext } from "../components/QuickAddModal";
import { getQuickAddContext } from "../shortcuts/appShortcuts";
import { getRouteByPath } from "../routes";
import { useWorkspaceStore } from "../state/workspaceStore";
import type { NavigationRecentTargetSummary } from "../../preload/api";

export function TopBar({
  canGoBack = false,
  canGoForward = false,
  recentTargets = [],
  onGoBack = () => undefined,
  onGoForward = () => undefined,
  onNavigateRecent = () => undefined,
  onOpenCommandPalette = () => undefined,
  onQuickAdd = () => undefined
}: {
  canGoBack?: boolean;
  canGoForward?: boolean;
  recentTargets?: NavigationRecentTargetSummary[];
  onGoBack?: () => void;
  onGoForward?: () => void;
  onNavigateRecent?: (target: NavigationRecentTargetSummary) => void;
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
        <div className="navigation-controls" aria-label="Navigation history">
          <button
            type="button"
            className="icon-button compact-icon-button"
            disabled={!canGoBack}
            aria-label="Go back"
            onClick={onGoBack}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Back</span>
          </button>
          <button
            type="button"
            className="icon-button compact-icon-button"
            disabled={!canGoForward}
            aria-label="Go forward"
            onClick={onGoForward}
          >
            <ArrowRight size={18} aria-hidden="true" />
            <span>Forward</span>
          </button>
        </div>
        <RecentNavigationMenu
          recentTargets={recentTargets}
          disabled={currentWorkspace === null}
          onNavigateRecent={onNavigateRecent}
        />
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

export function RecentNavigationMenu({
  disabled = false,
  initialOpen = false,
  recentTargets,
  onNavigateRecent
}: {
  disabled?: boolean;
  initialOpen?: boolean;
  recentTargets: readonly NavigationRecentTargetSummary[];
  onNavigateRecent: (target: NavigationRecentTargetSummary) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(initialOpen);
  const hasRecentTargets = recentTargets.length > 0;

  return (
    <div className="recent-navigation-menu">
      <button
        type="button"
        className="icon-button"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <Clock3 size={18} aria-hidden="true" />
        <span>Recent</span>
      </button>
      {!open ? null : (
        <div className="recent-navigation-popover" role="menu">
          <p className="top-eyebrow">Recently opened</p>
          {!hasRecentTargets ? (
            <p className="empty-inline">Open a view, project, contact, or item.</p>
          ) : (
            recentTargets.map((target) => (
              <button
                key={`${target.targetType}:${target.targetId ?? target.path}:${target.viewedAt}`}
                type="button"
                role="menuitem"
                onClick={() => {
                  onNavigateRecent(target);
                  setOpen(false);
                }}
              >
                <strong>{target.label}</strong>
                <small>{target.subtitle ?? target.path}</small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
