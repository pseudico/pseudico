import { Link2, Users } from "lucide-react";

export type RelatedActivityViewModel = {
  id: string;
  description: string;
  createdAt: string;
};

export type RelatedContactViewModel = {
  relationshipId: string;
  contactId: string;
  name: string;
  description: string | null;
  status: string;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: RelatedActivityViewModel[];
};

export type RelatedContactOption = {
  id: string;
  name: string;
};

export type RelatedContactsPanelProps = {
  relatedContacts: readonly RelatedContactViewModel[];
  availableContacts: readonly RelatedContactOption[];
  selectedContactId: string;
  onOpenContact?: (contactId: string) => void;
  onSelectedContactChange: (contactId: string) => void;
  onLinkContact: () => void;
  onUnlinkContact: (relationshipId: string) => void;
  busy?: boolean;
  error?: string | null;
};

export function RelatedContactsPanel({
  relatedContacts,
  availableContacts,
  selectedContactId,
  onOpenContact,
  onSelectedContactChange,
  onLinkContact,
  onUnlinkContact,
  busy = false,
  error = null
}: RelatedContactsPanelProps): React.JSX.Element {
  const canLink = !busy && selectedContactId.trim().length > 0;

  return (
    <section className="related-items-panel" aria-label="Related contacts">
      <div className="panel-heading">
        <Users size={16} aria-hidden="true" />
        <h4>Related contacts</h4>
      </div>
      <div className="relationship-link-controls">
        <label>
          Contact
          <select
            value={selectedContactId}
            onChange={(event) => onSelectedContactChange(event.currentTarget.value)}
            disabled={busy || availableContacts.length === 0}
          >
            <option value="">Select a contact</option>
            {availableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onLinkContact} disabled={!canLink}>
          <Link2 size={14} aria-hidden="true" />
          Link contact
        </button>
      </div>
      {error !== null ? <p className="form-error">{error}</p> : null}
      {relatedContacts.length === 0 ? (
        <p className="muted-text">No related contacts yet.</p>
      ) : (
        <ol className="related-summary-list">
          {relatedContacts.map((contact) => (
            <li key={contact.relationshipId}>
              <article className="related-summary-card">
                <div className="related-summary-card-header">
                  <strong>{contact.name}</strong>
                  <span className="status-badge">{formatStatusLabel(contact.status)}</span>
                </div>
                {contact.description !== null ? (
                  <p className="related-summary-description">{contact.description}</p>
                ) : null}
                <small>
                  {formatFollowUpCount(contact.openTaskCount)}{" \u00b7 "}
                  {formatActivityCount(contact.recentActivityCount)}
                </small>
                {contact.recentActivity.length > 0 ? (
                  <ul>
                    {contact.recentActivity.map((activity) => (
                      <li key={activity.id}>{activity.description}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="button-row">
                  <button
                    type="button"
                    onClick={() => onOpenContact?.(contact.contactId)}
                    disabled={busy || onOpenContact === undefined}
                  >
                    Open contact
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnlinkContact(contact.relationshipId)}
                    disabled={busy}
                  >
                    Unlink
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatFollowUpCount(count: number): string {
  return `${count} open follow-up${count === 1 ? "" : "s"}`;
}

function formatActivityCount(count: number): string {
  return `${count} recent activity event${count === 1 ? "" : "s"}`;
}


function formatStatusLabel(status: string): string {
  return status.length === 0
    ? "Unknown"
    : `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}
