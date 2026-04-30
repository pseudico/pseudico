import { Plus, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getRouteByPath } from "../routes";

export function TopBar(): React.JSX.Element {
  const location = useLocation();
  const route = getRouteByPath(location.pathname);

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
        <button type="button" className="icon-button" disabled aria-label="Quick add">
          <Plus size={18} aria-hidden="true" />
          <span>Quick add</span>
        </button>
      </div>
    </header>
  );
}
