import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));

const workspacePackages = ["core", "db", "features", "test-utils", "ui"] as const;

describe("desktop packaging configuration", () => {
  it("keeps TypeScript build cache files out of workspace package runtime dist folders", () => {
    for (const packageName of workspacePackages) {
      const tsconfigPath = resolve(repoRoot, "packages", packageName, "tsconfig.json");
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as {
        compilerOptions?: { tsBuildInfoFile?: string };
      };

      expect(tsconfig.compilerOptions?.tsBuildInfoFile).toBe(
        `../../.tsbuildinfo/${packageName}.tsbuildinfo`
      );
      expect(tsconfig.compilerOptions?.tsBuildInfoFile).not.toMatch(/^dist[\\/]/);
    }
  });


  it("does not ask electron-builder to package bundled workspace package symlinks", () => {
    const desktopPackageJson = JSON.parse(
      readFileSync(resolve(repoRoot, "apps", "desktop", "package.json"), "utf8")
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

    const declaredPackages = {
      ...desktopPackageJson.dependencies,
      ...desktopPackageJson.devDependencies
    };

    expect(Object.keys(declaredPackages)).not.toContain("@local-work-os/core");
    expect(Object.keys(declaredPackages)).not.toContain("@local-work-os/db");
    expect(Object.keys(declaredPackages)).not.toContain("@local-work-os/features");
    expect(Object.keys(declaredPackages)).not.toContain("@local-work-os/ui");
  });

  it("excludes TypeScript build cache files from electron-builder package inputs", () => {
    const builderConfig = readFileSync(
      resolve(repoRoot, "apps", "desktop", "electron-builder.yml"),
      "utf8"
    );

    expect(builderConfig).toContain('  - "!**/*.tsbuildinfo"');
    expect(builderConfig).toContain('  - "!**/.tsbuildinfo{,/**/*}"');
  });
});
