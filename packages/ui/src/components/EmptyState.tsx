import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon = <Inbox size={24} aria-hidden="true" />,
  title
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action === undefined ? null : (
        <div className="empty-state-action">{action}</div>
      )}
    </div>
  );
}
