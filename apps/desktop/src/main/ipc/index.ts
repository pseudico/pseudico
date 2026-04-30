import { registerContainerIpc } from "./registerContainerIpc";
import { registerDatabaseIpc } from "./registerDatabaseIpc";
import { registerFileIpc } from "./registerFileIpc";
import { registerItemIpc } from "./registerItemIpc";
import { registerWorkspaceIpc } from "./registerWorkspaceIpc";

export function registerDesktopIpc(): void {
  registerWorkspaceIpc();
  registerDatabaseIpc();
  registerContainerIpc();
  registerItemIpc();
  registerFileIpc();
}
