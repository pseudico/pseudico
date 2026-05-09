import { useState } from "react";
import { X } from "lucide-react";
import {
  createInspectorTargetKey,
  type InspectorTarget
} from "@local-work-os/core";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";
import { getItemTypeLabel } from "./ItemTypeIcon";
import {
  RelatedItemsPanel,
  type RelatedItemViewModel
} from "./RelatedItemsPanel";
import { RecentActivityList } from "./RecentActivityList";
import { TagBadge, type TagBadgeViewModel } from "./TagBadge";

export type ItemInspectorItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  containerId?: string | null;
  containerTabId?: string | null;
  status?: string | null;
  sortOrder?: number | null;
  pinned?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  completedAt?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  tags?: readonly TagBadgeViewModel[] | undefined;
};

export type InspectorCategoryOption = CategoryBadgeViewModel & {
  id: string;
};

export type InspectorAttachmentViewModel = {
  id: string;
  title: string;
  description?: string | null;
  storagePath?: string | null;
};

export type InspectorCommentViewModel = {
  id: string;
  authorLabel?: string | null;
  body: string;
  createdAt: string;
};

export type InspectorTargetViewModel = InspectorTarget & {
  title: string;
  kind: string;
  body?: string | null | undefined;
  categoryId?: string | null | undefined;
  categoryLabel?: string | null | undefined;
  status?: string | null | undefined;
  sortOrder?: number | null | undefined;
  pinned?: boolean | undefined;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
  archivedAt?: string | null | undefined;
  deletedAt?: string | null | undefined;
  completedAt?: string | null | undefined;
  startAt?: string | null | undefined;
  dueAt?: string | null | undefined;
  parentId?: string | null | undefined;
  parentLabel?: string | null | undefined;
  containerId?: string | null | undefined;
  containerTabId?: string | null | undefined;
  tags?: readonly TagBadgeViewModel[] | undefined;
  attachments?: readonly InspectorAttachmentViewModel[] | undefined;
  comments?: readonly InspectorCommentViewModel[] | undefined;
};

export type ItemInspectorActivity = {
  id: string;
  action: string;
  actorType: string;
  actionLabel?: string;
  actorLabel?: string;
  targetLabel?: string;
  summary?: string | null;
  description?: string | null;
  createdAt: string;
};

export type InspectorTargetChangeHandler = (
  target: InspectorTarget
) => void;

export type InspectorCategoryChangeHandler = (
  target: InspectorTarget,
  categoryId: string | null
) => void | Promise<void>;

export type InspectorTagAddHandler = (
  target: InspectorTarget,
  name: string
) => void | Promise<void>;

export type InspectorTagRemoveHandler = (
  target: InspectorTarget,
  tag: TagBadgeViewModel
) => void | Promise<void>;

export type InspectorDateChangeHandler = (
  target: InspectorTarget,
  field: "startAt" | "dueAt",
  value: string
) => void | Promise<void>;

export type ItemInspectorProps = {
  activity: readonly ItemInspectorActivity[];
  open: boolean;
  onClose: () => void;
  item?: ItemInspectorItem;
  target?: InspectorTargetViewModel | null;
  availableTargets?: readonly InspectorTargetViewModel[];
  categories?: readonly InspectorCategoryOption[];
  relationships?: readonly RelatedItemViewModel[];
  invalidTargetMessage?: string | null;
  busy?: boolean;
  error?: string | null;
  onTargetChange?: InspectorTargetChangeHandler | undefined;
  onCategoryChange?: InspectorCategoryChangeHandler | undefined;
  onAddTag?: InspectorTagAddHandler | undefined;
  onRemoveTag?: InspectorTagRemoveHandler | undefined;
  onDateChange?: InspectorDateChangeHandler | undefined;
};

export function ItemInspectorPanel({
  activity,
  availableTargets = [],
  busy = false,
  categories = [],
  error = null,
  invalidTargetMessage = null,
  item,
  relationships = [],
  open,
  target,
  onAddTag,
  onCategoryChange,
  onClose,
  onDateChange,
  onRemoveTag,
  onTargetChange
}: ItemInspectorProps): React.JSX.Element {
  const resolvedTarget = target ?? (item === undefined ? null : itemToTarget(item));

  return (
    <aside
      aria-label="Object inspector"
      aria-live="polite"
      className="item-inspector-panel project-dialog"
      data-inspector-state={resolvedTarget === null ? "empty" : "loaded"}
      hidden={!open}
    >
      <div className="project-dialog-header">
        <div>
          <p className="top-eyebrow">Inspector</p>
          <h3>{resolvedTarget?.title ?? "No object selected"}</h3>
        </div>
        <button
          aria-label="Close inspector"
          className="secondary-button compact-button"
          type="button"
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </div>

      {invalidTargetMessage === null ? null : (
        <p className="form-message form-message-error">{invalidTargetMessage}</p>
      )}

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      {resolvedTarget === null ? (
        <InspectorEmptyState />
      ) : (
        <>
          <TargetSwitcher
            availableTargets={availableTargets}
            currentTarget={resolvedTarget}
            onTargetChange={onTargetChange}
          />
          <InspectorDetailsSection target={resolvedTarget} />
          <InspectorDatesSection
            busy={busy}
            target={resolvedTarget}
            onDateChange={onDateChange}
          />
          <InspectorTagsSection
            busy={busy}
            target={resolvedTarget}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />
          <InspectorCategorySection
            busy={busy}
            categories={categories}
            target={resolvedTarget}
            onCategoryChange={onCategoryChange}
          />
          <InspectorRelationshipsSection relationships={relationships} />
          <InspectorAttachmentsSection attachments={resolvedTarget.attachments} />
          <InspectorCommentsSection comments={resolvedTarget.comments} />
          <RecentActivityList activity={activity} />
        </>
      )}
    </aside>
  );
}

function TargetSwitcher({
  availableTargets,
  currentTarget,
  onTargetChange
}: {
  availableTargets: readonly InspectorTargetViewModel[];
  currentTarget: InspectorTargetViewModel;
  onTargetChange?: InspectorTargetChangeHandler | undefined;
}): React.JSX.Element | null {
  if (availableTargets.length <= 1 || onTargetChange === undefined) {
    return null;
  }

  return (
    <label className="inspector-field">
      <span>Inspect object</span>
      <select
        value={createInspectorTargetKey(currentTarget)}
        onChange={(event) => {
          const next = availableTargets.find(
            (candidate) => createInspectorTargetKey(candidate) === event.target.value
          );

          if (next !== undefined) {
            onTargetChange({ id: next.id, type: next.type });
          }
        }}
      >
        {availableTargets.map((candidate) => (
          <option key={createInspectorTargetKey(candidate)} value={createInspectorTargetKey(candidate)}>
            {formatTargetType(candidate)}: {candidate.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function InspectorEmptyState(): React.JSX.Element {
  return (
    <div className="inspector-empty-state">
      <h4>No target selected</h4>
      <p>Select a project, item, or list row to inspect its local details.</p>
    </div>
  );
}

function InspectorDetailsSection({
  target
}: {
  target: InspectorTargetViewModel;
}): React.JSX.Element {
  return (
    <section className="inspector-section" aria-label="Details">
      <h4>Details</h4>
      <dl className="item-inspector-metadata">
        {buildInspectorMetadata(target).map((entry) => (
          <div key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
      {target.body === undefined || target.body === null || target.body.trim().length === 0 ? null : (
        <p className="inspector-body">{target.body}</p>
      )}
    </section>
  );
}

function InspectorDatesSection({
  busy,
  target,
  onDateChange
}: {
  busy: boolean;
  target: InspectorTargetViewModel;
  onDateChange?: InspectorDateChangeHandler | undefined;
}): React.JSX.Element {
  const canEditDates = target.type !== "container" && onDateChange !== undefined;

  return (
    <section className="inspector-section" aria-label="Dates">
      <h4>Dates</h4>
      <div className="inspector-inline-grid">
        <label className="inspector-field">
          <span>Start</span>
          <input
            disabled={!canEditDates || busy}
            type="date"
            value={toDateInputValue(target.startAt)}
            onChange={(event) =>
              onDateChange?.(
                { id: target.id, type: target.type },
                "startAt",
                event.target.value
              )
            }
          />
        </label>
        <label className="inspector-field">
          <span>Due</span>
          <input
            disabled={!canEditDates || busy}
            type="date"
            value={toDateInputValue(target.dueAt)}
            onChange={(event) =>
              onDateChange?.(
                { id: target.id, type: target.type },
                "dueAt",
                event.target.value
              )
            }
          />
        </label>
      </div>
      {canEditDates ? null : (
        <p className="muted-text">Date editing is available for tasks and list rows.</p>
      )}
    </section>
  );
}

function InspectorTagsSection({
  busy,
  target,
  onAddTag,
  onRemoveTag
}: {
  busy: boolean;
  target: InspectorTargetViewModel;
  onAddTag?: InspectorTagAddHandler | undefined;
  onRemoveTag?: InspectorTagRemoveHandler | undefined;
}): React.JSX.Element {
  const [tagName, setTagName] = useState("");
  const tags = target.tags ?? [];

  return (
    <section className="inspector-section" aria-label="Tags">
      <h4>Tags</h4>
      {tags.length === 0 ? (
        <p className="muted-text">No tags assigned.</p>
      ) : (
        <div className="inspector-tag-list">
          {tags.map((tag) => (
            <span className="inspector-tag-row" key={tag.id ?? tag.slug}>
              <TagBadge tag={tag} />
              {onRemoveTag === undefined ? null : (
                <button
                  className="secondary-button compact-button"
                  disabled={busy}
                  type="button"
                  onClick={() => void onRemoveTag({ id: target.id, type: target.type }, tag)}
                >
                  Remove
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {onAddTag === undefined ? null : (
        <form
          className="inspector-tag-form"
          onSubmit={(event) => {
            event.preventDefault();
            const nextTagName = tagName.trim();

            if (nextTagName.length === 0) {
              return;
            }

            void Promise.resolve(
              onAddTag({ id: target.id, type: target.type }, nextTagName)
            ).then(() => setTagName(""));
          }}
        >
          <label className="inspector-field">
            <span>Add tag</span>
            <input
              disabled={busy}
              placeholder="e.g. follow-up"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
            />
          </label>
          <button
            className="secondary-button compact-button"
            disabled={busy || tagName.trim().length === 0}
            type="submit"
          >
            Add
          </button>
        </form>
      )}
    </section>
  );
}

function InspectorCategorySection({
  busy,
  categories,
  target,
  onCategoryChange
}: {
  busy: boolean;
  categories: readonly InspectorCategoryOption[];
  target: InspectorTargetViewModel;
  onCategoryChange?: InspectorCategoryChangeHandler | undefined;
}): React.JSX.Element {
  const currentCategory =
    categories.find((category) => category.id === target.categoryId) ??
    (target.categoryLabel === undefined || target.categoryLabel === null
      ? null
      : {
          id: target.categoryId ?? target.categoryLabel,
          name: target.categoryLabel,
          color: "#6d6a62"
        });

  return (
    <section className="inspector-section" aria-label="Category">
      <h4>Category</h4>
      <CategoryBadge category={currentCategory} />
      {onCategoryChange === undefined ? null : (
        <label className="inspector-field">
          <span>Change category</span>
          <select
            disabled={busy}
            value={target.categoryId ?? ""}
            onChange={(event) =>
              void onCategoryChange(
                { id: target.id, type: target.type },
                event.target.value.length === 0 ? null : event.target.value
              )
            }
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}

function InspectorRelationshipsSection({
  relationships
}: {
  relationships: readonly RelatedItemViewModel[];
}): React.JSX.Element {
  return (
    <section className="inspector-section" aria-label="Relationships">
      <RelatedItemsPanel relationships={relationships} />
    </section>
  );
}

function InspectorAttachmentsSection({
  attachments = []
}: {
  attachments?: readonly InspectorAttachmentViewModel[] | undefined;
}): React.JSX.Element {
  return (
    <section className="inspector-section" aria-label="Attachments">
      <h4>Attachments</h4>
      {attachments.length === 0 ? (
        <p className="muted-text">No attachments linked to this object.</p>
      ) : (
        <ul className="inspector-simple-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <strong>{attachment.title}</strong>
              {attachment.description === undefined || attachment.description === null ? null : (
                <span>{attachment.description}</span>
              )}
              {attachment.storagePath === undefined || attachment.storagePath === null ? null : (
                <code>{attachment.storagePath}</code>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InspectorCommentsSection({
  comments = []
}: {
  comments?: readonly InspectorCommentViewModel[] | undefined;
}): React.JSX.Element {
  return (
    <section className="inspector-section" aria-label="Comments">
      <h4>Comments</h4>
      {comments.length === 0 ? (
        <p className="muted-text">No comments recorded yet.</p>
      ) : (
        <ul className="inspector-simple-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.authorLabel ?? "Local user"}</strong>
              <span>{comment.body}</span>
              <time dateTime={comment.createdAt}>{comment.createdAt}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function itemToTarget(item: ItemInspectorItem): InspectorTargetViewModel {
  return {
    id: item.id,
    type: "item",
    kind: item.type,
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    categoryLabel: item.categoryLabel,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt,
    completedAt: item.completedAt,
    startAt: item.startAt,
    dueAt: item.dueAt,
    tags: item.tags
  };
}

function buildInspectorMetadata(
  target: InspectorTargetViewModel
): Array<{ label: string; value: string }> {
  const metadata: Array<{ label: string; value: string }> = [
    { label: "Target", value: formatTargetType(target) },
    {
      label: "Type",
      value: target.type === "item" ? getItemTypeLabel(target.kind) : target.kind
    },
    { label: "Status", value: target.status ?? "Not set" },
    { label: "Container", value: target.containerId ?? "Not set" },
    { label: "Tab", value: target.containerTabId ?? "None" },
    { label: "Parent", value: target.parentLabel ?? target.parentId ?? "None" },
    { label: "Category", value: target.categoryLabel ?? "Not assigned" },
    { label: "Sort order", value: String(target.sortOrder ?? 0) },
    { label: "Pinned", value: target.pinned === true ? "Yes" : "No" },
    { label: "Created", value: target.createdAt ?? "Unknown" },
    { label: "Updated", value: target.updatedAt ?? "Unknown" }
  ];

  appendOptionalMetadata(metadata, "Completed", target.completedAt);
  appendOptionalMetadata(metadata, "Archived", target.archivedAt);
  appendOptionalMetadata(metadata, "Deleted", target.deletedAt);

  return metadata;
}

function appendOptionalMetadata(
  metadata: Array<{ label: string; value: string }>,
  label: string,
  value: string | null | undefined
): void {
  if (value !== undefined && value !== null) {
    metadata.push({ label, value });
  }
}

function formatTargetType(target: InspectorTarget): string {
  switch (target.type) {
    case "container":
      return "Container";
    case "item":
      return "Item";
    case "list_item":
      return "List row";
  }
}

function toDateInputValue(value: string | null | undefined): string {
  if (value === undefined || value === null || value.length === 0) {
    return "";
  }

  return value.slice(0, 10);
}
