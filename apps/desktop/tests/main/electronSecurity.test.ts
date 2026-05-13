import { describe, expect, it, vi } from "vitest";
import {
  isTrustedRendererNavigationUrl,
  openAllowedExternalUrl
} from "../../src/main/electronSecurity";

describe("main-process Electron security helpers", () => {
  it("opens only allowed external URL protocols", async () => {
    const openedUrls: string[] = [];
    const openExternal = vi.fn((url: string) => {
      openedUrls.push(url);
    });

    await expect(
      openAllowedExternalUrl("https://example.com/docs", openExternal)
    ).resolves.toBe(true);
    await expect(
      openAllowedExternalUrl("file:///C:/Users/Alice/secret.txt", openExternal)
    ).resolves.toBe(false);
    await expect(
      openAllowedExternalUrl("javascript:alert(1)", openExternal)
    ).resolves.toBe(false);

    expect(openedUrls).toEqual(["https://example.com/docs"]);
  });

  it("trusts only the renderer origin or packaged renderer file", () => {
    expect(
      isTrustedRendererNavigationUrl("http://localhost:5173/settings", {
        rendererDevUrl: "http://localhost:5173",
        packagedRendererUrl: "file:///C:/app/renderer/index.html"
      })
    ).toBe(true);
    expect(
      isTrustedRendererNavigationUrl("file:///C:/app/renderer/index.html", {
        rendererDevUrl: null,
        packagedRendererUrl: "file:///C:/app/renderer/index.html"
      })
    ).toBe(true);

    for (const unsafeUrl of [
      "https://example.com",
      "file:///C:/Users/Alice/secret.txt",
      "javascript:alert(1)"
    ]) {
      expect(
        isTrustedRendererNavigationUrl(unsafeUrl, {
          rendererDevUrl: "http://localhost:5173",
          packagedRendererUrl: "file:///C:/app/renderer/index.html"
        })
      ).toBe(false);
    }
  });
});
