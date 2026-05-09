import { describe, expect, it } from "vitest";
import { CaptureBridge } from "../../src/main/services/CaptureBridge";

describe("CaptureBridge", () => {
  it("is disabled by default and does not start a listener", async () => {
    const bridge = new CaptureBridge();

    await expect(bridge.start()).resolves.toEqual({
      enabled: false,
      running: false,
      mode: "native_messaging",
      host: "127.0.0.1",
      port: 0,
      reason: "Capture bridge is disabled by default."
    });
    expect(bridge.getStatus().running).toBe(false);
  });

  it("keeps native messaging as a non-listening prototype mode", async () => {
    const bridge = new CaptureBridge({ enabled: true, mode: "native_messaging" });

    await expect(bridge.start()).resolves.toMatchObject({
      enabled: true,
      running: false,
      mode: "native_messaging",
      reason: "Native messaging is the preferred design but is not started by this prototype."
    });
  });
});
