import {
  getQuickStartActions,
  isContentQuickStartAction,
  resolveQuickStartTargets,
  type QuickStartActionKind,
  type QuickStartContext,
  type QuickStartTarget
} from "@local-work-os/features/quickStart";
import {
  QuickAddForm,
  QuickStartMenu,
  handleModalFocusKeyDown,
  useModalFocusManagement,
  type QuickAddTargetOption
} from "@local-work-os/ui";
import type {
  ApiResult,
  ContactSummary,
  FileAttachmentResultSummary,
  InboxSummary,
  LinkSummary,
  ListSummary,
  LocalWorkOsApi,
  NoteSummary,
  ProjectSummary,
  TaskSummary,
  WorkspaceSummary
} from "../../preload/api";
import { apiError, apiOk } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export const QUICK_TASK_CREATED_EVENT = "local-work-os:quick-task-created";
export const QUICK_START_OPEN_EVENT = "local-work-os:open-quick-start";
export const QUICK_START_SAVED_EVENT = "local-work-os:quick-start-saved";

export type QuickAddContext = QuickStartContext & {
  projectId?: string | null;
  contactId?: string | null;
  initialActionId?: QuickStartActionKind;
};

export type QuickAddTargetResolution = {
  defaultContainerId: string;
  defaultContainerTabId: string | null;
  inbox: InboxSummary;
  targets: QuickAddTargetOption[];
};

export type CreateQuickTaskInput = {
  allDay?: boolean;
  dueDate: string;
  dueAt?: string | null;
  startAt?: string | null;
  targetContainerId: string;
  targetContainerTabId?: string | null;
  title: string;
  timezone?: string | null;
  workspaceId: string;
};

export type QuickStartFormValues =
  | {
      kind: "task";
      allDay?: boolean;
      dueDate: string;
      dueAt?: string | null;
      startAt?: string | null;
      targetContainerId: string;
      targetContainerTabId?: string | null;
      title: string;
      timezone?: string | null;
      workspaceId: string;
    }
  | {
      kind: "note";
      targetContainerId: string;
      targetContainerTabId?: string | null;
      title: string;
      content: string;
      workspaceId: string;
    }
  | {
      kind: "list";
      targetContainerId: string;
      targetContainerTabId?: string | null;
      title: string;
      workspaceId: string;
    }
  | {
      kind: "file";
      targetContainerId: string;
      targetContainerTabId?: string | null;
      workspaceId: string;
    }
  | {
      kind: "link";
      targetContainerId: string;
      targetContainerTabId?: string | null;
      title: string;
      url: string;
      description: string;
      workspaceId: string;
    }
  | {
      kind: "project";
      name: string;
      description: string;
      workspaceId: string;
    }
  | {
      kind: "contact";
      name: string;
      description: string;
      workspaceId: string;
    };

export type QuickStartMutationSummary =
  | TaskSummary
  | NoteSummary
  | ListSummary
  | LinkSummary
  | FileAttachmentResultSummary
  | ProjectSummary
  | ContactSummary
  | null;

export type QuickStartSavedResult =
  | QuickStartMutationSummary
  | { project: ProjectSummary }
  | { contact: ContactSummary };

export type QuickStartSavedEventDetail = {
  kind: QuickStartFormValues["kind"];
  result: QuickStartSavedResult;
};

export type QuickAddModalProps = {
  apiClient?: LocalWorkOsApi;
  context?: QuickAddContext;
  open: boolean;
  workspace: WorkspaceSummary | null;
  onClose: () => void;
  onNavigateToCreatedTarget?: (path: string) => void;
};

export function QuickAddModal({
  apiClient = desktopApiClient,
  context,
  open,
  workspace,
  onClose,
  onNavigateToCreatedTarget
}: QuickAddModalProps): React.JSX.Element | null {
  const [targets, setTargets] = useState<QuickAddTargetOption[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] =
    useState<QuickStartActionKind>("task");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalFocusManagement({
    containerRef: dialogRef,
    open
  });

  const actions = useMemo(
    () =>
      getQuickStartActions({
        workspaceOpen: workspace !== null,
        targetAvailable: targets.length > 0
      }),
    [targets.length, workspace]
  );
  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ?? actions[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedActionId(context?.initialActionId ?? "task");
    setSuccess(null);

    if (workspace === null) {
      setTargets([]);
      setSelectedTargetId("");
      setSelectedTabId(null);
      setError("Open or create a local workspace before using Quick Start.");
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
        setSelectedTabId(null);
        setError(result.error.message);
        return;
      }

      setTargets(result.data.targets);
      setSelectedTargetId(result.data.defaultContainerId);
      setSelectedTabId(result.data.defaultContainerTabId);
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
    workspace === null ? "Open or create a local workspace before using Quick Start." : error;
  const disabled =
    loading || submitting || workspace === null || selectedAction?.disabledReason != null;

  async function submitQuickStart(values: QuickStartFormValues): Promise<boolean> {
    if (workspace === null) {
      setError("Open or create a local workspace before using Quick Start.");
      return false;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await createQuickStartItem(apiClient, values);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return false;
    }

    if (values.kind === "task" && result.data !== null) {
      notifyQuickTaskCreated(result.data as TaskSummary);
    }

    notifyQuickStartSaved(values.kind, result.data);

    setSuccess(getSuccessMessage(values.kind, result.data));
    const destination = getQuickStartCreatedDestination(values.kind, result.data);

    if (destination !== null) {
      onNavigateToCreatedTarget?.(destination);
    }

    return true;
  }

  return (
    <div className="quick-add-backdrop" role="presentation">
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="quick-add-dialog quick-start-dialog"
        open
        ref={dialogRef}
        onKeyDown={(event) => {
          if (submitting && event.key === "Escape") {
            return;
          }

          handleModalFocusKeyDown(event, dialogRef.current, onClose);
        }}
      >
        <div className="quick-add-dialog-header">
          <div>
            <p className="top-eyebrow">Quick Start</p>
            <h2 id={titleId}>Create local work</h2>
          </div>
          <button
            className="secondary-button compact-button"
            aria-label="Close Quick Start"
            disabled={submitting}
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="sr-only" id={descriptionId}>Use Tab and Shift+Tab to move through Quick Start fields, Escape to close, and Enter to submit the active form.</p>

        {loading ? <p className="muted-text">Loading Quick Start context...</p> : null}

        <QuickStartMenu
          actions={actions}
          selectedActionId={selectedActionId}
          onSelectAction={(actionId) => setSelectedActionId(actionId as QuickStartActionKind)}
        />

        {selectedAction === undefined ? null : (
          <QuickStartActionForm
            actionId={selectedAction.id}
            defaultContainerTabId={selectedTabId}
            disabled={disabled}
            error={visibleError ?? selectedAction.disabledReason}
            selectedTargetId={selectedTargetId}
            success={success}
            targets={targets}
            workspace={workspace}
            onSubmit={submitQuickStart}
            onTargetChange={(targetId) => {
              setSelectedTargetId(targetId);
              if (targetId !== context?.containerId) {
                setSelectedTabId(null);
              } else {
                setSelectedTabId(context?.containerTabId ?? null);
              }
            }}
          />
        )}
      </dialog>
    </div>
  );
}

export async function resolveDefaultCaptureContainer(
  workspaceId: string,
  context: QuickAddContext | undefined,
  apiClient: LocalWorkOsApi
): Promise<ApiResult<QuickAddTargetResolution>> {
  const [inboxResult, projectsResult, contactsResult] = await Promise.all([
    apiClient.inbox.getInbox(workspaceId),
    apiClient.projects.list(workspaceId),
    apiClient.contacts.list(workspaceId)
  ]);

  if (!inboxResult.ok) {
    return inboxResult;
  }

  if (!projectsResult.ok) {
    return projectsResult;
  }

  if (!contactsResult.ok) {
    return contactsResult;
  }

  return apiOk(
    resolveDefaultCaptureContainerFromTargets({
      inbox: inboxResult.data,
      projects: projectsResult.data,
      contacts: contactsResult.data,
      ...(context === undefined ? {} : { context })
    })
  );
}

export function resolveDefaultCaptureContainerFromTargets(input: {
  context?: QuickAddContext;
  inbox: InboxSummary;
  projects: readonly ProjectSummary[];
  contacts?: readonly ContactSummary[];
}): QuickAddTargetResolution {
  const normalizedContext = normalizeQuickAddContext(input.context);
  const resolution = resolveQuickStartTargets({
    inbox: toQuickStartTarget(input.inbox),
    projects: input.projects.map(toQuickStartTarget),
    contacts: (input.contacts ?? []).map(toQuickStartTarget),
    ...(normalizedContext === undefined ? {} : { context: normalizedContext })
  });

  return {
    inbox: input.inbox,
    targets: resolution.targets.map(toQuickAddTarget),
    defaultContainerId: resolution.defaultContainerId,
    defaultContainerTabId: resolution.defaultContainerTabId
  };
}

export async function createQuickTask(
  apiClient: LocalWorkOsApi,
  input: CreateQuickTaskInput
): Promise<ApiResult<TaskSummary>> {
  const result = await createQuickStartItem(apiClient, {
    kind: "task",
    workspaceId: input.workspaceId,
    targetContainerId: input.targetContainerId,
    targetContainerTabId: input.targetContainerTabId ?? null,
    title: input.title,
    dueDate: input.dueDate,
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
    ...(input.startAt === undefined ? {} : { startAt: input.startAt }),
    ...(input.allDay === undefined ? {} : { allDay: input.allDay }),
    ...(input.timezone === undefined ? {} : { timezone: input.timezone })
  });

  if (!result.ok) {
    return result;
  }

  return apiOk(result.data as TaskSummary);
}

export async function createQuickStartItem(
  apiClient: LocalWorkOsApi,
  input: QuickStartFormValues
): Promise<ApiResult<QuickStartMutationSummary>> {
  switch (input.kind) {
    case "task":
      if (input.title.trim().length === 0) {
        return apiError("INVALID_INPUT", "Task title is required.");
      }
      if (input.targetContainerId.trim().length === 0) {
        return apiError("INVALID_INPUT", "Choose where to save the task.");
      }
      return await apiClient.tasks.create({
        workspaceId: input.workspaceId,
        containerId: input.targetContainerId,
        containerTabId: input.targetContainerTabId ?? null,
        title: input.title.trim(),
        dueAt: input.dueAt ?? (input.dueDate.length === 0 ? null : input.dueDate),
        startAt: input.startAt ?? null,
        allDay: input.allDay ?? true,
        timezone: input.timezone ?? null
      });
    case "note":
      if (input.title.trim().length === 0) {
        return apiError("INVALID_INPUT", "Note title is required.");
      }
      return await apiClient.notes.create({
        workspaceId: input.workspaceId,
        containerId: input.targetContainerId,
        containerTabId: input.targetContainerTabId ?? null,
        title: input.title.trim(),
        content: input.content.trim()
      });
    case "list":
      if (input.title.trim().length === 0) {
        return apiError("INVALID_INPUT", "List title is required.");
      }
      return await apiClient.lists.create({
        workspaceId: input.workspaceId,
        containerId: input.targetContainerId,
        containerTabId: input.targetContainerTabId ?? null,
        title: input.title.trim()
      });
    case "file":
      if (input.targetContainerId.trim().length === 0) {
        return apiError("INVALID_INPUT", "Choose where to attach the file.");
      }
      return await apiClient.files.chooseAndAttach({
        workspaceId: input.workspaceId,
        containerId: input.targetContainerId,
        containerTabId: input.targetContainerTabId ?? null
      });
    case "link":
      if (input.url.trim().length === 0) {
        return apiError("INVALID_INPUT", "Link URL is required.");
      }
      return await apiClient.links.create({
        workspaceId: input.workspaceId,
        containerId: input.targetContainerId,
        containerTabId: input.targetContainerTabId ?? null,
        url: input.url.trim(),
        title: input.title.trim().length === 0 ? null : input.title.trim(),
        description:
          input.description.trim().length === 0 ? null : input.description.trim()
      });
    case "project":
      if (input.name.trim().length === 0) {
        return apiError("INVALID_INPUT", "Project name is required.");
      }
      return mapProjectCreateResult(
        await apiClient.projects.create({
          workspaceId: input.workspaceId,
          name: input.name.trim(),
          description:
            input.description.trim().length === 0 ? null : input.description.trim()
        })
      );
    case "contact":
      if (input.name.trim().length === 0) {
        return apiError("INVALID_INPUT", "Contact name is required.");
      }
      return mapContactCreateResult(
        await apiClient.contacts.create({
          workspaceId: input.workspaceId,
          name: input.name.trim(),
          description:
            input.description.trim().length === 0 ? null : input.description.trim()
        })
      );
  }
}

export function openQuickStartFromContainer(context: QuickAddContext): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<QuickAddContext>(QUICK_START_OPEN_EVENT, { detail: context })
  );
}

function QuickStartActionForm({
  actionId,
  defaultContainerTabId,
  disabled,
  error,
  selectedTargetId,
  success,
  targets,
  workspace,
  onSubmit,
  onTargetChange
}: {
  actionId: QuickStartActionKind;
  defaultContainerTabId: string | null;
  disabled: boolean;
  error: string | null;
  selectedTargetId: string;
  success: string | null;
  targets: QuickAddTargetOption[];
  workspace: WorkspaceSummary | null;
  onSubmit: (values: QuickStartFormValues) => Promise<boolean>;
  onTargetChange: (targetContainerId: string) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setTitle("");
    setBody("");
  }, [actionId]);

  if (actionId === "task") {
    return (
      <QuickAddForm
        disabled={disabled || !isContentQuickStartAction(actionId)}
        error={error}
        selectedTargetId={selectedTargetId}
        success={success}
        targets={targets}
        onSubmit={(values) => {
          if (workspace === null) {
            return false;
          }

          return onSubmit({
            kind: "task",
            workspaceId: workspace.id,
            targetContainerId: values.targetContainerId,
            targetContainerTabId: defaultContainerTabId,
            title: values.title,
            dueDate: values.dueDate,
            ...(values.dueAt === undefined ? {} : { dueAt: values.dueAt }),
            ...(values.startAt === undefined ? {} : { startAt: values.startAt }),
            ...(values.allDay === undefined ? {} : { allDay: values.allDay }),
            ...(values.timezone === undefined ? {} : { timezone: values.timezone })
          });
        }}
        onTargetChange={onTargetChange}
      />
    );
  }

  if (actionId === "file") {
    return (
      <QuickStartSimpleForm
        body={body}
        bodyLabel=""
        disabled={disabled}
        error={error}
        kind={actionId}
        selectedTargetId={selectedTargetId}
        submitLabel="Choose file"
        success={success}
        targets={targets}
        title={title}
        titleLabel=""
        onBodyChange={setBody}
        onSubmit={() => {
          if (workspace === null) {
            return false;
          }

          return onSubmit({
            kind: "file",
            workspaceId: workspace.id,
            targetContainerId: selectedTargetId,
            targetContainerTabId: defaultContainerTabId
          });
        }}
        onTargetChange={onTargetChange}
        onTitleChange={setTitle}
      />
    );
  }

  const containerAction = actionId === "project" || actionId === "contact";

  return (
    <QuickStartSimpleForm
      body={body}
      bodyLabel={containerAction || actionId === "link" ? "Description" : "Content"}
      disabled={disabled}
      error={error}
      kind={actionId}
      selectedTargetId={selectedTargetId}
      submitLabel={getSubmitLabel(actionId)}
      success={success}
      targets={targets}
      title={title}
      titleLabel={actionId === "link" ? "Title (optional)" : getTitleLabel(actionId)}
      {...(actionId === "link" ? { urlLabel: "URL" } : {})}
      onBodyChange={setBody}
      onSubmit={(url) => {
        if (workspace === null) {
          return false;
        }

        if (actionId === "note") {
          return onSubmit({
            kind: "note",
            workspaceId: workspace.id,
            targetContainerId: selectedTargetId,
            targetContainerTabId: defaultContainerTabId,
            title,
            content: body
          });
        }

        if (actionId === "list") {
          return onSubmit({
            kind: "list",
            workspaceId: workspace.id,
            targetContainerId: selectedTargetId,
            targetContainerTabId: defaultContainerTabId,
            title
          });
        }

        if (actionId === "link") {
          return onSubmit({
            kind: "link",
            workspaceId: workspace.id,
            targetContainerId: selectedTargetId,
            targetContainerTabId: defaultContainerTabId,
            title,
            url,
            description: body
          });
        }

        if (actionId === "project") {
          return onSubmit({ kind: "project", workspaceId: workspace.id, name: title, description: body });
        }

        return onSubmit({ kind: "contact", workspaceId: workspace.id, name: title, description: body });
      }}
      onTargetChange={onTargetChange}
      onTitleChange={setTitle}
    />
  );
}

function QuickStartSimpleForm({
  body,
  bodyLabel,
  disabled,
  error,
  kind,
  selectedTargetId,
  submitLabel,
  success,
  targets,
  title,
  titleLabel,
  urlLabel,
  onBodyChange,
  onSubmit,
  onTargetChange,
  onTitleChange
}: {
  body: string;
  bodyLabel: string;
  disabled: boolean;
  error: string | null;
  kind: QuickStartActionKind;
  selectedTargetId: string;
  submitLabel: string;
  success: string | null;
  targets: QuickAddTargetOption[];
  title: string;
  titleLabel: string;
  urlLabel?: string;
  onBodyChange: (value: string) => void;
  onSubmit: (url: string) => Promise<boolean> | boolean;
  onTargetChange: (targetContainerId: string) => void;
  onTitleChange: (value: string) => void;
}): React.JSX.Element {
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const targetRequired = isContentQuickStartAction(kind);
  const disabledForm = disabled || (targetRequired && targets.length === 0);

  useEffect(() => {
    setUrl("");
    setFormError(null);
  }, [kind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (kind !== "file" && kind !== "link" && title.trim().length === 0) {
      setFormError(`${getTitleLabel(kind)} is required.`);
      return;
    }

    if (kind === "link" && url.trim().length === 0) {
      setFormError("URL is required.");
      return;
    }

    if (targetRequired && selectedTargetId.length === 0) {
      setFormError("Choose where to save this item.");
      return;
    }

    setFormError(null);
    const submitted = await onSubmit(url);

    if (submitted === false) {
      return;
    }

    setTitleAndBody("");
    setUrl("");
  }

  function setTitleAndBody(value: string): void {
    onTitleChange(value);
    onBodyChange(value);
  }

  return (
    <form
      aria-label={`Quick start ${kind}`}
      className="quick-add-form quick-start-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {titleLabel.length === 0 ? null : (
        <label>
          <span>{titleLabel}</span>
          <input
            autoFocus
            disabled={disabledForm}
            placeholder={titleLabel}
            value={title}
            onChange={(event) => onTitleChange(event.currentTarget.value)}
          />
        </label>
      )}

      {urlLabel === undefined ? null : (
        <label>
          <span>{urlLabel}</span>
          <input
            autoFocus
            disabled={disabledForm}
            placeholder="https://example.com"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
          />
        </label>
      )}

      {bodyLabel.length === 0 ? null : (
        <label>
          <span>{bodyLabel}</span>
          <textarea
            disabled={disabledForm}
            placeholder={bodyLabel}
            value={body}
            onChange={(event) => onBodyChange(event.currentTarget.value)}
          />
        </label>
      )}

      {!targetRequired ? null : (
        <label>
          <span>Save to</span>
          <select
            disabled={disabledForm}
            value={selectedTargetId}
            onChange={(event) => onTargetChange(event.currentTarget.value)}
          >
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button className="primary-button" disabled={disabledForm} type="submit">
        {submitLabel}
      </button>

      {formError === null && error === null && success === null ? null : (
        <p className={`form-message ${formError !== null || error !== null ? "form-message-error" : "form-message-ok"}`}>
          {formError ?? error ?? success}
        </p>
      )}
    </form>
  );
}

function normalizeQuickAddContext(
  context: QuickAddContext | undefined
): QuickStartContext | undefined {
  if (context === undefined) {
    return undefined;
  }

  if (context.containerId != null) {
    return context;
  }

  if (context.projectId != null) {
    return {
      containerId: context.projectId,
      containerType: "project",
      containerTabId: context.containerTabId ?? null
    };
  }

  if (context.contactId != null) {
    return {
      containerId: context.contactId,
      containerType: "contact",
      containerTabId: context.containerTabId ?? null
    };
  }

  return context;
}

function toQuickStartTarget(
  target: InboxSummary | ProjectSummary | ContactSummary
): QuickStartTarget {
  return {
    id: target.id,
    name: target.name,
    type: target.type,
    description: target.description,
    status: target.status,
    deletedAt: target.deletedAt
  };
}

function toQuickAddTarget(target: QuickStartTarget): QuickAddTargetOption {
  const option: QuickAddTargetOption = {
    id: target.id,
    name: target.name,
    type: target.type
  };

  if (target.description !== undefined) {
    option.description = target.description;
  }

  return option;
}

function getTitleLabel(kind: QuickStartActionKind): string {
  switch (kind) {
    case "note":
      return "Note title";
    case "list":
      return "List title";
    case "project":
      return "Project name";
    case "contact":
      return "Contact name";
    case "link":
      return "Title";
    case "file":
      return "File";
    case "task":
    default:
      return "Task title";
  }
}

function getSubmitLabel(kind: QuickStartActionKind): string {
  switch (kind) {
    case "note":
      return "Add note";
    case "list":
      return "Add list";
    case "file":
      return "Choose file";
    case "link":
      return "Add link";
    case "project":
      return "Add project";
    case "contact":
      return "Add contact";
    case "task":
    default:
      return "Add task";
  }
}

function getSuccessMessage(
  kind: QuickStartActionKind,
  result: QuickStartSavedResult
): string {
  if (kind === "file" && result === null) {
    return "No file selected.";
  }

  if (result === null) {
    return "Saved.";
  }

  if ("project" in result) {
    return `Saved "${result.project.name}".`;
  }

  if ("contact" in result) {
    return `Saved "${result.contact.name}".`;
  }

  const title =
    "item" in result
      ? result.item.title
      : "title" in result
        ? result.title
        : result.name;
  return `Saved "${title}".`;
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

function mapProjectCreateResult(
  result: ApiResult<{ project: ProjectSummary }>
): ApiResult<ProjectSummary> {
  if (!result.ok) {
    return result;
  }

  return apiOk(result.data.project);
}

function mapContactCreateResult(
  result: ApiResult<{ contact: ContactSummary }>
): ApiResult<ContactSummary> {
  if (!result.ok) {
    return result;
  }

  return apiOk(result.data.contact);
}

function notifyQuickStartSaved(
  kind: QuickStartFormValues["kind"],
  result: QuickStartSavedResult
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<QuickStartSavedEventDetail>(QUICK_START_SAVED_EVENT, {
      detail: { kind, result }
    })
  );
}

export function getQuickStartCreatedDestination(
  kind: QuickStartFormValues["kind"],
  result: QuickStartSavedResult
): string | null {
  if (result === null) {
    return null;
  }

  if (kind === "project") {
    const project = "project" in result ? result.project : (result as ProjectSummary);

    return `/projects/${encodeURIComponent(project.id)}`;
  }

  if (kind === "contact") {
    const contact = "contact" in result ? result.contact : (result as ContactSummary);

    return `/contacts/${encodeURIComponent(contact.id)}`;
  }

  return null;
}

export function getQuickStartSavedContainerId(
  result: QuickStartSavedResult
): string | null {
  if (result === null) {
    return null;
  }

  if ("item" in result) {
    return result.item.containerId;
  }

  if ("containerId" in result) {
    return result.containerId;
  }

  return null;
}
