import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell(): React.JSX.Element {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-frame">
        <TopBar />
        <main className="main-content" aria-label="Workspace content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
