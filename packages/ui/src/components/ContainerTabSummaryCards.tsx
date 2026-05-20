import { formatAustralianDate } from "../dateFormat";
import { FileText, ListChecks, Paperclip, StickyNote } from "lucide-react";

export type TabSummaryPreviewViewModel = {
  itemId: string;
  type: string;
  title: string;
  status: string;
  preview: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  kind: "open_task" | "recent_content";
};

export type ContainerTabSummaryCardViewModel = {
  tabId: string;
  name: string;
  isDefault: boolean;
  totalItemCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  upcomingTaskCount: number;
  noteCount: number;
  fileCount: number;
  linkCount: number;
  listCount: number;
  openTaskPreviews: readonly TabSummaryPreviewViewModel[];
  recentContentPreviews: readonly TabSummaryPreviewViewModel[];
};

export type ContainerTabSummaryCardsProps = {
  activeTabId: string | null;
  busy?: boolean;
  summaries: readonly ContainerTabSummaryCardViewModel[];
  onOpenItem?: (itemId: string, tabId: string) => void;
  onSelectTab: (tabId: string) => void;
};

export function ContainerTabSummaryCards({
  activeTabId,
  busy = false,
  summaries,
  onOpenItem,
  onSelectTab
}: ContainerTabSummaryCardsProps): React.JSX.Element {
  if (summaries.length === 0) {
    return (
      <section className="tab-summary-cards" aria-label="Tab previews">
        <p className="muted-text">No content tabs are available yet.</p>
      </section>
    );
  }

  return (
    <section className="tab-summary-cards" aria-label="Tab previews">
      <div className="panel-heading">
        <FileText size={17} aria-hidden="true" />
        <h3>Tab previews</h3>
      </div>
      <div className="tab-summary-card-grid">
        {summaries.map((summary) => {
          const selected = activeTabId === summary.tabId;
          const urgentCount = summary.overdueTaskCount;
          const previewItems = [
            ...summary.openTaskPreviews,
            ...summary.recentContentPreviews
          ].slice(0, 5);

          return (
            <article
              className={selected ? "tab-summary-card is-active" : "tab-summary-card"}
              key={summary.tabId}
            >
              <button
                className="tab-summary-card-open"
                disabled={busy}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectTab(summary.tabId)}
              >
                <span>
                  {summary.name}
                  {summary.isDefault ? <small>Main</small> : null}
                </span>
                <strong>{summary.totalItemCount}</strong>
              </button>

              <dl className="tab-summary-counts">
                <div className={urgentCount > 0 ? "is-attention" : undefined}>
                  <dt>Overdue</dt>
                  <dd>{summary.overdueTaskCount}</dd>
                </div>
                <div>
                  <dt>Open</dt>
                  <dd>{summary.openTaskCount}</dd>
                </div>
                <div>
                  <dt>Upcoming</dt>
                  <dd>{summary.upcomingTaskCount}</dd>
                </div>
                <div>
                  <dt>Done</dt>
                  <dd>{summary.completedTaskCount}</dd>
                </div>
              </dl>

              <div className="tab-summary-type-row" aria-label={`${summary.name} content counts`}>
                <span><StickyNote size={14} aria-hidden="true" />{summary.noteCount}</span>
                <span><Paperclip size={14} aria-hidden="true" />{summary.fileCount}</span>
                <span><ListChecks size={14} aria-hidden="true" />{summary.listCount}</span>
                <span>Links {summary.linkCount}</span>
              </div>

              {previewItems.length === 0 ? (
                <p className="muted-text">No previewable items yet.</p>
              ) : (
                <ol className="tab-summary-preview-list">
                  {previewItems.map((item) => (
                    <li key={`${item.kind}-${item.itemId}`}>
                      <button
                        className="tab-summary-preview-button"
                        disabled={busy}
                        type="button"
                        onClick={() => {
                          onSelectTab(summary.tabId);
                          onOpenItem?.(item.itemId, summary.tabId);
                        }}
                      >
                        <span>
                          {item.kind === "open_task" ? "Task" : getItemLabel(item.type)}
                          {item.dueAt === null ? null : ` - ${formatAustralianDate(item.dueAt)}`}
                        </span>
                        <strong>{item.title}</strong>
                        {item.preview === null || item.preview.trim().length === 0 ? null : (
                          <small>{item.preview}</small>
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getItemLabel(type: string): string {
  switch (type) {
    case "note":
      return "Note";
    case "file":
      return "File";
    case "link":
      return "Link";
    case "list":
      return "List";
    default:
      return "Item";
  }
}
