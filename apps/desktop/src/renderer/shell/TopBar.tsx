import { Plus, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { QuickAddModal, type QuickAddContext } from "../components/QuickAddModal";
import { getRouteByPath } from "../routes";
import { useWorkspaceStore } from "../state/workspaceStore";

export function TopBar(): React.JSX.Element {
  const location = useLocation();
  const route = getRouteByPath(location.pathname);
  const { currentWorkspace } = useWorkspaceStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<QuickAddContext>({});

  function openQuickAdd(context?: QuickAddContext): void {
    setQuickAddContext(context ?? {});
    setQuickAddOpen(true);
  }

  return (
    <header className="top-bar">
      <div>
        <p className="top-eyebrow">Workspace shell</p>
        <h1>{route.title}</h1>
      </div>

      <div className="top-actions">
        <label className="search-control">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search local workspace" disabled />
        </label>
        <button
          type="button"
          className="icon-button"
          disabled={currentWorkspace === null}
          aria-label="Quick add"
          onClick={() => openQuickAdd(getQuickAddContext(location.pathname))}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Quick add</span>
        </button>
      </div>

      <QuickAddModal
        context={quickAddContext}
        open={quickAddOpen}
        workspace={currentWorkspace}
        onClose={() => setQuickAddOpen(false)}
      />
    </header>
  );
}

function getQuickAddContext(pathname: string): QuickAddContext {
  const projectMatch = /^\/projects\/([^/]+)$/.exec(pathname);
  const projectId = projectMatch?.[1];

  return projectId === undefined ? {} : { projectId };
}
