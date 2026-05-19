import type { ReactNode } from "react";

export type OperatorPageKind = "entry" | "primary" | "secondary" | "maintenance";

export function OperatorPage({
  children,
  className = "",
  labelledBy,
  routeId,
  kind = "primary"
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  routeId: string;
  kind?: OperatorPageKind;
}): React.JSX.Element {
  const classes = ["operator-page", className].filter(Boolean).join(" ");

  return (
    <section
      aria-labelledby={labelledBy}
      className={classes}
      data-operator-route={routeId}
      data-operator-route-kind={kind}
    >
      {children}
    </section>
  );
}

export function OperatorPageHeader({
  actions,
  children,
  eyebrow,
  id,
  summary,
  title
}: {
  actions?: ReactNode;
  children?: ReactNode;
  eyebrow: string;
  id: string;
  summary: string;
  title: string;
}): React.JSX.Element {
  return (
    <header className="operator-page-header page-heading page-heading-actions">
      <div>
        <p className="top-eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p>{summary}</p>
        {children}
      </div>
      {actions === undefined ? null : <div className="operator-page-actions">{actions}</div>}
    </header>
  );
}

export function OperatorWorkbench({
  children,
  className = "",
  layout = "primary-rail"
}: {
  children: ReactNode;
  className?: string;
  layout?: "primary-rail" | "primary-two-rails" | "single";
}): React.JSX.Element {
  const classes = ["operator-workbench", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-operator-workbench-layout={layout}>
      {children}
    </div>
  );
}

export function OperatorPanel({
  children,
  className = "",
  role = "primary"
}: {
  children: ReactNode;
  className?: string;
  role?: "primary" | "rail" | "context" | "inspector";
}): React.JSX.Element {
  const classes = ["operator-panel", `operator-panel-${role}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} data-operator-panel={role}>
      {children}
    </section>
  );
}
