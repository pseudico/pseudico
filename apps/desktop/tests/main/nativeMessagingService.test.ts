import { describe, expect, it } from "vitest";
import { NativeMessagingService } from "../../src/main/services/capture/NativeMessagingService";

const token = "native-token-12345678901234567890";

describe("NativeMessagingService", () => {
  it("validates token and forwards capture messages to the intake handler", async () => {
    const service = new NativeMessagingService({
      token,
      capture: async (input) => ({
        format: input.format,
        workspaceId: "workspace_1",
        itemId: "item_1",
        containerId: input.target?.containerId ?? "container_inbox",
        title: input.payload.title ?? "Captured",
        normalizedUrl: "https://example.com/"
      })
    });

    await expect(
      service.handleMessage({
        type: "capture",
        token,
        format: "task",
        payload: {
          sourceUrl: "https://example.com",
          title: "Captured page"
        },
        target: {
          containerId: "container_project_1"
        }
      })
    ).resolves.toEqual({
      ok: true,
      data: {
        format: "task",
        workspaceId: "workspace_1",
        itemId: "item_1",
        containerId: "container_project_1",
        title: "Captured page",
        normalizedUrl: "https://example.com/"
      }
    });
  });

  it("rejects missing fields and wrong pairing tokens", async () => {
    const service = new NativeMessagingService({
      token,
      capture: async () => {
        throw new Error("should not be called");
      }
    });

    await expect(service.handleMessage({ type: "capture" })).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_MESSAGE" }
    });

    await expect(
      service.handleMessage({
        type: "capture",
        token: "wrong-token",
        payload: { sourceUrl: "https://example.com" }
      })
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED" }
    });
  });
});
