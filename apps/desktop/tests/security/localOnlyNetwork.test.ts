import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const sourceRoots = [
  join(repoRoot, "apps", "desktop", "src"),
  join(repoRoot, "packages", "features", "src")
];

const allowedNetworkCapableFiles = new Set([
  normalizePath("apps/desktop/src/main/ipc/linkHandlers.ts"),
  normalizePath("apps/desktop/src/main/ipc/registerLinkIpc.ts"),
  normalizePath("apps/desktop/src/main/services/CaptureBridge.ts"),
  normalizePath("packages/features/src/import/ImapImportService.ts"),
  normalizePath("packages/features/src/links/LinkMetadataService.ts")
]);

const networkSinkPatterns = [
  /\bfetch\s*\(/,
  /\bglobalThis\.fetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
  /from\s+["'](?:node:net|node:http|node:https|net|http|https)["']/,
  /require\(\s*["'](?:node:net|node:http|node:https|net|http|https)["']\s*\)/
] as const;

const deniedCloudTelemetryPatterns = [
  /from\s+["'][^"']*(?:sentry|posthog|segment|mixpanel|amplitude|firebase|supabase|auth0|stripe|electron-updater)[^"']*["']/i,
  /require\(\s*["'][^"']*(?:sentry|posthog|segment|mixpanel|amplitude|firebase|supabase|auth0|stripe|electron-updater)[^"']*["']\s*\)/i
] as const;

describe("local-only network boundary", () => {
  it("keeps network-capable source paths explicit and opt-in", () => {
    const violations = listSourceFiles(sourceRoots).flatMap((filePath) => {
      const normalized = normalizePath(relative(repoRoot, filePath));
      const contents = readFileSync(filePath, "utf8");
      const hasNetworkSink = networkSinkPatterns.some((pattern) =>
        pattern.test(contents)
      );

      return hasNetworkSink && !allowedNetworkCapableFiles.has(normalized)
        ? [normalized]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("does not import telemetry, hosted-account, billing, cloud, or auto-update SDKs", () => {
    const violations = listSourceFiles(sourceRoots).flatMap((filePath) => {
      const normalized = normalizePath(relative(repoRoot, filePath));
      const contents = readFileSync(filePath, "utf8");

      return deniedCloudTelemetryPatterns
        .filter((pattern) => pattern.test(contents))
        .map(() => normalized);
    });

    expect(violations).toEqual([]);
  });
});

function listSourceFiles(roots: string[]): string[] {
  return roots.flatMap((root) => listFiles(root));
}

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listFiles(fullPath);
    }

    return [".ts", ".tsx"].includes(extname(fullPath)) ? [fullPath] : [];
  });
}

function normalizePath(value: string): string {
  return value.split(sep).join("/");
}
