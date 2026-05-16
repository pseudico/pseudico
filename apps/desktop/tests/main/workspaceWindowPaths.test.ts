import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveWorkspaceWindowAssetPaths } from "../../src/main/workspaceWindowPaths";

describe("workspace window asset paths", () => {
  it("resolves packaged renderer and preload paths from import.meta.url without __dirname", () => {
    const packagedMainPath = join(
      process.cwd(),
      "fixture-package",
      "resources",
      "app.asar",
      "dist",
      "main",
      "index.js"
    );
    const paths = resolveWorkspaceWindowAssetPaths(
      pathToFileURL(packagedMainPath).toString()
    );

    expect(normalizePath(paths.mainDirectory)).toMatch(
      /\/fixture-package\/resources\/app\.asar\/dist\/main$/
    );
    expect(normalizePath(paths.preloadPath)).toMatch(
      /\/fixture-package\/resources\/app\.asar\/dist\/preload\/index\.cjs$/
    );
    expect(normalizePath(paths.rendererIndexPath)).toMatch(
      /\/fixture-package\/resources\/app\.asar\/dist\/renderer\/index\.html$/
    );
  });
});

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
