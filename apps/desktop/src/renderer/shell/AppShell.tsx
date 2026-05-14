import { AppTabStrip } from "@local-work-os/ui";
import { t } from "@local-work-os/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { CommandPaletteHost } from "../components/CommandPaletteHost";
import {
  QUICK_START_OPEN_EVENT,
  QuickAddModal,
  type QuickAddContext
} from "../components/QuickAddModal";
import { useAppTabs } from "../navigation/useAppTabs";
import { useNavigationHistory } from "../navigation/useNavigationHistory";
import { useWorkspaceStore } from "../state/workspaceStore";
import { Sidebar } from "./Sidebar";
import {
  resolveGlobalAppShortcut,
  runGlobalAppShortcut
} from "../shortcuts/appShortcuts";
import { TopBar } from "./TopBar";

export function AppShell(): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<QuickAddContext>({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const navigationHistory = useNavigationHistory({ workspace: currentWorkspace });
  const appTabs = useAppTabs({ workspace: currentWorkspace });
  const openQuickAdd = useCallback((context?: QuickAddContext) => {
    setQuickAddContext(context ?? {});
    setQuickAddOpen(true);
  }, []);


  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent): void {
      const shortcut = resolveGlobalAppShortcut(event);

      if (shortcut === null) {
        return;
      }

      const handled = runGlobalAppShortcut(shortcut, {
        currentPathname: location.pathname,
        navigate,
        openCommandPalette: () => setCommandPaletteOpen(true),
        openQuickAdd,
        workspaceOpen: currentWorkspace !== null
      });

      if (handled) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleGlobalShortcut);

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcut);
    };
  }, [currentWorkspace, location.pathname, navigate, openQuickAdd]);

  useEffect(() => {
    function handleOpenQuickStart(event: Event): void {
      openQuickAdd((event as CustomEvent<QuickAddContext>).detail);
    }

    window.addEventListener(QUICK_START_OPEN_EVENT, handleOpenQuickStart);

    return () => {
      window.removeEventListener(QUICK_START_OPEN_EVENT, handleOpenQuickStart);
    };
  }, [openQuickAdd]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t("app.shell.skipToContent")}</a>
      <Sidebar />
      <div className="app-frame">
        <TopBar
          canGoBack={navigationHistory.canGoBack}
          canGoForward={navigationHistory.canGoForward}
          recentTargets={navigationHistory.recentTargets}
          onGoBack={navigationHistory.goBack}
          onGoForward={navigationHistory.goForward}
          onNavigateRecent={navigationHistory.navigateToRecent}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onQuickAdd={openQuickAdd}
        />
        <AppTabStrip
          activeTabId={appTabs.activeTabId}
          tabs={appTabs.tabs}
          onCloseTab={appTabs.closeTab}
          onMoveTab={appTabs.moveTab}
          onSelectTab={appTabs.selectTab}
        />
        <main className="main-content" id="main-content" tabIndex={-1} aria-label={t("app.shell.mainContent")}>
          <Outlet />
        </main>
      </div>
      <CommandPaletteHost
        open={commandPaletteOpen}
        workspaceOpen={currentWorkspace !== null}
        openQuickAdd={openQuickAdd}
        onClose={() => setCommandPaletteOpen(false)}
        onOpen={() => setCommandPaletteOpen(true)}
      />
      <QuickAddModal
        context={quickAddContext}
        open={quickAddOpen}
        workspace={currentWorkspace}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  );
}
