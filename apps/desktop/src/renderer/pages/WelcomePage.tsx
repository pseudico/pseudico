import { ArrowRight, FolderOpen, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";

export function WelcomePage(): React.JSX.Element {
  return (
    <main className="welcome-screen">
      <section className="welcome-content">
        <div className="welcome-copy">
          <p className="top-eyebrow">Local-only desktop workspace</p>
          <h1>Local Work OS</h1>
          <p>
            A private desktop shell for projects, contacts, inbox work, search,
            planning, files, and local maintenance.
          </p>
          <div className="welcome-actions">
            <button type="button" className="primary-button" disabled>
              <FolderOpen size={18} aria-hidden="true" />
              Create workspace
            </button>
            <button type="button" className="secondary-button" disabled>
              <HardDrive size={18} aria-hidden="true" />
              Open workspace
            </button>
          </div>
          <Link to="/workspace" className="text-link">
            View shell placeholder
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="welcome-system" aria-label="Local shell status">
          <div>
            <span className="status-dot" aria-hidden="true" />
            <strong>Local shell ready</strong>
          </div>
          <dl>
            <div>
              <dt>Workspace</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Not required</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
