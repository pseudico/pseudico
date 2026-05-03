import { DatabaseBootstrapService } from "@local-work-os/db";
import { app } from "electron";
import { join } from "node:path";
import { registerCategoryIpc } from "./registerCategoryIpc";
import { registerContainerIpc } from "./registerContainerIpc";
import { registerDatabaseIpc } from "./registerDatabaseIpc";
import { registerFileIpc } from "./registerFileIpc";
import { registerInboxIpc } from "./registerInboxIpc";
import { registerItemIpc } from "./registerItemIpc";
import { registerListIpc } from "./registerListIpc";
import { registerMetadataIpc } from "./registerMetadataIpc";
import { registerNoteIpc } from "./registerNoteIpc";
import { registerProjectIpc } from "./registerProjectIpc";
import { registerSearchIpc } from "./registerSearchIpc";
import { registerTaskIpc } from "./registerTaskIpc";
import { registerWorkspaceIpc } from "./registerWorkspaceIpc";
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
        join(app.getPath("userData"), "recent-workspaces.json")
      )
    })
  };
}

export function registerDesktopIpc(
  services: DesktopIpcServices = createDesktopIpcServices()
): void {
  registerWorkspaceIpc(services.workspaceService);
  registerDatabaseIpc(services.workspaceService);
  registerInboxIpc(services.workspaceService);
  registerProjectIpc(services.workspaceService);
  registerTaskIpc(services.workspaceService);
  registerListIpc(services.workspaceService);
  registerNoteIpc(services.workspaceService);
  registerCategoryIpc(services.workspaceService);
  registerMetadataIpc(services.workspaceService);
  registerSearchIpc(services.workspaceService);
  registerContainerIpc();
  registerItemIpc(services.workspaceService);
  registerFileIpc();
}
