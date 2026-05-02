import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@local-work-os/core": resolve(
        currentDir,
        "../../packages/core/src/index.ts"
      ),
      "@local-work-os/db": resolve(currentDir, "../../packages/db/src/index.ts"),
      "@local-work-os/features": resolve(
        currentDir,
        "../../packages/features/src/index.ts"
      ),
      "@local-work-os/ui": resolve(currentDir, "../../packages/ui/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["dist/**", "node_modules/**"],
    passWithNoTests: false
  }
});
