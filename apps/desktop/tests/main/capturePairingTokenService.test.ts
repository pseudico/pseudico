import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { CapturePairingTokenService } from "../../src/main/services/capture/CapturePairingTokenService";

let tempRoot: string | undefined;

describe("CapturePairingTokenService", () => {
  afterEach(async () => {
    if (tempRoot !== undefined) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  it("creates, reuses, verifies, and rotates local pairing tokens", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-capture-token-"));
    const service = new CapturePairingTokenService({
      tokenPath: join(tempRoot, "capture", "pairing-token.json"),
      now: () => new Date("2026-05-13T00:00:00.000Z")
    });

    const first = await service.getOrCreateToken();
    const reused = await service.getOrCreateToken();

    expect(first.token).toHaveLength(43);
    expect(reused.token).toBe(first.token);
    await expect(service.verifyToken(first.token)).resolves.toBe(true);
    await expect(service.verifyToken("wrong-token")).resolves.toBe(false);

    const rotated = await service.rotateToken();

    expect(rotated.token).not.toBe(first.token);
    await expect(service.verifyToken(first.token)).resolves.toBe(false);
    await expect(service.verifyToken(rotated.token)).resolves.toBe(true);
  });
});
