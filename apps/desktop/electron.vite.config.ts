import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: {
          index: resolve(currentDir, "src/main/index.ts")
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: {
          index: resolve(currentDir, "src/preload/index.ts")
        }
      }
    }
  },
  renderer: {
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
  }
});
