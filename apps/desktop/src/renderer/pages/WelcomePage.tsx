import { FolderOpen, HardDrive, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LocalWorkOsApi, RecentWorkspace } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import {
  useWorkspaceStore,
  workspaceStore
} from "../state/workspaceStore";

type WelcomePageProps = {
  apiClient?: LocalWorkOsApi;
  initialError?: string | null;
};

export function WelcomePage({
  apiClient = desktopApiClient,
  initialError = null
}: WelcomePageProps): React.JSX.Element {
  const navigate = useNavigate();
  const workspaceState = useWorkspaceStore();
  const [workspaceName, setWorkspaceName] = useState("Personal Work");
  const [workspacePath, setWorkspacePath] = useState("");
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    let active = true;

    async function loadRecentWorkspaces(): Promise<void> {
      const result = await apiClient.workspace.listRecentWorkspaces();

      if (!active) {
        return;
      }

      if (result.ok) {
        setRecentWorkspaces(result.data);
      }
    }

    void loadRecentWorkspaces();

    return () => {
      active = false;
    };
  }, [apiClient]);

  async function runWorkspaceAction(
    action: "create" | "open",
    rootPath: string
  ): Promise<void> {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result =
      action === "create"
        ? await apiClient.workspace.createWorkspace({
            name: workspaceName,
            rootPath
          })
        : await apiClient.workspace.openWorkspace({ rootPath });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    workspaceStore.setCurrentWorkspace(result.data);
    setMessage(`${result.data.name} is open.`);
    navigate("/workspace");
  }

  const pathReady = workspacePath.trim().length > 0;
  const createReady = pathReady && workspaceName.trim().length > 0;

  return (
    <main className="welcome-screen">
      <section className="welcome-content">
        <div className="welcome-copy">
          <p className="top-eyebrow">Local-only desktop workspace</p>
          <h1>Local Work OS</h1>
          <p>
            A private desktop shell for projects, contacts, inbox work, search,
            planning, files, and local maintenance.
          </p>

          <form
            className="workspace-form"
            onSubmit={(event) => {
              event.preventDefault();
              void runWorkspaceAction("create", workspacePath.trim());
            }}
          >
            <label>
              <span>Workspace name</span>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
            </label>
            <label>
              <span>Local folder path</span>
              <input
                placeholder="C:\\Users\\you\\Local Work OS"
                value={workspacePath}
                onChange={(event) => setWorkspacePath(event.target.value)}
              />
            </label>
            {error === null ? null : (
              <p className="form-message form-message-error">{error}</p>
            )}
            {message === null ? null : (
              <p className="form-message form-message-ok">{message}</p>
            )}
            <div className="welcome-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={!createReady || loading}
              >
                <FolderOpen size={18} aria-hidden="true" />
                Create workspace
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!pathReady || loading}
                onClick={() => {
                  void runWorkspaceAction("open", workspacePath.trim());
                }}
              >
                <HardDrive size={18} aria-hidden="true" />
                Open workspace
              </button>
            </div>
          </form>

          <section className="recent-workspaces" aria-label="Recent workspaces">
            <div className="panel-heading">
              <History size={17} aria-hidden="true" />
              <h2>Recent workspaces</h2>
            </div>
            {recentWorkspaces.length === 0 ? (
              <p className="muted-text">No recent workspaces yet.</p>
            ) : (
              <div className="recent-list">
                {recentWorkspaces.map((recent) => (
                  <button
                    type="button"
                    className="recent-workspace-button"
                    key={recent.rootPath}
                    onClick={() => {
                      setWorkspacePath(recent.rootPath);
                      void runWorkspaceAction("open", recent.rootPath);
                    }}
                  >
                    <strong>{recent.name}</strong>
                    <span>{recent.rootPath}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="welcome-system" aria-label="Local shell status">
          <div>
            <span
              className={
                workspaceState.currentWorkspace === null
                  ? "status-dot status-dot-warning"
                  : "status-dot"
              }
              aria-hidden="true"
            />
            <strong>
              {workspaceState.currentWorkspace === null
                ? "Waiting for workspace"
                : "Workspace open"}
            </strong>
          </div>
          <dl>
            <div>
              <dt>Workspace</dt>
              <dd>{workspaceState.currentWorkspace?.name ?? "Not connected"}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>
                {workspaceState.currentWorkspace?.schemaVersion === null ||
                workspaceState.currentWorkspace === null
                  ? "Not connected"
                  : `Schema ${workspaceState.currentWorkspace.schemaVersion}`}
              </dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Not required</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
