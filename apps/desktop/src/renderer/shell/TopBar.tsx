import { Plus, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { QuickAddModal, type QuickAddContext } from "../components/QuickAddModal";
import { getRouteByPath } from "../routes";
import { useWorkspaceStore } from "../state/workspaceStore";

export function TopBar(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const route = getRouteByPath(location.pathname);
  const { currentWorkspace } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<QuickAddContext>({});

  useEffect(() => {
    if (location.pathname !== "/search") {
      return;
    }

    setSearchQuery(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);

  function openQuickAdd(context?: QuickAddContext): void {
    setQuickAddContext(context ?? {});
    setQuickAddOpen(true);
  }

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
