import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "./ModulePlaceholder";

export function SettingsPage(): React.JSX.Element {
  return (
    <section className="settings-layout">
      <ModulePlaceholder
        eyebrow="Settings"
        title="Settings"
        summary="Workspace, appearance, database health, and local maintenance settings will appear here."
        highlights={["Workspace details", "Database status", "Backup settings"]}
      />
      <aside className="local-only-panel" aria-label="Local-only status">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h3>Local-only boundary</h3>
          <p>No cloud sync, hosted accounts, telemetry, or remote storage.</p>
        </div>
      </aside>
    </section>
  );
}
