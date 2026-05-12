import { DashboardWidget } from "../DashboardWidget";

export type MiniTimelineWidgetGroup = {
  key: string;
  label: string;
  itemCount: number;
  completedCount: number;
  color: string | null;
};

export type MiniTimelineWidgetProps = {
  range: { startInclusive: string; endExclusive: string };
  itemCount: number;
  activeCount: number;
  groups: MiniTimelineWidgetGroup[];
  loading?: boolean;
};

export function MiniTimelineWidget({
  range,
  itemCount,
  activeCount,
  groups,
  loading = false
}: MiniTimelineWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      kind="timeline"
      title="Mini Timeline"
      description={`${formatDate(range.startInclusive)} - ${formatDate(range.endExclusive)}`}
      count={itemCount}
      loading={loading}
      emptyTitle="No timeline work"
      emptyDescription="Dated tasks and list items in the planning window will appear here."
    >
      <div className="mini-timeline-summary">
        <strong>{activeCount}</strong> active item{activeCount === 1 ? "" : "s"}
      </div>
      <ol className="mini-timeline-list">
        {groups.map((group) => (
          <li key={group.key}>
            <span className="timeline-color-dot" style={{ backgroundColor: group.color ?? "var(--accent-muted)" }} />
            <span>{group.label}</span>
            <strong>{group.itemCount}</strong>
          </li>
        ))}
      </ol>
    </DashboardWidget>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
