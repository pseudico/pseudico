import {
  CalendarDays,
  Contact,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LucideIcon,
  Search,
  Settings,
  Tags,
  Workflow
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { navRoutes, type AppRouteId } from "../routes";

const routeIcons: Partial<Record<AppRouteId, LucideIcon>> = {
  today: CalendarDays,
  inbox: Inbox,
  projects: FolderKanban,
  contacts: Contact,
  collections: Workflow,
  tagsCategories: Tags,
  search: Search,
  dashboard: LayoutDashboard,
  settings: Settings
};

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <NavLink to="/workspace" className="brand-link" aria-label="Workspace home">
        <span className="brand-mark" aria-hidden="true">
          L
        </span>
        <span>
          <span className="brand-title">Local Work OS</span>
          <span className="brand-subtitle">Local only</span>
        </span>
      </NavLink>

      <nav className="nav-list">
        {navRoutes.map((route) => {
          const Icon = routeIcons[route.id] ?? LayoutDashboard;

          return (
            <NavLink
              key={route.id}
              to={route.path}
              className={({ isActive }) =>
                isActive ? "nav-item nav-item-active" : "nav-item"
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{route.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
