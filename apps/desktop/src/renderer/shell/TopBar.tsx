import { ArrowLeft, ArrowRight, Clock3, Command, Plus, Search } from "lucide-react";
import { t } from "@local-work-os/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useId, useRef, useState } from "react";
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

  function navigateToSearch(): void {
    const trimmedQuery = searchQuery.trim();
    const suffix =
      trimmedQuery.length === 0 ? "" : `?q=${encodeURIComponent(trimmedQuery)}`;

    navigate(`/search${suffix}`);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    navigateToSearch();
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ): void {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    navigateToSearch();
  }

  return (
    <header className="top-bar">
      <div>
        <p className="top-eyebrow">{t("app.topBar.workspaceShell")}</p>
        <h1>{route.title}</h1>
      </div>

      <div className="top-actions">
        <div className="navigation-controls" aria-label={t("app.topBar.navigationHistory")}>
          <button
            type="button"
            className="icon-button compact-icon-button"
            disabled={!canGoBack}
            aria-label={t("app.topBar.back")}
            onClick={onGoBack}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{t("app.topBar.back")}</span>
          </button>
          <button
            type="button"
            className="icon-button compact-icon-button"
            disabled={!canGoForward}
            aria-label={t("app.topBar.forward")}
            onClick={onGoForward}
          >
            <ArrowRight size={18} aria-hidden="true" />
            <span>{t("app.topBar.forward")}</span>
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
          aria-label={t("app.topBar.openCommandPalette")}
          onClick={onOpenCommandPalette}
        >
          <Command size={18} aria-hidden="true" />
          <span>{t("app.topBar.commands")}</span>
          <kbd>{t("app.topBar.commandShortcut")}</kbd>
        </button>
        <form className="search-control" role="search" onSubmit={submitSearch}>
          <label>
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{t("app.topBar.search")}</span>
            <input
              type="search"
              placeholder={t("app.topBar.searchPlaceholder")}
              value={searchQuery}
              disabled={currentWorkspace === null}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </label>
          <button
            type="submit"
            className="top-search-submit"
            disabled={currentWorkspace === null}
          >
            Search
          </button>
        </form>
        <button
          type="button"
          className="icon-button"
          disabled={currentWorkspace === null}
          aria-label={t("app.topBar.quickStart")}
          onClick={() => onQuickAdd(getQuickAddContext(location.pathname))}
        >
          <Plus size={18} aria-hidden="true" />
          <span>{t("app.topBar.quickStart")}</span>
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const hasRecentTargets = recentTargets.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="recent-navigation-menu">
      <button
        type="button"
        className="icon-button"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        ref={buttonRef}
        onClick={() => setOpen((current) => !current)}
      >
        <Clock3 size={18} aria-hidden="true" />
        <span>{t("app.topBar.recent")}</span>
      </button>
      {!open ? null : (
        <div className="recent-navigation-popover" id={menuId} ref={popoverRef} role="menu" aria-label={t("app.topBar.recentlyOpened")}>
          <p className="top-eyebrow">{t("app.topBar.recentlyOpened")}</p>
          {!hasRecentTargets ? (
            <p className="empty-inline">{t("app.topBar.recentEmpty")}</p>
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
