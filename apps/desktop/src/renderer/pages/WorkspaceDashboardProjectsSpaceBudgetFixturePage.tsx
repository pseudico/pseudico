import { Link } from "react-router-dom";
import { longDataFixtures } from "@local-work-os/ui";

const projectFixtures = [
  {
    id: "project-client-onboarding",
    title: longDataFixtures.projectName,
    nextAction:
      "Confirm client data-room ownership, legal review owner, and first pilot training date.",
    status: "active",
    category: "Client Delivery",
    date: "2026-05-20",
    color: "#245c55"
  },
  {
    id: "project-backup-readiness",
    title:
      "Local backup readiness, restore rehearsal, attachment audit, and operator trust evidence",
    nextAction:
      "Run the recovery drill and attach the signed evidence PDF with the full filename visible.",
    status: "waiting",
    category: "Maintenance",
    date: "2026-05-22",
    color: "#ad7c18"
  },
  {
    id: "project-search-quality",
    title:
      "Search relevance, saved view cleanup, tag taxonomy review, and collection handoff",
    nextAction:
      "Decide which saved views belong on the dashboard before the pilot operator walkthrough.",
    status: "active",
    category: "Operations",
    date: "2026-05-24",
    color: "#5b6fb1"
  },
  {
    id: "project-home-admin",
    title: "Home admin insurance renewal with quote comparison and family document archive",
    nextAction:
      "Attach renewal statement and move the comparison checklist into Today if quote arrives.",
    status: "active",
    category: "Personal",
    date: "2026-05-28",
    color: "#7b5ba7"
  }
];

const categoryFixtures = [
  { label: "Client Delivery", color: "#245c55" },
  { label: "Maintenance", color: "#ad7c18" },
  { label: "Operations", color: "#5b6fb1" },
  { label: "Personal", color: "#7b5ba7" }
];

export function WorkspaceDashboardProjectsSpaceBudgetFixturePage(): React.JSX.Element {
  return (
    <section className="workspace-dashboard-projects-fixture">
      <div className="page-heading">
        <p className="top-eyebrow">PSE-237 production fixture</p>
        <h2>Workspace, dashboard, and projects library budgets</h2>
        <p>
          Deterministic long-data evidence for the launch surfaces. This route
          uses production renderer classes and hides maintenance behind a
          secondary block so daily work remains visually dominant.
        </p>
      </div>

      <section className="workspace-page" data-space-budget-surface="workspace-home">
        <div className="section-heading">
          <div>
            <p className="top-eyebrow">Workspace home</p>
            <h3>Pinned and recent work</h3>
          </div>
          <Link to="/today" className="primary-button compact-button">
            Open Today
          </Link>
        </div>
        <div className="workspace-pinned-work-strip">
          {projectFixtures.map((project) => (
            <Link key={project.id} to="/projects" className="workspace-pinned-card">
              <strong>{project.title}</strong>
              <span>{project.nextAction}</span>
              <small>
                {project.status} · {project.category} · {project.date}
              </small>
            </Link>
          ))}
        </div>
        <div className="workspace-home-grid">
          <section className="workspace-feed-panel">
            <div className="section-heading">
              <div>
                <p className="top-eyebrow">Operator feed</p>
                <h3>Readable recent movement</h3>
              </div>
            </div>
            <div className="workspace-feed-list">
              <div className="workspace-feed-row">
                <strong>{longDataFixtures.filename} attached to backup readiness</strong>
                <span>today · file evidence</span>
              </div>
              <div className="workspace-feed-row">
                <strong>{longDataFixtures.taskTitle}</strong>
                <span>today · moved into Today lane</span>
              </div>
              <div className="workspace-feed-row">
                <strong>{longDataFixtures.contactName} linked to client onboarding</strong>
                <span>yesterday · relationship</span>
              </div>
            </div>
          </section>
          <aside className="workspace-today-panel">
            <div className="section-heading">
              <div>
                <p className="top-eyebrow">Today</p>
                <h3>Plan and unblock</h3>
              </div>
            </div>
            <dl className="workspace-summary-metrics">
              <div><dt>Today</dt><dd>6</dd></div>
              <div data-dashboard-risk="true"><dt>Overdue</dt><dd>2</dd></div>
              <div><dt>Upcoming</dt><dd>9</dd></div>
            </dl>
            <div className="workspace-task-list">
              <Link to="/today" className="workspace-task-row">
                <strong>{longDataFixtures.taskTitle}</strong>
                <span>Today · Client Delivery</span>
              </Link>
              <Link to="/today" className="workspace-task-row">
                <strong>Reconcile the long vendor invoice title that wraps across two lines without breaking row controls</strong>
                <span>Overdue · Personal</span>
              </Link>
            </div>
          </aside>
          <aside className="workspace-maintenance-panel">
            <div className="section-heading">
              <div>
                <p className="top-eyebrow">Secondary</p>
                <h3>Maintenance</h3>
              </div>
            </div>
            <p>Backup/export and trash are visible but not visually promoted above daily work.</p>
          </aside>
        </div>
      </section>

      <section className="dashboard-page" data-space-budget-surface="dashboard-work-loop">
        <div className="section-heading">
          <div>
            <p className="top-eyebrow">Dashboard</p>
            <h3>Actionable widgets, not clutter</h3>
          </div>
        </div>
        <section className="dashboard-operator-summary">
          <div className="dashboard-operator-primary">
            <div className="section-heading">
              <div>
                <p className="top-eyebrow">Daily work first</p>
                <h3>Actionable overview</h3>
              </div>
            </div>
            <dl className="workspace-summary-metrics">
              <div><dt>Today</dt><dd>6</dd></div>
              <div data-dashboard-risk="true"><dt>Overdue</dt><dd>2</dd></div>
              <div><dt>Upcoming</dt><dd>9</dd></div>
              <div><dt>Health risks</dt><dd>1</dd></div>
            </dl>
          </div>
          <div className="dashboard-operator-list">
            <strong>Pinned/recent launch points</strong>
            {projectFixtures.slice(0, 3).map((project) => (
              <span key={project.id}>{project.title} · {project.category}</span>
            ))}
          </div>
          <div className="dashboard-operator-secondary">
            <strong>Maintenance stays secondary</strong>
            <span>Print/PDF, edit layout, imports, and backup are available in their routes without replacing the work loop.</span>
          </div>
        </section>
      </section>

      <section className="projects-page" data-space-budget-surface="projects-library">
        <div className="section-heading">
          <div>
            <p className="top-eyebrow">Projects library</p>
            <h3>Category board plus readable table rows</h3>
          </div>
        </div>
        <section className="project-library-summary">
          <div className="project-library-summary-main">
            <div>
              <p className="top-eyebrow">Library scan</p>
              <h3>Readable project browsing</h3>
              <p>
                Category columns stay 240-300px and scroll horizontally; the
                list keeps full names and next actions readable.
              </p>
            </div>
            <dl className="workspace-summary-metrics">
              <div><dt>Active</dt><dd>3</dd></div>
              <div><dt>Waiting</dt><dd>1</dd></div>
              <div><dt>Completed</dt><dd>0</dd></div>
              <div><dt>Pinned</dt><dd>4</dd></div>
            </dl>
          </div>
          <div className="project-category-browser">
            {categoryFixtures.map((category) => (
              <article key={category.label} className="project-category-column" style={{ borderTopColor: category.color }}>
                <header>
                  <strong>{category.label}</strong>
                  <span>1</span>
                </header>
                {projectFixtures
                  .filter((project) => project.category === category.label)
                  .map((project) => (
                    <Link key={project.id} to="/projects" className="project-category-card">
                      <strong>{project.title}</strong>
                      <span>{project.nextAction}</span>
                    </Link>
                  ))}
              </article>
            ))}
          </div>
        </section>
        <div className="project-list-panel project-list-secondary">
          <div className="project-list grouped-result-items">
            {projectFixtures.map((project) => (
              <div key={project.id} className="project-list-row">
                <Link className="project-list-main" to="/projects">
                  <span className="project-list-color" style={{ backgroundColor: project.color }} aria-hidden="true" />
                  <span>
                    <strong>{project.title}</strong>
                    <span>{project.nextAction}</span>
                  </span>
                </Link>
                <span className="project-list-meta">
                  <span>{project.status}</span>
                  <span>{project.category}</span>
                  <span>Updated {project.date}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
