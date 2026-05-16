import { renderToString } from "react-dom/server";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPage } from "../../src/renderer/pages/SettingsPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";

describe("SettingsPage", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("lands on operator-intent settings without exposing admin controls", () => {
    const html = renderSettings();

    expect(html).toContain("Workspace settings");
    expect(html).toContain("Operator settings");
    expect(html).toContain("Start with comfort, safety, and local trust.");
    expect(html).toContain("Appearance &amp; readability");
    expect(html).toContain("Backup &amp; restore");
    expect(html).toContain("Privacy &amp; local-only");
    expect(html).toContain("Categories / metadata");
    expect(html).toContain("Imports &amp; exports");
    expect(html).toContain("Advanced maintenance");
    expect(html).toContain("This will not overwrite your current workspace.");
    expect(html).not.toContain("Export portable JSON");
    expect(html).not.toContain("Validate portable JSON import");
    expect(html).not.toContain("Run audit");
    expect(html).not.toContain("Quarantine orphans");
  });

  it("keeps appearance, locale, and shortcut controls in the readability section", () => {
    const html = renderSettings("appearance");

    expect(html).toContain("Appearance");
    expect(html).toContain("Save appearance");
    expect(html).toContain("System");
    expect(html).toContain("Comfortable");
    expect(html).toContain("Language &amp; locale");
    expect(html).toContain("English (default)");
    expect(html).toContain("Future localization preference");
    expect(html).toContain("Keyboard shortcuts");
    expect(html).toContain("Quick task");
    expect(html).toContain("Ctrl/Cmd N");
    expect(html).toContain("New note");
    expect(html).toContain("Ctrl/Cmd Shift N");
    expect(html).not.toContain("Validate portable JSON import");
  });

  it("explains privacy and local-only controls without developer vocabulary first", () => {
    const html = renderSettings("privacy");

    expect(html).toContain("Privacy &amp; local-only");
    expect(html).toContain("No telemetry");
    expect(html).toContain("Cloud sync: not included");
    expect(html).toContain("Save privacy settings");
    expect(html).toContain("Link metadata fetch");
    expect(html).toContain("Browser capture");
    expect(html).not.toContain("Workspace health");
  });

  it("makes backup and restore reachable as the safety section", () => {
    const html = renderSettings("backup");

    expect(html).toContain("Backup &amp; restore");
    expect(html).toContain("Create backup");
    expect(html).toContain("New restore workspace folder");
    expect(html).toContain("No backups yet");
    expect(html).toContain("This will not overwrite your");
    expect(html).not.toContain("Validate portable JSON import");
  });

  it("keeps imports and exports reachable but separated from daily settings", () => {
    const html = renderSettings("importsExports");

    expect(html).toContain("Imports from local files");
    expect(html).toContain("Markdown folder path");
    expect(html).toContain("CSV/TSV file path");
    expect(html).toContain("Validate portable JSON import");
    expect(html).toContain("Restore export to new workspace");
    expect(html).toContain("Exports to local files");
    expect(html).toContain("Export portable JSON");
    expect(html).toContain("Export tasks CSV");
    expect(html).toContain("Export tasks TSV");
    expect(html).toContain("Export portable bundle");
    expect(html).toContain("Advanced optional IMAP import");
  });

  it("keeps diagnostics and maintenance inside the advanced section", () => {
    const html = renderSettings("advanced");

    expect(html).toContain("Workspace health");
    expect(html).toContain("Advanced diagnostics");
    expect(html).toContain("Run audit");
    expect(html).toContain("No diagnostics run");
    expect(html).toContain("Advanced maintenance");
    expect(html).toContain("orphan cleanup quarantines");
    expect(html).toContain("Run maintenance");
    expect(html).toContain("Quarantine orphans");
  });
});

function renderSettings(
  initialSection?: ComponentProps<typeof SettingsPage>["initialSection"]
): string {
  workspaceStore.setCurrentWorkspace({
    id: "workspace_1",
    name: "Personal",
    rootPath: "C:\\Work\\Personal",
    openedAt: "2026-05-01T00:00:00.000Z",
    schemaVersion: 1
  });

  return renderToString(
    initialSection === undefined ? (
      <SettingsPage />
    ) : (
      <SettingsPage initialSection={initialSection} />
    )
  );
}
