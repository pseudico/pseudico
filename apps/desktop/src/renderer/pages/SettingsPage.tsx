import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";

export function SettingsPage(): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    void refreshCurrentWorkspace(desktopApiClient);
  }, []);

  return (
    <section className="settings-layout">
      <div className="page-heading">
        <p className="top-eyebrow">Settings</p>
        <h2>Workspace settings</h2>
        <p>
          {currentWorkspace === null
            ? "Open a workspace to view local database details."
            : currentWorkspace.rootPath}
        </p>
      </div>
      <WorkspaceHealthPanel workspace={currentWorkspace} />
      <aside className="local-only-panel" aria-label="Local-only status">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h3>Local-only boundary</h3>
          <p>No cloud sync, hosted accounts, telemetry, or remote storage.</p>
        </div>
      </aside>
    </section>
  );
}
