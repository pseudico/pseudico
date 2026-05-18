import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: ".",
  plugins: [react()],
  resolve: {
    alias: {
      "@local-work-os/core": resolve(
        currentDir,
        "../../packages/core/src/index.ts"
      ),
      "@local-work-os/features/help": resolve(
        currentDir,
        "../../packages/features/src/help/index.ts"
      ),
      "@local-work-os/features/quickStart": resolve(
        currentDir,
        "../../packages/features/src/quickStart/index.ts"
      ),
      "@local-work-os/features/workflows/schema": resolve(
        currentDir,
        "../../packages/features/src/workflows/WorkflowSchema.ts"
      ),
      "@local-work-os/features": resolve(
        currentDir,
        "../../packages/features/src/index.ts"
      ),
      "@local-work-os/ui": resolve(currentDir, "../../packages/ui/src/index.ts")
    }
  },
  build: {
    outDir: "dist/renderer",
    rollupOptions: {
      input: resolve(currentDir, "index.html")
    }
  }
});
