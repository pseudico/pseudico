import type { CSSProperties, ReactNode } from "react";
import { Search } from "lucide-react";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";

export type SpaceBudgetSurface =
  | "command"
  | "capture"
  | "inspector"
  | "mixed-feed"
  | "readable-row"
  | "timeline";

export type SpaceBudgetMode = "full" | "collapse-secondary" | "drawer";

export const spaceBudgetTokens = {
  commandMinWidthPx: 420,
  commandPreferredWidthPx: 640,
  quickAddTaskMinWidthPx: 520,
  quickCaptureMinHeightPx: 140,
  readableRowMinWidthPx: 360,
  readableRowMinHeightPx: 72,
  mixedFeedMinWidthPx: 560,
  mixedFeedMinHeightPx: 86,
  inspectorMinWidthPx: 320,
  inspectorBodyMinHeightPx: 160,
  timelineLabelMinWidthPx: 300,
  timelineLabelPreferredWidthPx: 330,
  timelineDayMinWidthPx: 52,
  timelineBarTitleThresholdPx: 220
} as const;

export function getSpaceBudgetMode(widthPx: number): SpaceBudgetMode {
  if (widthPx >= 1180) {
    return "full";
  }

  if (widthPx >= 900) {
    return "collapse-secondary";
  }

  return "drawer";
}

export function joinSpaceBudgetClassName(
  baseClassName: string,
  className?: string
): string {
  return className === undefined || className.trim().length === 0
    ? baseClassName
    : `${baseClassName} ${className}`;
}

export type SpaceBudgetMetadataEntry = {
  label: string;
  value: string;
};

export type ReadableWorkRowProps = {
  title: string;
  body?: string | null;
  kind?: string;
  metadata?: readonly SpaceBudgetMetadataEntry[];
  leading?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  className?: string;
};

export function ReadableWorkRow({
  actions,
  body = null,
  className,
  kind = "task",
  leading,
  metadata = [],
  selected = false,
  title
}: ReadableWorkRowProps): React.JSX.Element {
  return (
    <article
      className={joinSpaceBudgetClassName("space-budget-readable-row", className)}
      data-selected={selected ? "true" : "false"}
      data-space-budget-surface="readable-row"
      data-space-budget-min-height={`${spaceBudgetTokens.readableRowMinHeightPx}px`}
      data-space-budget-min-width={`${spaceBudgetTokens.readableRowMinWidthPx}px`}
    >
      {leading === undefined ? null : (
        <div className="space-budget-row-leading">{leading}</div>
      )}
      <div className="space-budget-row-main">
        <div className="space-budget-row-heading">
          <span className="item-type-badge">
            <ItemTypeIcon itemType={kind} />
            <span>{formatSpaceBudgetKind(kind)}</span>
          </span>
          <strong className="space-budget-primary-text">{title}</strong>
        </div>
        {body === null || body.trim().length === 0 ? null : (
          <p className="space-budget-secondary-text">{body}</p>
        )}
        {metadata.length === 0 ? null : (
          <dl className="space-budget-metadata-list">
            {metadata.map((entry) => (
              <div key={`${entry.label}:${entry.value}`}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="space-budget-row-actions">{actions}</div>
      )}
    </article>
  );
}

export type CommandSearchInputProps = {
  label: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  description?: string;
  minWidth?: "minimum" | "preferred";
  disabled?: boolean;
  action?: ReactNode;
  className?: string;
  onChange?: (value: string) => void;
};

export function CommandSearchInput({
  action,
  className,
  defaultValue,
  description,
  disabled = false,
  label,
  minWidth = "preferred",
  onChange,
  placeholder = "Search, command, or capture intent",
  value
}: CommandSearchInputProps): React.JSX.Element {
  return (
    <label
      className={joinSpaceBudgetClassName("space-budget-command-input", className)}
      data-space-budget-min-width={
        minWidth === "minimum"
          ? `${spaceBudgetTokens.commandMinWidthPx}px`
          : `${spaceBudgetTokens.commandPreferredWidthPx}px`
      }
      data-space-budget-surface="command"
    >
      <span>{label}</span>
      {description === undefined ? null : <small>{description}</small>}
      <span className="space-budget-command-control">
        <Search size={18} aria-hidden="true" />
        <input
          {...(value === undefined ? { defaultValue } : { value })}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.currentTarget.value)}
        />
        {action}
      </span>
    </label>
  );
}

export type MultilineCapturePanelProps = {
  label: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  parseFeedback?: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
};

export function MultilineCapturePanel({
  actions,
  className,
  defaultValue,
  disabled = false,
  label,
  onChange,
  parseFeedback,
  placeholder = "Capture the full task, note, link, file reminder, or next action.",
  value
}: MultilineCapturePanelProps): React.JSX.Element {
  return (
    <section
      className={joinSpaceBudgetClassName("space-budget-capture-panel", className)}
      data-space-budget-min-height={`${spaceBudgetTokens.quickCaptureMinHeightPx}px`}
      data-space-budget-min-width={`${spaceBudgetTokens.quickAddTaskMinWidthPx}px`}
      data-space-budget-surface="capture"
    >
      <label>
        <span>{label}</span>
        <textarea
          {...(value === undefined ? { defaultValue } : { value })}
          disabled={disabled}
          placeholder={placeholder}
          rows={5}
          onChange={(event) => onChange?.(event.currentTarget.value)}
        />
      </label>
      {parseFeedback === undefined ? null : (
        <div className="space-budget-capture-feedback">{parseFeedback}</div>
      )}
      {actions === undefined ? null : (
        <div className="space-budget-capture-actions">{actions}</div>
      )}
    </section>
  );
}

export type SpaceBudgetInspectorProps = {
  title: string;
  body?: string | null;
  eyebrow?: string;
  metadata?: readonly SpaceBudgetMetadataEntry[];
  actions?: ReactNode;
  empty?: boolean;
  className?: string;
};

export function SpaceBudgetInspector({
  actions,
  body = null,
  className,
  empty = false,
  eyebrow = "Inspector",
  metadata = [],
  title
}: SpaceBudgetInspectorProps): React.JSX.Element {
  return (
    <aside
      className={joinSpaceBudgetClassName("space-budget-inspector", className)}
      data-empty={empty ? "true" : "false"}
      data-space-budget-min-width={`${spaceBudgetTokens.inspectorMinWidthPx}px`}
      data-space-budget-surface="inspector"
    >
      <header>
        <p className="top-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </header>
      {body === null || body.trim().length === 0 ? null : (
        <p className="space-budget-inspector-body">{body}</p>
      )}
      {metadata.length === 0 ? null : (
        <dl className="space-budget-metadata-list">
          {metadata.map((entry) => (
            <div key={`${entry.label}:${entry.value}`}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions === undefined ? null : (
        <div className="space-budget-inspector-actions">{actions}</div>
      )}
    </aside>
  );
}

export type MixedFeedItemProps = {
  itemType: "task" | "list" | "note" | "file" | "link" | "location" | string;
  title: string;
  preview?: string | null;
  metadata?: readonly SpaceBudgetMetadataEntry[];
  actions?: ReactNode;
  selected?: boolean;
  className?: string;
};

export function MixedFeedItem({
  actions,
  className,
  itemType,
  metadata = [],
  preview = null,
  selected = false,
  title
}: MixedFeedItemProps): React.JSX.Element {
  return (
    <article
      className={joinSpaceBudgetClassName("space-budget-mixed-feed-item", className)}
      data-selected={selected ? "true" : "false"}
      data-space-budget-min-height={`${spaceBudgetTokens.mixedFeedMinHeightPx}px`}
      data-space-budget-min-width={`${spaceBudgetTokens.mixedFeedMinWidthPx}px`}
      data-space-budget-surface="mixed-feed"
      data-space-budget-type={itemType}
    >
      <div className="space-budget-mixed-type">
        <ItemTypeIcon itemType={itemType} />
        <span>{formatSpaceBudgetKind(itemType)}</span>
      </div>
      <div className="space-budget-row-main">
        <strong className="space-budget-primary-text">{title}</strong>
        {preview === null || preview.trim().length === 0 ? null : (
          <p className="space-budget-secondary-text">{preview}</p>
        )}
        {metadata.length === 0 ? null : (
          <dl className="space-budget-metadata-list">
            {metadata.map((entry) => (
              <div key={`${entry.label}:${entry.value}`}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="space-budget-row-actions">{actions}</div>
      )}
    </article>
  );
}

export type TimelineSpaceRowProps = {
  title: string;
  meta: string;
  dateLabel: string;
  statusLabel: string;
  offsetPercent?: number;
  widthPercent?: number;
  color?: string;
  className?: string;
};

export function TimelineSpaceRow({
  className,
  color = "var(--accent)",
  dateLabel,
  meta,
  offsetPercent = 0,
  statusLabel,
  title,
  widthPercent = 18
}: TimelineSpaceRowProps): React.JSX.Element {
  return (
    <div
      className={joinSpaceBudgetClassName("space-budget-timeline-row", className)}
      data-space-budget-label-width={`${spaceBudgetTokens.timelineLabelPreferredWidthPx}px`}
      data-space-budget-surface="timeline"
      style={{
        "--space-budget-bar-left": `${offsetPercent}%`,
        "--space-budget-bar-width": `${widthPercent}%`,
        "--space-budget-bar-color": color
      } as CSSProperties}
    >
      <div className="space-budget-timeline-label">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="space-budget-timeline-grid">
        <span className="space-budget-timeline-bar">
          <span>{dateLabel}</span>
          <span>{statusLabel}</span>
        </span>
      </div>
    </div>
  );
}

export type SpaceBudgetResponsiveFrameProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  inspector?: ReactNode;
  mode?: SpaceBudgetMode;
  className?: string;
};

export function SpaceBudgetResponsiveFrame({
  className,
  inspector,
  mode = "full",
  primary,
  secondary
}: SpaceBudgetResponsiveFrameProps): React.JSX.Element {
  return (
    <section
      className={joinSpaceBudgetClassName("space-budget-responsive-frame", className)}
      data-space-budget-mode={mode}
    >
      {secondary === undefined ? null : (
        <div className="space-budget-secondary-panel">{secondary}</div>
      )}
      <div className="space-budget-primary-panel">{primary}</div>
      {inspector === undefined ? null : (
        <div className="space-budget-inspector-panel">{inspector}</div>
      )}
    </section>
  );
}

function formatSpaceBudgetKind(kind: string): string {
  if (kind === "list") {
    return "Checklist";
  }

  return getItemTypeLabel(kind);
}
