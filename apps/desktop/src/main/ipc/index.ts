import { DatabaseBootstrapService } from "@local-work-os/db";
import { app } from "electron";
import { registerCategoryIpc } from "./registerCategoryIpc";
import { registerActivityIpc } from "./registerActivityIpc";
import { registerBackupIpc } from "./registerBackupIpc";
import { registerCalendarIpc } from "./registerCalendarIpc";
import { registerCollectionIpc } from "./registerCollectionIpc";
import { registerContactIpc } from "./registerContactIpc";
import { registerContainerIpc } from "./registerContainerIpc";
import { registerDashboardIpc } from "./registerDashboardIpc";
import { registerDatabaseIpc } from "./registerDatabaseIpc";
import { registerDiagnosticsIpc } from "./registerDiagnosticsIpc";
import { registerDragDropIpc } from "./registerDragDropIpc";
import { registerExportIpc } from "./registerExportIpc";
import { registerFileIpc } from "./registerFileIpc";
import { registerInboxIpc } from "./registerInboxIpc";
import { registerImportIpc } from "./registerImportIpc";
import { registerItemIpc } from "./registerItemIpc";
import { registerLinkIpc } from "./registerLinkIpc";
import { registerListIpc } from "./registerListIpc";
import { registerMetadataIpc } from "./registerMetadataIpc";
import { registerNavigationIpc } from "./registerNavigationIpc";
import { registerNoteIpc } from "./registerNoteIpc";
import { registerProjectIpc } from "./registerProjectIpc";
import { registerRelationshipIpc } from "./registerRelationshipIpc";
import { registerReminderIpc } from "./registerReminderIpc";
import { registerSearchIpc } from "./registerSearchIpc";
import { registerTaskIpc } from "./registerTaskIpc";
import { registerTabIpc } from "./registerTabIpc";
import { registerTemplateIpc } from "./registerTemplateIpc";
import { registerTimelineIpc } from "./registerTimelineIpc";
import { registerTodayIpc } from "./registerTodayIpc";
import { registerTrashIpc } from "./registerTrashIpc";
import { registerWorkspaceIpc } from "./registerWorkspaceIpc";
import {
  assertRuntimeDataPathOutsideAppBundle,
  resolveUserDataPath
} from "../services/mainProcessPaths";
import { RecentWorkspacesService } from "../services/workspace/RecentWorkspacesService";
import { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

export type DesktopIpcServices = {
  workspaceService: WorkspaceFileSystemService;
};

export function createDesktopIpcServices(): DesktopIpcServices {
  return {
    workspaceService: new WorkspaceFileSystemService({
      databaseBootstrapService: new DatabaseBootstrapService(),
      recentWorkspacesService: new RecentWorkspacesService(
        assertRuntimeDataPathOutsideAppBundle(
          app,
          resolveUserDataPath(app, "recent-workspaces.json")
        )
      )
    })
  };
}

export function registerDesktopIpc(
  services: DesktopIpcServices = createDesktopIpcServices()
): void {
  registerWorkspaceIpc(services.workspaceService);
  registerBackupIpc(services.workspaceService);
  registerExportIpc(services.workspaceService);
  registerImportIpc();
  registerDatabaseIpc(services.workspaceService);
  registerInboxIpc(services.workspaceService);
  registerProjectIpc(services.workspaceService);
  registerContactIpc(services.workspaceService);
  registerTabIpc(services.workspaceService);
  registerRelationshipIpc(services.workspaceService);
  registerReminderIpc(services.workspaceService);
  registerTaskIpc(services.workspaceService);
  registerListIpc(services.workspaceService);
  registerTemplateIpc(services.workspaceService);
  registerNoteIpc(services.workspaceService);
  registerLinkIpc(services.workspaceService);
  registerCategoryIpc(services.workspaceService);
  registerActivityIpc(services.workspaceService);
  registerMetadataIpc(services.workspaceService);
  registerNavigationIpc(services.workspaceService);
  registerSearchIpc(services.workspaceService);
  registerDiagnosticsIpc(services.workspaceService);
  registerDragDropIpc(services.workspaceService);
  registerCollectionIpc(services.workspaceService);
  registerTodayIpc(services.workspaceService);
  registerTimelineIpc(services.workspaceService);
  registerCalendarIpc(services.workspaceService);
  registerDashboardIpc(services.workspaceService);
  registerContainerIpc();
  registerItemIpc(services.workspaceService);
  registerTrashIpc(services.workspaceService);
  registerFileIpc(services.workspaceService);
}
