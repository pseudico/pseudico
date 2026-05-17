import { renderToString } from "react-dom/server";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPage } from "../../src/renderer/pages/SettingsPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";
import type {
  BackupSnapshotSummary,
  MaintenanceJobSummary,
  RestoreWorkspaceSummary
} from "../../src/preload/api";

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
    expect(html).toContain("Choose restore folder");
    expect(html).toContain("No folder chosen yet");
    expect(html).toContain("Advanced: paste a destination path instead");
    expect(html).toContain("No backups yet");
    expect(html).toContain("This will not overwrite your");
    expect(html).not.toContain("Validate portable JSON import");
  });

  it("guides backup restore through destination, preview, and success states", () => {
    const backup = createBackupSnapshot();
    const restoreSummary = createRestoreSummary(backup);
    const html = renderSettings("backup", {
      initialBackups: [backup],
      initialRestoreSummary: restoreSummary,
      initialRestoreTargetPath: "C:\\Work\\Personal-restored",
      initialSelectedRestoreBackupId: backup.id
    });

    expect(html).toContain("Preview restore");
    expect(html).toContain("selected for restore");
    expect(html).toContain("3. Review restore before it runs");
    expect(html).toContain("Current workspace");
    expect(html).toContain("Backup source");
    expect(html).toContain("Restore destination");
    expect(html).toContain("New workspace only; current workspace is not overwritten.");
    expect(html).toContain("Restore into new workspace");
    expect(html).toContain("Restore complete: new workspace created");
    expect(html).toContain("Open restored workspace");
    expect(html).toContain("Show restored folder");
    expect(html).toContain("Show backup folder");
  });

  it("keeps imports and exports reachable but separated from daily settings", () => {
    const html = renderSettings("importsExports");

    expect(html).toContain("Imports from local files");
    expect(html).toContain("Markdown folder path");
    expect(html).toContain("CSV/TSV file path");
    expect(html).toContain("Validate portable JSON import");
    expect(html).toContain("Advanced portable data restore from JSON export");
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

  it("keeps important job completions findable after toasts disappear", () => {
    const html = renderSettings("overview", {
      initialBackupMessage:
        "Manual backup created at backups/2026-05-17T11-00-00-000Z.",
      initialExportMessage:
        "Workspace JSON export created at exports/workspace-2026-05-17.json.",
      initialMaintenanceJobs: [createSearchRebuildJob()]
    });

    expect(html).toContain("Recent Settings activity");
    expect(html).toContain("What just happened stays visible here.");
    expect(html).toContain("Manual backup created");
    expect(html).toContain("Workspace JSON export created");
    expect(html).toContain("Search index rebuilt");
    expect(html).toContain("Review");
  });
});

function renderSettings(
  initialSection?: ComponentProps<typeof SettingsPage>["initialSection"],
  props: Partial<ComponentProps<typeof SettingsPage>> = {}
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
      <SettingsPage {...props} />
    ) : (
      <SettingsPage initialSection={initialSection} {...props} />
    )
  );
}

function createBackupSnapshot(): BackupSnapshotSummary {
  return {
    id: "backup_1",
    workspaceId: "workspace_1",
    createdAt: "2026-05-16T10:00:00.000Z",
    relativePath: "backups/2026-05-16T10-00-00-000Z",
    databaseRelativePath:
      "backups/2026-05-16T10-00-00-000Z/local-work-os.sqlite",
    manifestRelativePath:
      "backups/2026-05-16T10-00-00-000Z/attachment-manifest.json",
    attachmentCount: 2,
    totalAttachmentBytes: 4096,
    databaseSizeBytes: 688128,
    kind: "manual"
  };
}

function createRestoreSummary(
  backup: BackupSnapshotSummary
): RestoreWorkspaceSummary {
  return {
    valid: true,
    sourceType: "backup",
    sourcePath: backup.relativePath,
    workspace: {
      id: "workspace_1",
      name: "Personal",
      schemaVersion: 1
    },
    counts: {
      containers: 1,
      items: 3,
      listItems: 0,
      attachments: 2
    },
    targetPolicy: {
      mode: "new_workspace_only",
      canApplyToActiveWorkspace: false,
      message:
        "Restore creates a separate workspace and does not overwrite the active workspace."
    },
    issues: [],
    restoredAt: "2026-05-17T00:00:00.000Z",
    targetWorkspaceRootPath: "C:\\Work\\Personal-restored",
    copiedAttachmentCount: 2,
    missingAttachmentCount: 0,
    searchIndex: {
      indexedContainerCount: 1,
      indexedItemCount: 3,
      indexedListItemCount: 0,
      indexedAttachmentCount: 2
    }
  };
}

function createSearchRebuildJob(): MaintenanceJobSummary {
  return {
    id: "maintenance_1",
    workspaceId: "workspace_1",
    status: "completed",
    operations: ["rebuild_search_index"],
    startedAt: "2026-05-17T11:00:00.000Z",
    completedAt: "2026-05-17T11:00:05.000Z",
    backup: null,
    sqliteIntegrity: null,
    attachmentManifestAudit: null,
    searchReindex: {
      indexedContainerCount: 4,
      indexedItemCount: 25,
      indexedListItemCount: 7,
      indexedAttachmentCount: 3
    },
    vacuum: null,
    orphanAttachmentScan: null,
    orphanAttachmentCleanup: null,
    entries: [],
    error: null
  };
}
