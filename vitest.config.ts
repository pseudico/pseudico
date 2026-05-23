import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspacePackageAliases = {
  "@local-work-os/core": fileURLToPath(
    new URL("./packages/core/src/index.ts", import.meta.url)
  ),
  "@local-work-os/db": fileURLToPath(
    new URL("./packages/db/src/index.ts", import.meta.url)
  ),
  "@local-work-os/features/quickStart": fileURLToPath(
    new URL("./packages/features/src/quickStart/index.ts", import.meta.url)
  ),
  "@local-work-os/features/help": fileURLToPath(
    new URL("./packages/features/src/help/index.ts", import.meta.url)
  ),
  "@local-work-os/features/workflows/schema": fileURLToPath(
    new URL("./packages/features/src/workflows/WorkflowSchema.ts", import.meta.url)
  ),
  "@local-work-os/features": fileURLToPath(
    new URL("./packages/features/src/index.ts", import.meta.url)
  ),
  "@local-work-os/test-utils": fileURLToPath(
    new URL("./packages/test-utils/src/index.ts", import.meta.url)
  ),
  "@local-work-os/ui": fileURLToPath(
    new URL("./packages/ui/src/index.ts", import.meta.url)
  )
};

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  test: {
    environment: "node",
    include: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-packaged/**",
      "**/.git/**",
      "**/.tmp/**",
      "**/.worktrees/**",
      "**/.codex-output/**",
      "**/.playwright-mcp/**",
      "**/docs/manual-qa/**"
    ],
    testTimeout: 30_000,
    passWithNoTests: false
  }
});
