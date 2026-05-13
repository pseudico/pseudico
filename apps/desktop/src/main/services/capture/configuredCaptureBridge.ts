import type { WorkspaceFileSystemService } from "../workspace/WorkspaceFileSystemService";
import { CaptureBridge, type CaptureBridgeStatus } from "../CaptureBridge";
import { CaptureIntakeService } from "./CaptureIntakeService";

export type ConfiguredCaptureBridge = {
  bridge: CaptureBridge;
  status: CaptureBridgeStatus;
};

export async function startConfiguredCaptureBridge(
  workspaceService: WorkspaceFileSystemService,
  env: NodeJS.ProcessEnv = process.env
): Promise<ConfiguredCaptureBridge | null> {
  if (env.LOCAL_WORK_OS_CAPTURE_BRIDGE !== "localhost") {
    return null;
  }

  const intake = new CaptureIntakeService({ workspaceService });
  const bridge = new CaptureBridge({
    enabled: true,
    mode: "localhost",
    host: env.LOCAL_WORK_OS_CAPTURE_HOST ?? "127.0.0.1",
    port: parsePort(env.LOCAL_WORK_OS_CAPTURE_PORT),
    token: env.LOCAL_WORK_OS_CAPTURE_TOKEN ?? null,
    capture: (input) => intake.capture(input)
  });
  const status = await bridge.start();

  return { bridge, status };
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : 0;
}
