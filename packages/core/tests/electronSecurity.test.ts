import { describe, expect, it } from "vitest";
import {
  areSafeLocalFilePaths,
  isSafeLocalFilePath,
  validateExternalOpenUrl,
  validateLinkWidgetEmbedUrl
} from "../src";

describe("Electron security validators", () => {
  it("allows only safe external URL protocols", () => {
    expect(validateExternalOpenUrl("https://example.com/path")).toMatchObject({
      ok: true,
      normalizedUrl: "https://example.com/path"
    });
    expect(validateExternalOpenUrl("http://example.com")).toMatchObject({
      ok: true,
      protocol: "http:"
    });
    expect(validateExternalOpenUrl("mailto:hello@example.com")).toMatchObject({
      ok: true,
      protocol: "mailto:"
    });
  });

  it("blocks unsafe external URL protocols and credentials", () => {
    for (const unsafeUrl of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///C:/Users/Alice/secret.txt",
      "vscode://file/C:/work",
      "https://user:password@example.com",
      "not absolute"
    ]) {
      expect(validateExternalOpenUrl(unsafeUrl).ok).toBe(false);
    }
  });

  it("validates dropped local file paths before IPC accepts them", () => {
    expect(isSafeLocalFilePath("C:\\Users\\Alice\\Desktop\\brief.pdf")).toBe(true);
    expect(isSafeLocalFilePath("\\\\server\\share\\brief.pdf")).toBe(true);
    expect(isSafeLocalFilePath("/Users/alice/Desktop/brief.pdf")).toBe(true);
    expect(areSafeLocalFilePaths(["C:\\brief.pdf", "/tmp/brief.pdf"])).toBe(true);

    for (const unsafePath of [
      "",
      "relative\\brief.pdf",
      "file:///C:/Users/Alice/secret.txt",
      "https://example.com/file.pdf",
      "javascript:alert(1)",
      "data:text/plain,hello",
      "C:\\safe\0evil"
    ]) {
      expect(isSafeLocalFilePath(unsafePath)).toBe(false);
    }
  });

  it("allows only safe sandboxed web widget URLs", () => {
    expect(validateLinkWidgetEmbedUrl("https://example.com/embed")).toMatchObject({
      ok: true,
      normalizedUrl: "https://example.com/embed"
    });

    for (const unsafeUrl of [
      "javascript:alert(1)",
      "data:text/html,<h1>bad</h1>",
      "file:///C:/Users/Alice/secret.txt",
      "https://user:pass@example.com/embed",
      "http://localhost:3000",
      "http://127.0.0.1:8080",
      "http://192.168.1.2/widget"
    ]) {
      expect(validateLinkWidgetEmbedUrl(unsafeUrl).ok).toBe(false);
    }
  });
});
