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
