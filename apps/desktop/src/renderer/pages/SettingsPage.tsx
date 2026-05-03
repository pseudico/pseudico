import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CategoryBadge } from "@local-work-os/ui";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";
import type { CategorySummary, LocalWorkOsApi } from "../../preload/api";

type SettingsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCategories?: CategorySummary[];
};

const defaultCategoryColor = "#2c6b8f";

export function SettingsPage({
  apiClient = desktopApiClient,
  initialCategories = []
}: SettingsPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultCategoryColor);
  const [description, setDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshCurrentWorkspace(apiClient);
  }, [apiClient]);

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;

    async function loadCategories(): Promise<void> {
      setError(null);
      const result = await apiClient.categories.list(currentWorkspace!.id);

      if (!active) {
        return;
      }

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setCategories(result.data);
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  async function createCategory(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (currentWorkspace === null) {
      setError("Open a workspace before creating categories.");
      return;
    }

    if (name.trim().length === 0) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await apiClient.categories.create({
      workspaceId: currentWorkspace.id,
      name,
      color,
      description: description.length === 0 ? null : description
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) => [...current, result.data].sort(compareCategories));
    setName("");
    setDescription("");
    setColor(defaultCategoryColor);
  }

  async function updateCategory(
    category: CategorySummary,
    patch: Partial<Pick<CategorySummary, "color" | "description" | "name">>
  ): Promise<void> {
    setBusyId(category.id);
    setError(null);

    const result = await apiClient.categories.update({
      categoryId: category.id,
      ...patch
    });

    setBusyId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) =>
      current
        .map((candidate) =>
          candidate.id === result.data.id ? result.data : candidate
        )
        .sort(compareCategories)
    );
  }

  async function deleteCategory(categoryId: string): Promise<void> {
    setBusyId(categoryId);
    setError(null);

    const result = await apiClient.categories.delete(categoryId);

    setBusyId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId)
    );
  }

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
      <section className="category-management-panel" aria-label="Categories">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Categories</h3>
          </div>
        </div>

        {error === null ? null : (
          <p className="form-message form-message-error">{error}</p>
        )}

        <form className="category-form" onSubmit={createCategory}>
          <label>
            <span>Name</span>
            <input
              disabled={saving || currentWorkspace === null}
              placeholder="Client, Finance, Research"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>Color</span>
            <input
              disabled={saving || currentWorkspace === null}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label>
            <span>Description</span>
            <input
              disabled={saving || currentWorkspace === null}
              placeholder="Optional local classification note"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            disabled={saving || currentWorkspace === null}
            type="submit"
          >
            <Plus size={17} aria-hidden="true" />
            Add
          </button>
        </form>

        <div className="category-list" aria-label="Category list">
          {categories.length === 0 ? (
            <p className="muted-text">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <CategoryListRow
                key={category.id}
                busy={busyId === category.id}
                category={category}
                onDelete={deleteCategory}
                onUpdate={updateCategory}
              />
            ))
          )}
        </div>
      </section>
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

function CategoryListRow({
  busy,
  category,
  onDelete,
  onUpdate
}: {
  busy: boolean;
  category: CategorySummary;
  onDelete: (categoryId: string) => Promise<void>;
  onUpdate: (
    category: CategorySummary,
    patch: Partial<Pick<CategorySummary, "color" | "description" | "name">>
  ) => Promise<void>;
}): React.JSX.Element {
  return (
    <div className="category-list-row">
      <div className="category-list-main">
        <CategoryBadge category={category} />
        <span>{category.description ?? "No description"}</span>
      </div>
      <input
        aria-label={`Rename ${category.name}`}
        defaultValue={category.name}
        disabled={busy}
        onBlur={(event) => {
          if (event.target.value !== category.name) {
            void onUpdate(category, { name: event.target.value });
          }
        }}
      />
      <div className="top-actions">
        <input
          aria-label={`Color for ${category.name}`}
          disabled={busy}
          type="color"
          value={category.color}
          onChange={(event) =>
            void onUpdate(category, { color: event.target.value })
          }
        />
        <button
          className="secondary-button compact-button"
          disabled={busy}
          type="button"
          onClick={() => void onDelete(category.id)}
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>
  );
}

function compareCategories(left: CategorySummary, right: CategorySummary): number {
  return left.name.localeCompare(right.name);
}
