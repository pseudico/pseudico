import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPage } from "../../src/renderer/pages/SettingsPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";

describe("SettingsPage", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("renders the backup controls inside workspace settings", () => {
    workspaceStore.setCurrentWorkspace({
      id: "workspace_1",
      name: "Personal",
      rootPath: "C:\\Work\\Personal",
      openedAt: "2026-05-01T00:00:00.000Z",
      schemaVersion: 1
    });

    const html = renderToString(<SettingsPage />);

    expect(html).toContain("Workspace settings");
    expect(html).toContain("Diagnostics");
    expect(html).toContain("Run audit");
    expect(html).toContain("No diagnostics run");
    expect(html).toContain("Backups");
    expect(html).toContain("Create backup");
    expect(html).toContain("Restore target folder");
    expect(html).toContain("No backups yet");
    expect(html).toContain("Exports");
    expect(html).toContain("Export JSON");
    expect(html).toContain("Export tasks CSV");
    expect(html).toContain("Export tasks TSV");
    expect(html).toContain("Imports");
    expect(html).toContain("Validate JSON import");
    expect(html).toContain("Restore export to new workspace");
    expect(html).toContain("Keyboard shortcuts");
    expect(html).toContain("Quick task");
    expect(html).toContain("Ctrl/Cmd N");
    expect(html).toContain("New note");
    expect(html).toContain("Ctrl/Cmd Shift N");
    expect(html).toContain("Categories");
  });
});
