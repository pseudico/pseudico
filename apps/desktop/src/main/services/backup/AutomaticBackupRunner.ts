import type { ApiResult, RunAutomaticBackupInput } from "../../../preload/api";
import { createBackupIpcHandlers } from "../../ipc/backupHandlers";
import type { WorkspaceFileSystemService } from "../workspace/WorkspaceFileSystemService";

export type AutomaticBackupRunnerTrigger = RunAutomaticBackupInput["trigger"];

export type AutomaticBackupRunnerOptions = {
  workspaceService: Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;
  intervalMs?: number;
  runBackupCheck?: (input: RunAutomaticBackupInput) => Promise<ApiResult<unknown>>;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export class AutomaticBackupRunner {
  private readonly workspaceService: Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;
  private readonly intervalMs: number;
  private readonly runBackupCheck: (
    input: RunAutomaticBackupInput
  ) => Promise<ApiResult<unknown>>;
  private readonly setIntervalFn: typeof setInterval;
  private readonly clearIntervalFn: typeof clearInterval;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: AutomaticBackupRunnerOptions) {
    this.workspaceService = options.workspaceService;
    this.intervalMs = options.intervalMs ?? 60 * 60 * 1000;
    this.setIntervalFn = options.setIntervalFn ?? setInterval;
    this.clearIntervalFn = options.clearIntervalFn ?? clearInterval;
    this.runBackupCheck =
      options.runBackupCheck ??
      ((input) =>
        createBackupIpcHandlers(this.workspaceService).handleRunAutomaticBackupCheck(
          input
        ));
  }

  start(): void {
    this.stop();
    void this.runOnce("app_open");
    this.timer = this.setIntervalFn(() => {
      void this.runOnce("interval");
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      this.clearIntervalFn(this.timer);
      this.timer = null;
    }
  }

  async runOnce(trigger: AutomaticBackupRunnerTrigger): Promise<ApiResult<unknown> | null> {
    const workspace = this.workspaceService.getCurrentWorkspace();

    if (workspace === null) {
      return null;
    }

    return await this.runBackupCheck({
      workspaceId: workspace.id,
      trigger
    });
  }
}
