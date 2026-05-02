import { Inbox, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ItemFeed,
  MoveToContainerDialog,
  type ItemActionId,
  type MoveTargetContainer,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  ItemSummary,
  LocalWorkOsApi,
  ProjectSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type InboxPageProps = {
  apiClient?: LocalWorkOsApi;
  initialItems?: ItemSummary[];
  initialProjects?: ProjectSummary[];
};

export function InboxPage({
  apiClient = desktopApiClient,
  initialItems = [],
  initialProjects = []
}: InboxPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [items, setItems] = useState<ItemSummary[]>(initialItems);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<ItemSummary | null>(null);
  const projectTargets = useMemo(
    () =>
      projects
        .filter((project) => project.status === "active")
        .map(toMoveTarget),
    [projects]
  );

  async function loadInbox(workspaceId: string): Promise<void> {
    setLoading(true);
    setError(null);

    const [itemsResult, projectsResult] = await Promise.all([
      apiClient.inbox.listItems(workspaceId),
      apiClient.projects.list(workspaceId)
    ]);

    setLoading(false);

    if (!itemsResult.ok) {
      setError(itemsResult.error.message);
      return;
    }

    if (!projectsResult.ok) {
      setError(projectsResult.error.message);
      return;
    }

    setItems(itemsResult.data);
    setProjects(projectsResult.data);
  }

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadActiveInbox(): Promise<void> {
      setLoading(true);
      setError(null);

      const [itemsResult, projectsResult] = await Promise.all([
        apiClient.inbox.listItems(workspaceId),
        apiClient.projects.list(workspaceId)
      ]);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!itemsResult.ok) {
        setError(itemsResult.error.message);
        return;
      }

      if (!projectsResult.ok) {
        setError(projectsResult.error.message);
        return;
      }

      setItems(itemsResult.data);
      setProjects(projectsResult.data);
    }

    void loadActiveInbox();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  function handleItemAction(action: ItemActionId, itemId: string): void {
    if (action !== "move") {
      return;
    }

    setMoveError(null);
    setMovingItem(items.find((item) => item.id === itemId) ?? null);
  }

  async function moveItemToProject(projectId: string): Promise<void> {
    if (movingItem === null) {
      return;
    }

    setMoving(true);
    setMoveError(null);

    const result = await apiClient.inbox.moveItemToProject({
      itemId: movingItem.id,
      projectId
    });

    setMoving(false);

    if (!result.ok) {
      setMoveError(result.error.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== movingItem.id));
    setMovingItem(null);
  }

  if (currentWorkspace === null) {
    return (
      <section className="inbox-page">
        <div className="page-heading">
          <p className="top-eyebrow">Capture</p>
          <h2>Inbox</h2>
          <p>Open or create a local workspace before triaging captured work.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="inbox-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Capture</p>
          <h2>Inbox</h2>
          <p>Captured tasks, notes, links, and files waiting for context.</p>
        </div>
        <button
          className="secondary-button"
          disabled={loading}
          type="button"
          onClick={() => void loadInbox(currentWorkspace.id)}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="inbox-content-section" aria-label="Inbox content">
        <div className="panel-heading">
          <Inbox size={17} aria-hidden="true" />
          <h3>Triage queue</h3>
        </div>
        <ItemFeed
          ariaLabel="Inbox items"
          disabledActions={["edit", "archive", "delete", "inspect"]}
          emptyDescription="Captured work will appear here before it is moved into a project."
          emptyTitle="Inbox is clear"
          error={error}
          items={items.map(toItemViewModel)}
          loading={loading}
          onAction={handleItemAction}
        />
      </section>

      <MoveToContainerDialog
        containers={projectTargets}
        error={moveError}
        itemTitle={movingItem === null ? null : movingItem.title}
        moving={moving}
        open={movingItem !== null}
        onCancel={() => {
          if (!moving) {
            setMovingItem(null);
            setMoveError(null);
          }
        }}
        onMove={moveItemToProject}
      />
    </section>
  );
}

function toItemViewModel(item: ItemSummary): UniversalItemViewModel {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    status: item.status,
    categoryLabel: item.categoryId,
    updatedLabel: item.updatedAt,
    pinned: item.pinned
  };
}

function toMoveTarget(project: ProjectSummary): MoveTargetContainer {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color
  };
}
