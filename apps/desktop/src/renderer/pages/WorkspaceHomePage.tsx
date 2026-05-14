import { Link } from "react-router-dom";
import { useEffect } from "react";
import { onboardingChecklist } from "@local-work-os/features/help";
import { EmptyState, OnboardingChecklist, renderLoadableState } from "@local-work-os/ui";
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

      {renderLoadableState({
        loading: loading && currentWorkspace === null,
        loadingLabel: "Checking current workspace..."
      })}

      {currentWorkspace === null ? (
        <EmptyState
          action={
            <div className="empty-state-action-row">
              <Link to="/welcome" className="primary-button page-action-link">
                Open workspace
              </Link>
              <Link to="/help" className="secondary-button page-action-link">
                Read local help
              </Link>
            </div>
          }
          description="Create or open a local workspace before using projects, tasks, files, and search."
          title="No workspace open"
        />
      ) : null}

      {currentWorkspace === null ? null : (
        <div className="workspace-onboarding-panel">
          <OnboardingChecklist items={onboardingChecklist} />
          <Link to="/help" className="secondary-button page-action-link">
            Open full help center
          </Link>
        </div>
      )}

      <WorkspaceHealthPanel workspace={currentWorkspace} />
    </section>
  );
}
