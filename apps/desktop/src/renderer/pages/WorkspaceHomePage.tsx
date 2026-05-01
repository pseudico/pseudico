import { Link } from "react-router-dom";
import { useEffect } from "react";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";

export function WorkspaceHomePage(): React.JSX.Element {
  const { currentWorkspace, loading } = useWorkspaceStore();

  useEffect(() => {
    void refreshCurrentWorkspace(desktopApiClient);
  }, []);

  return (
    <section className="workspace-page">
      <div className="page-heading">
        <p className="top-eyebrow">Workspace</p>
        <h2>{currentWorkspace?.name ?? "Workspace Home"}</h2>
        <p>
          {currentWorkspace === null
            ? "Open a local workspace to begin."
            : currentWorkspace.rootPath}
        </p>
      </div>

      {loading && currentWorkspace === null ? (
        <p className="muted-text">Checking current workspace...</p>
      ) : null}

      {currentWorkspace === null ? (
        <Link to="/welcome" className="primary-button page-action-link">
          Open workspace
        </Link>
      ) : null}

      <WorkspaceHealthPanel workspace={currentWorkspace} />
    </section>
  );
}
