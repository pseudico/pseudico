import { FolderOpen, HardDrive, History, PlayCircle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, formatUserError } from "@local-work-os/ui";
import type {
  BackupSnapshotSummary,
  LocalWorkOsApi,
  RecentWorkspace,
  RestoreWorkspaceSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { showToast } from "../shell/toastStore";
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
  const [recoverySourcePath, setRecoverySourcePath] = useState<string | null>(
    null
  );

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
    action: "create" | "demo" | "open",
    rootPath: string
  ): Promise<void> {
    setLoading(true);
    setError(null);
    setMessage(null);

    const createInput = {
      name:
        action === "demo" && workspaceName.trim() === "Personal Work"
          ? "Demo Workspace"
          : workspaceName,
      rootPath
    };
    const result =
      action === "open"
        ? await apiClient.workspace.openWorkspace({ rootPath })
        : action === "demo"
          ? await apiClient.workspace.createDemoWorkspace(createInput)
          : await apiClient.workspace.createWorkspace(createInput);

    setLoading(false);

    if (!result.ok) {
      const message = formatUserError(result.error);
      setError(message);
      setRecoverySourcePath(action === "open" ? rootPath : null);
      showToast(message, {
        title: "Workspace unavailable",
        tone: "error"
      });
      return;
    }

    workspaceStore.setCurrentWorkspace(result.data);
    setRecoverySourcePath(null);
    const message = `${result.data.name} is open.`;
    setMessage(message);
    showToast(message, {
      title: "Workspace ready",
      tone: "success"
    });
    navigate("/workspace");
  }

  const pathReady = workspacePath.trim().length > 0;
  const createReady = pathReady && workspaceName.trim().length > 0;

  return (
    <section className="welcome-screen" data-space-budget-surface="workspace-entry">
      <section className="welcome-content">
        <div className="welcome-copy">
          <p className="top-eyebrow">Local-only desktop workspace</p>
          <h1>Local Work OS</h1>
          <p>
            A private desktop shell for projects, contacts, inbox work, search,
            planning, files, and local maintenance.
          </p>
          <p className="muted-text">
            To restore a backup or workspace JSON export, open the source
            workspace and use Settings → Backups/Imports to create a separate
            new workspace folder.
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
            {error === null ? null : <ErrorState error={error} title="Workspace action failed" />}
            {message === null ? null : (
              <p className="form-message form-message-ok">{message}</p>
            )}
            {recoverySourcePath === null ? null : (
              <RecoveryDialog
                apiClient={apiClient}
                sourceRootPath={recoverySourcePath}
                onRestored={(summary) => {
                  setMessage(
                    `Restored backup into ${summary.targetWorkspaceRootPath}.`
                  );
                  setRecoverySourcePath(null);
                  void refreshRecentWorkspaces(apiClient, setRecentWorkspaces);
                  navigate("/workspace");
                }}
              />
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
                disabled={!createReady || loading}
                onClick={() => {
                  void runWorkspaceAction("demo", workspacePath.trim());
                }}
              >
                <PlayCircle size={18} aria-hidden="true" />
                Create demo workspace
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
              <EmptyState
                description="Recently opened local workspace folders will appear here."
                icon={<History size={22} aria-hidden="true" />}
                title="No recent workspaces yet"
              />
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
    </section>
  );
}

function RecoveryDialog({
  apiClient,
  onRestored,
  sourceRootPath
}: {
  apiClient: LocalWorkOsApi;
  onRestored: (summary: RestoreWorkspaceSummary) => void;
  sourceRootPath: string;
}): React.JSX.Element {
  const [backups, setBackups] = useState<BackupSnapshotSummary[]>([]);
  const [backupRelativePath, setBackupRelativePath] = useState("");
  const [targetRootPath, setTargetRootPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBackups(): Promise<void> {
    setBusy(true);
    setError(null);

    const result = await apiClient.backup.listBackupsForWorkspacePath({
      rootPath: sourceRootPath
    });

    setBusy(false);

    if (!result.ok) {
      setError(formatUserError(result.error));
      return;
    }

    setBackups(result.data);
    setBackupRelativePath(result.data[0]?.relativePath ?? "");
  }

  async function restoreBackup(): Promise<void> {
    if (backupRelativePath.trim().length === 0) {
      setError("Choose a backup snapshot before restoring.");
      return;
    }

    if (targetRootPath.trim().length === 0) {
      setError("Enter a separate target workspace folder.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await apiClient.backup.restoreBackupFromWorkspacePath({
      sourceWorkspaceRootPath: sourceRootPath,
      backupRelativePath: backupRelativePath.trim(),
      targetRootPath: targetRootPath.trim()
    });

    setBusy(false);

    if (!result.ok) {
      setError(formatUserError(result.error));
      return;
    }

    const currentWorkspace = await apiClient.workspace.getCurrentWorkspace();

    if (currentWorkspace.ok && currentWorkspace.data !== null) {
      workspaceStore.setCurrentWorkspace(currentWorkspace.data);
    }

    showToast("Backup restored into a new workspace. The original database was left untouched.", {
      title: "Recovery complete",
      tone: "success"
    });
    onRestored(result.data);
  }

  const latestBackup = backups[0];

  return (
    <section className="error-state recovery-dialog" aria-label="Workspace recovery">
      <div className="panel-heading">
        <ShieldAlert size={18} aria-hidden="true" />
        <h2>Recovery options</h2>
      </div>
      <p>
        The workspace could not be opened. Local Work OS keeps the original
        database untouched; restore a backup into a separate new workspace
        folder instead.
      </p>
      <p className="muted-text">{sourceRootPath}</p>
      <div className="welcome-actions">
        <button
          className="secondary-button"
          disabled={busy}
          type="button"
          onClick={() => void loadBackups()}
        >
          {busy ? "Checking backups..." : "Find backups"}
        </button>
      </div>
      {latestBackup === undefined ? null : (
        <p className="form-message">
          Latest backup: {latestBackup.relativePath}
        </p>
      )}
      <label>
        <span>Backup snapshot</span>
        <select
          disabled={busy || backups.length === 0}
          value={backupRelativePath}
          onChange={(event) => setBackupRelativePath(event.target.value)}
        >
          {backups.map((backup) => (
            <option key={backup.relativePath} value={backup.relativePath}>
              {backup.relativePath}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>New workspace folder</span>
        <input
          placeholder="C:\\Users\\you\\Local Work OS Restored"
          value={targetRootPath}
          onChange={(event) => setTargetRootPath(event.target.value)}
        />
      </label>
      {error === null ? null : <p className="form-message form-message-error">{error}</p>}
      <button
        className="primary-button"
        disabled={busy || backupRelativePath.length === 0 || targetRootPath.length === 0}
        type="button"
        onClick={() => void restoreBackup()}
      >
        Restore backup into new workspace
      </button>
    </section>
  );
}

async function refreshRecentWorkspaces(
  apiClient: LocalWorkOsApi,
  setRecentWorkspaces: (recent: RecentWorkspace[]) => void
): Promise<void> {
  const result = await apiClient.workspace.listRecentWorkspaces();

  if (result.ok) {
    setRecentWorkspaces(result.data);
  }
}
