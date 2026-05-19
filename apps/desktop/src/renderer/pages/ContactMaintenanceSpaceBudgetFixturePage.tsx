import { Archive, Contact, FileText, FolderKanban, HardDrive, Link2, RotateCcw, ShieldCheck, StickyNote, Trash2, Wrench } from "lucide-react";

const longContactName = "Dr. Amara Velasquez — Regional operations sponsor for the sustainable facilities transition program";
const longProject = "Client onboarding program with legal review, local backup rehearsal, facility audit, and equipment handover";

export function ContactMaintenanceSpaceBudgetFixturePage(): React.JSX.Element {
  return (
    <main className="space-budget-demo-page contact-maintenance-fixture-page">
      <section className="page-heading">
        <p className="top-eyebrow">PSE-238 production fixture</p>
        <h2>Contacts and maintenance space budgets</h2>
        <p>
          Deterministic long-data fixture for contact work containers and boring, safe
          maintenance pages at 1440x1000 and 1280x800.
        </p>
      </section>

      <section className="project-detail-page contact-detail-page" data-space-budget-surface="contact-detail">
        <header className="project-detail-header contact-detail-header">
          <div className="container-media-preview container-media-avatar" aria-hidden="true">AV</div>
          <span className="project-detail-color" aria-hidden="true" />
          <div>
            <p className="top-eyebrow">Contact work room</p>
            <h2>{longContactName}</h2>
            <p>
              Facilities lead at Northstar Habitat Cooperative. Owns approvals,
              follow-ups, meeting notes, files, and active related projects for the operator.
            </p>
          </div>
          <div className="button-row">
            <button className="secondary-button compact-button" type="button">Print / PDF</button>
            <button className="secondary-button compact-button" type="button">Display settings</button>
          </div>
        </header>

        <dl className="project-meta-grid">
          <div><dt>Status</dt><dd>Active follow-up</dd></div>
          <div><dt>Role</dt><dd>Regional operations sponsor</dd></div>
          <div><dt>Tags</dt><dd>@facilities @legal-review @backup-ready</dd></div>
        </dl>

        <section className="contact-detail-workbench" data-space-budget-surface="contact-workbench" aria-label="Contact fixture workbench">
          <aside className="contact-profile-panel" aria-label="Readable contact facts">
            <div className="panel-heading-actions">
              <div className="panel-heading"><Contact size={17} aria-hidden="true" /><h3>Profile and linked work</h3></div>
              <p className="muted-text">Full names, roles, companies, and relationships are rows, not chips only.</p>
            </div>
            <div className="contact-fact-list">
              <div><strong>Company</strong><span>Northstar Habitat Cooperative — multi-site retrofit program</span></div>
              <div><strong>Next follow-up</strong><span>Confirm signed maintenance window and backup/export rehearsal evidence by Friday 10:00.</span></div>
              <div><strong>Email</strong><span>amara.velasquez.long-name@northstar-habitat.example</span></div>
            </div>
            <div className="related-summary-card">
              <h4>{longProject}</h4>
              <p>Open tasks: 12 · recent files: 4 · next review: 2026-05-22</p>
            </div>
          </aside>

          <section className="project-content-section contact-content-feed" aria-label="Readable contact mixed feed">
            <div className="panel-heading-actions">
              <div className="panel-heading"><Contact size={17} aria-hidden="true" /><h3>Contact mixed content feed</h3></div>
              <button className="primary-button compact-button" type="button">Quick Start (Task)</button>
            </div>
            <div className="project-quick-action-row" aria-label="Contact quick-start actions">
              <button className="secondary-button" type="button">+ Task</button>
              <button className="secondary-button" type="button">+ Note</button>
              <button className="secondary-button" type="button">Attach file</button>
              <button className="secondary-button" type="button">Add link</button>
            </div>
            <article className="universal-item-card" data-item-type="task">
              <div className="universal-item-header"><FolderKanban size={18} aria-hidden="true" /><h4>Confirm regional compliance sign-off after comparing the restoration checklist against the maintenance export packet</h4></div>
              <p>Due today · {longProject}</p>
            </article>
            <article className="universal-item-card" data-item-type="note">
              <div className="universal-item-header"><StickyNote size={18} aria-hidden="true" /><h4>Meeting note: backup restore rehearsal and facilities access constraints</h4></div>
              <p>Amara asked for the restore destination, exported manifest, attachment count, and retained warning summary to stay visible in the next operator review.</p>
            </article>
            <article className="universal-item-card" data-item-type="file">
              <div className="universal-item-header"><FileText size={18} aria-hidden="true" /><h4>northstar-facilities-restoration-evidence-packet-final-reviewed-with-attachments.pdf</h4></div>
              <p>Local attachment · 18.4 MB · extension remains visible.</p>
            </article>
            <article className="universal-item-card" data-item-type="link">
              <div className="universal-item-header"><Link2 size={18} aria-hidden="true" /><h4>Restore procedure checklist for long-path workspace evidence review</h4></div>
              <p>docs.local-work-os.example · explicit external open only through allowlisted opener.</p>
            </article>
          </section>

          <aside className="contact-context-panel" aria-label="Readable contact context">
            <div className="panel-heading-actions">
              <div className="panel-heading"><Contact size={17} aria-hidden="true" /><h3>Follow-up context</h3></div>
              <p className="muted-text">Next action, related work, and history stay visible beside the feed.</p>
            </div>
            <div className="related-summary-card"><h4>Next safe action</h4><p>Send Amara the backup restore summary after verifying paths and warnings.</p></div>
            <div className="related-summary-card"><h4>Related projects</h4><p>{longProject}</p></div>
            <div className="recent-activity-list"><article><strong>Activity</strong><p>Attached evidence packet and linked project handover note.</p></article></div>
          </aside>
        </section>
      </section>

      <section className="settings-layout" data-space-budget-surface="maintenance-settings">
        <div className="page-heading">
          <p className="top-eyebrow">Maintenance is deliberate</p>
          <h2>Settings, backup, export, import, and local safety</h2>
          <p>Maintenance panels are spacious and secondary until deliberately opened.</p>
        </div>
        <div className="settings-section-nav" aria-label="Settings section navigation fixture">
          <button className="settings-section-tab settings-section-tab-active" type="button"><strong>Backup & restore</strong><span>Create local backups and restore into a new workspace.</span></button>
          <button className="settings-section-tab" type="button"><strong>Appearance & readability</strong><span>Theme, density, font size, locale, shortcuts.</span></button>
          <button className="settings-section-tab settings-section-tab-secondary" type="button"><strong>Advanced maintenance</strong><span>Search rebuilds, attachment audit, SQLite checks.</span></button>
        </div>
        <section className="backup-management-panel backup-restore-panel" aria-label="Readable backup fixture">
          <div className="panel-heading-actions">
            <div className="panel-heading"><HardDrive size={17} aria-hidden="true" /><h3>Backup & restore</h3></div>
            <button className="primary-button" type="button"><Archive size={17} aria-hidden="true" />Create manual backup</button>
          </div>
          <div className="restore-preview-card">
            <strong>Review restore before it runs</strong>
            <dl className="restore-preview-grid">
              <div><dt>Backup source</dt><dd>backups/2026-05-19T02-42-00/northstar-restoration-workspace-backup-with-attachment-manifest</dd></div>
              <div><dt>Restore destination</dt><dd>C:\\Users\\Operator\\Documents\\Pseudico Restores\\Northstar restoration verified workspace copy</dd></div>
              <div><dt>Safety policy</dt><dd>New workspace only; current workspace is not overwritten.</dd></div>
              <div><dt>Included data</dt><dd>2.1 GB database and attachment manifest · 438 attachments · 0 blocking errors · 2 warnings.</dd></div>
            </dl>
            <div className="top-actions"><button className="secondary-button" type="button">Choose destination first</button><button className="primary-button" type="button"><ShieldCheck size={17} aria-hidden="true" />Restore into new workspace</button></div>
          </div>
        </section>
      </section>

      <section className="maintenance-secondary-grid">
        <article className="content-page trash-page" data-space-budget-surface="maintenance-trash">
          <header className="page-header"><div><p className="eyebrow">Local recovery</p><h2>Trash</h2><p>Readable rows, previewable context, and a backup preflight before purge.</p></div></header>
          <div className="trash-confirm-row"><Trash2 size={17} aria-hidden="true" />Create a local backup first, then permanently purge soft-deleted records.</div>
          <article className="trash-row"><div><strong>Deleted long project archive: Northstar facilities restoration pilot with legal review</strong><p>From {longContactName}</p><div className="trash-row-meta"><span>Deleted 2026-05-19 12:24</span><span>Parent contact retained</span></div></div><button className="secondary-button" type="button"><RotateCcw size={16} aria-hidden="true" />Restore</button></article>
        </article>
        <article className="workflow-page" data-space-budget-surface="workflow-lab">
          <header className="page-header"><div><p className="eyebrow">Workflow lab — scaffold only</p><h2>Workflows</h2><p>This stays labelled as a maintainer lab, not promoted above daily work.</p></div><span className="status-pill danger">Future / scaffold</span></header>
          <div className="settings-card"><h3>Rejected network workflow</h3><p><Wrench size={16} aria-hidden="true" /> Webhook/cloud/shell actions remain out of scope for local-only operator workflows.</p></div>
        </article>
      </section>
    </main>
  );
}
