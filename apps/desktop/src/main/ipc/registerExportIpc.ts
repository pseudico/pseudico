import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createExportIpcHandlers } from "./exportHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerExportIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createExportIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportWorkspaceJson,
    (_event, input) => handlers.handleExportWorkspaceJson(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportProjectMarkdown,
    (_event, input) => handlers.handleExportProjectMarkdown(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportTasksCsv,
    (_event, input) => handlers.handleExportTasksCsv(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportPlanningSummaryMarkdown,
    (_event, input) => handlers.handleExportPlanningSummaryMarkdown(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportHtmlCsvTsvMarkdownBundle,
    (_event, input) => handlers.handleExportHtmlCsvTsvMarkdownBundle(input)
  );
}
