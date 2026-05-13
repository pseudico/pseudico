import { CaptureService, type BrowserCapturePayload } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import type { WorkspaceSummary } from "../../../preload/api";
import type { WorkspaceFileSystemService } from "../workspace/WorkspaceFileSystemService";

export type BrowserCaptureFormat = "link" | "task";

export type BrowserCaptureTargetInput = {
  containerId?: string | null;
  containerTabId?: string | null;
};

export type BrowserCaptureIntakeInput = {
  format: BrowserCaptureFormat;
  payload: Omit<BrowserCapturePayload, "workspaceId"> & {
    workspaceId?: string;
    taskTitle?: string | null;
    dueAt?: string | null;
    priority?: number | null;
    pinned?: boolean;
  };
  target?: BrowserCaptureTargetInput | null;
};

export type BrowserCaptureIntakeResult = {
  format: BrowserCaptureFormat;
  workspaceId: string;
  itemId: string;
  containerId: string;
  title: string;
  normalizedUrl: string;
};

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export class CaptureIntakeService {
  private readonly workspaceService: CurrentWorkspaceService;

  constructor(input: { workspaceService: CurrentWorkspaceService }) {
    this.workspaceService = input.workspaceService;
  }

  async capture(input: BrowserCaptureIntakeInput): Promise<BrowserCaptureIntakeResult> {
    if (!isBrowserCaptureFormat(input.format)) {
      throw new Error("Capture format must be link or task.");
    }

    const workspace = this.requireWorkspace(input.payload.workspaceId);
    const connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
      fileMustExist: true
    });

    try {
      const captureService = new CaptureService({ connection });
      const basePayload = {
        ...input.payload,
        workspaceId: workspace.id,
        actorType: input.payload.actorType ?? "local_user",
        containerId: normalizeNullableString(input.target?.containerId),
        containerTabId: normalizeNullableString(input.target?.containerTabId)
      };

      if (input.format === "link") {
        const linkInput = {
          ...basePayload,
          ...(input.payload.pinned === undefined
            ? {}
            : { pinned: input.payload.pinned })
        };
        const result = await captureService.createLinkFromCapture({
          ...linkInput
        });

        return {
          format: "link",
          workspaceId: workspace.id,
          itemId: result.link.item.id,
          containerId: result.link.item.containerId,
          title: result.link.item.title,
          normalizedUrl: result.capture.normalizedUrl
        };
      }

      const taskInput = {
        ...basePayload,
        ...(input.payload.taskTitle === undefined
          ? {}
          : { taskTitle: input.payload.taskTitle }),
        ...(input.payload.dueAt === undefined ? {} : { dueAt: input.payload.dueAt }),
        ...(input.payload.priority === undefined
          ? {}
          : { priority: input.payload.priority })
      };
      const result = await captureService.createTaskFromCapture(taskInput);

      return {
        format: "task",
        workspaceId: workspace.id,
        itemId: result.task.item.id,
        containerId: result.task.item.containerId,
        title: result.task.item.title,
        normalizedUrl: result.capture.normalizedUrl
      };
    } finally {
      connection.close();
    }
  }

  private requireWorkspace(requestedWorkspaceId: string | undefined): WorkspaceSummary {
    const workspace = this.workspaceService.getCurrentWorkspace();

    if (workspace === null) {
      throw new Error("No workspace is open.");
    }

    if (
      requestedWorkspaceId !== undefined &&
      requestedWorkspaceId.trim() !== "" &&
      requestedWorkspaceId !== workspace.id
    ) {
      throw new Error("Capture workspaceId must match the current workspace.");
    }

    return workspace;
  }
}

function isBrowserCaptureFormat(value: string): value is BrowserCaptureFormat {
  return value === "link" || value === "task";
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
