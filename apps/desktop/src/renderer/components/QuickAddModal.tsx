import { QuickAddForm, type QuickAddTargetOption } from "@local-work-os/ui";
import type {
  ApiResult,
  InboxSummary,
  LocalWorkOsApi,
  ProjectSummary,
  TaskSummary,
  WorkspaceSummary
} from "../../preload/api";
import { apiError, apiOk } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useEffect, useState } from "react";

export const QUICK_TASK_CREATED_EVENT = "local-work-os:quick-task-created";

export type QuickAddContext = {
  projectId?: string | null;
};

export type QuickAddTargetResolution = {
  defaultContainerId: string;
  inbox: InboxSummary;
  targets: QuickAddTargetOption[];
};

export type CreateQuickTaskInput = {
  dueDate: string;
  targetContainerId: string;
  title: string;
  workspaceId: string;
};

export type QuickAddModalProps = {
  apiClient?: LocalWorkOsApi;
  context?: QuickAddContext;
  open: boolean;
  workspace: WorkspaceSummary | null;
  onClose: () => void;
};

export function QuickAddModal({
  apiClient = desktopApiClient,
  context,
  open,
  workspace,
  onClose
}: QuickAddModalProps): React.JSX.Element | null {
  const [targets, setTargets] = useState<QuickAddTargetOption[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSuccess(null);

    if (workspace === null) {
      setTargets([]);
      setSelectedTargetId("");
      setError("Open or create a local workspace before capturing tasks.");
      return;
    }

    let active = true;
    const activeWorkspace = workspace;

    async function loadTargets(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await resolveDefaultCaptureContainer(
        activeWorkspace.id,
        context,
        apiClient
      );

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setTargets([]);
        setSelectedTargetId("");
        setError(result.error.message);
        return;
      }

      setTargets(result.data.targets);
      setSelectedTargetId(result.data.defaultContainerId);
    }

    void loadTargets();

    return () => {
      active = false;
    };
  }, [apiClient, context, open, workspace]);

  if (!open) {
    return null;
  }

  const visibleError =
    workspace === null
      ? "Open or create a local workspace before capturing tasks."
      : error;

  async function handleSubmit(values: {
    dueDate: string;
    targetContainerId: string;
    title: string;
  }): Promise<boolean> {
    if (workspace === null) {
      setError("Open or create a local workspace before capturing tasks.");
      return false;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await createQuickTask(apiClient, {
      workspaceId: workspace.id,
      targetContainerId: values.targetContainerId,
      title: values.title,
      dueDate: values.dueDate
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return false;
    }

    notifyQuickTaskCreated(result.data);
    setSuccess(`Saved "${result.data.title}".`);
    return true;
  }

  return (
    <div className="quick-add-backdrop" role="presentation">
      <dialog className="quick-add-dialog" open aria-labelledby="quick-add-title">
        <div className="quick-add-dialog-header">
          <div>
            <p className="top-eyebrow">Quick add</p>
            <h2 id="quick-add-title">New task</h2>
          </div>
          <button
            className="secondary-button compact-button"
            disabled={submitting}
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading ? <p className="muted-text">Loading capture targets...</p> : null}

        <QuickAddForm
          disabled={loading || submitting || workspace === null}
          error={visibleError}
          selectedTargetId={selectedTargetId}
          success={success}
          targets={targets}
          onSubmit={handleSubmit}
          onTargetChange={setSelectedTargetId}
        />
      </dialog>
    </div>
  );
}

export async function resolveDefaultCaptureContainer(
  workspaceId: string,
  context: QuickAddContext | undefined,
  apiClient: LocalWorkOsApi
): Promise<ApiResult<QuickAddTargetResolution>> {
  const [inboxResult, projectsResult] = await Promise.all([
    apiClient.inbox.getInbox(workspaceId),
    apiClient.projects.list(workspaceId)
  ]);

  if (!inboxResult.ok) {
    return inboxResult;
  }

  if (!projectsResult.ok) {
    return projectsResult;
  }

  return apiOk(
    resolveDefaultCaptureContainerFromTargets({
      inbox: inboxResult.data,
      projects: projectsResult.data,
      ...(context === undefined ? {} : { context })
    })
  );
}

export function resolveDefaultCaptureContainerFromTargets(input: {
  context?: QuickAddContext;
  inbox: InboxSummary;
  projects: readonly ProjectSummary[];
}): QuickAddTargetResolution {
  const activeProjects = input.projects.filter(
    (project) => project.status === "active" && project.deletedAt === null
  );
  const projectTargets = activeProjects.map(toProjectTarget);
  const contextProject = activeProjects.find(
    (project) => project.id === input.context?.projectId
  );
  const targets = [toInboxTarget(input.inbox), ...projectTargets];

  return {
    inbox: input.inbox,
    targets,
    defaultContainerId: contextProject?.id ?? input.inbox.id
  };
}

export async function createQuickTask(
  apiClient: LocalWorkOsApi,
  input: CreateQuickTaskInput
): Promise<ApiResult<TaskSummary>> {
  if (input.title.trim().length === 0) {
    return apiError("INVALID_INPUT", "Task title is required.");
  }

  if (input.targetContainerId.trim().length === 0) {
    return apiError("INVALID_INPUT", "Choose where to save the task.");
  }

  return await apiClient.tasks.create({
    workspaceId: input.workspaceId,
    containerId: input.targetContainerId,
    title: input.title.trim(),
    dueAt: input.dueDate.length === 0 ? null : input.dueDate
  });
}

function toInboxTarget(inbox: InboxSummary): QuickAddTargetOption {
  return {
    id: inbox.id,
    name: inbox.name,
    type: "inbox",
    description: inbox.description
  };
}

function toProjectTarget(project: ProjectSummary): QuickAddTargetOption {
  return {
    id: project.id,
    name: project.name,
    type: "project",
    description: project.description
  };
}

function notifyQuickTaskCreated(task: TaskSummary): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(QUICK_TASK_CREATED_EVENT, {
      detail: { task }
    })
  );
}
