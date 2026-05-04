import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Clock3,
  Star,
  type LucideIcon
} from "lucide-react";

export type DashboardWidgetKind =
  | "today"
  | "overdue"
  | "upcoming"
  | "favorites"
  | "recent_activity";

export type DashboardWidgetProps = {
  title: string;
  description?: string;
  kind: DashboardWidgetKind;
  count?: number;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: React.ReactNode;
};

const widgetIcons = {
  today: CalendarDays,
  overdue: AlertTriangle,
  upcoming: CalendarClock,
  favorites: Star,
  recent_activity: Clock3
} satisfies Record<DashboardWidgetKind, LucideIcon>;

export function DashboardWidget({
  title,
  description,
  kind,
  count,
  loading = false,
  error = null,
  emptyTitle = "Nothing to show",
  emptyDescription = "Matching dashboard items will appear here.",
  children
}: DashboardWidgetProps): React.JSX.Element {
  const WidgetIcon = widgetIcons[kind];
  const hasContent = children !== undefined && children !== null;

  return (
    <section className="dashboard-widget" data-dashboard-widget={kind}>
      <header className="dashboard-widget-header">
        <div>
          <WidgetIcon size={18} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        {count === undefined ? null : <span>{count}</span>}
      </header>
      {description === undefined ? null : <p>{description}</p>}

      {loading ? <p className="muted-text">Loading widget...</p> : null}
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      {!loading && error === null && !hasContent ? (
        <div className="dashboard-widget-empty">
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
        </div>
      ) : null}

      {hasContent ? children : null}
    </section>
  );
}
