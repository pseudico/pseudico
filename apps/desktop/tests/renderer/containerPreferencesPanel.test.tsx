import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  ContainerPreferencesSummary,
  ContainerTabSummary
} from "../../src/preload/api";
import { ContainerPreferencesPanel } from "../../src/renderer/components/ContainerPreferencesPanel";

describe("ContainerPreferencesPanel", () => {
  it("renders local display and quick-add settings for a container", () => {
    const html = renderToString(
      <ContainerPreferencesPanel
        error={null}
        open
        preferences={preferences}
        saving={false}
        tabs={tabs}
        onClose={() => undefined}
        onSave={() => undefined}
      />
    );

    expect(html).toContain("Display settings");
    expect(html).toContain("Default view");
    expect(html).toContain("Default tab");
    expect(html).toContain("Planning");
    expect(html).toContain("Default quick-add type");
    expect(html).toContain("Show completed tasks and list rows");
    expect(html).toContain("Summary first");
    expect(html).toContain("Compact mode");
    expect(html).toContain("Save settings");
  });

  it("does not render the dialog when closed", () => {
    expect(
      renderToString(
        <ContainerPreferencesPanel
          open={false}
          preferences={preferences}
          tabs={tabs}
          onClose={() => undefined}
          onSave={() => undefined}
        />
      )
    ).toBe("");
  });
});

const preferences: ContainerPreferencesSummary = {
  workspaceId: "workspace_1",
  containerId: "container_project_1",
  updatedAt: "2026-05-10T10:01:00.000Z",
  defaultView: "summary",
  defaultTabId: "tab_planning",
  showCompleted: false,
  grouping: "tab",
  defaultQuickAddType: "note",
  summaryFirst: true,
  compactMode: true
};

const tabs: ContainerTabSummary[] = [
  {
    id: "tab_main",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    name: "Main",
    description: null,
    sortOrder: 0,
    isDefault: true,
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    hiddenAt: null,
    archivedAt: null,
    deletedAt: null
  },
  {
    id: "tab_planning",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    name: "Planning",
    description: null,
    sortOrder: 10,
    isDefault: false,
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    hiddenAt: null,
    archivedAt: null,
    deletedAt: null
  }
];
