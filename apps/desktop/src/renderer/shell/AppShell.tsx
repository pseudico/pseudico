import { Outlet } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { CommandPaletteHost } from "../components/CommandPaletteHost";
import {
  QUICK_START_OPEN_EVENT,
  QuickAddModal,
  type QuickAddContext
} from "../components/QuickAddModal";
import { useWorkspaceStore } from "../state/workspaceStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell(): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<QuickAddContext>({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const openQuickAdd = useCallback((context?: QuickAddContext) => {
    setQuickAddContext(context ?? {});
    setQuickAddOpen(true);
  }, []);

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
      <Sidebar />
      <div className="app-frame">
        <TopBar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onQuickAdd={openQuickAdd}
        />
        <main className="main-content" aria-label="Workspace content">
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
