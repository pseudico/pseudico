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
    expect(html).toContain("Backups");
    expect(html).toContain("Create backup");
    expect(html).toContain("No backups yet.");
    expect(html).toContain("Exports");
    expect(html).toContain("Export JSON");
    expect(html).toContain("Categories");
  });
});
