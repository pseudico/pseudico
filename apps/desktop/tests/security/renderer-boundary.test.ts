import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rendererSourceDir = fileURLToPath(
  new URL("../../src/renderer", import.meta.url)
);

const forbiddenRendererPatterns = [
  {
    label: "Electron import",
    pattern: /from\s+["']electron["']/
  },
  {
    label: "Node filesystem import",
    pattern: /from\s+["'](?:node:fs|fs)["']/
  },
  {
    label: "CommonJS filesystem require",
    pattern: /require\(\s*["'](?:node:fs|fs)["']\s*\)/
  },
  {
    label: "Raw ipcRenderer usage",
    pattern: /\bipcRenderer\b/
  }
] as const;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return [".ts", ".tsx"].includes(extname(fullPath)) ? [fullPath] : [];
  });
}

describe("renderer security boundary", () => {
  it("does not import Electron, raw IPC, or Node filesystem APIs", () => {
    const violations = listSourceFiles(rendererSourceDir).flatMap((filePath) => {
      const contents = readFileSync(filePath, "utf8");

      return forbiddenRendererPatterns
        .filter(({ pattern }) => pattern.test(contents))
        .map(({ label }) => `${filePath}: ${label}`);
    });

    expect(violations).toEqual([]);
  });
});
