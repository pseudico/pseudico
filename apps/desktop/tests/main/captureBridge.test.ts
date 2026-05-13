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
      reason: "Native messaging is processed by the native host command and does not start a localhost listener."
    });
  });

  it("requires a pairing token before localhost mode can listen", async () => {
    const bridge = new CaptureBridge({ enabled: true, mode: "localhost" });

    await expect(bridge.start()).resolves.toMatchObject({
      enabled: true,
      running: false,
      mode: "localhost",
      reason: "Capture bridge requires a pairing token before it can start."
    });
  });

  it("accepts authorized localhost capture requests", async () => {
    const token = "test-token-12345678901234567890";
    const bridge = new CaptureBridge({
      enabled: true,
      mode: "localhost",
      token,
      capture: async (input) => ({
        format: input.format,
        workspaceId: "workspace_1",
        itemId: "item_1",
        containerId: input.target?.containerId ?? "container_inbox",
        title: "Captured",
        normalizedUrl: "https://example.com/"
      })
    });

    const status = await bridge.start();

    expect(status).toMatchObject({
      running: true,
      host: "127.0.0.1"
    });
    expect(status.port).toBeGreaterThan(0);

    try {
      const response = await fetch(`http://127.0.0.1:${status.port}/capture`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          format: "link",
          payload: { sourceUrl: "https://example.com" },
          target: { containerId: "container_project_1" }
        })
      });

      await expect(response.json()).resolves.toMatchObject({
        ok: true,
        data: {
          format: "link",
          itemId: "item_1",
          containerId: "container_project_1"
        }
      });
    } finally {
      await bridge.stop();
    }
  });
});
