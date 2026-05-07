import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const workspacePackages = [
  "@local-work-os/core",
  "@local-work-os/db",
  "@local-work-os/features"
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    resolve: {
      alias: {
        "@local-work-os/core": resolve(currentDir, "../../packages/core/src/index.ts"),
        "@local-work-os/db": resolve(currentDir, "../../packages/db/src/index.ts"),
        "@local-work-os/features": resolve(
          currentDir,
          "../../packages/features/src/index.ts"
        )
      }
    },
    build: {
      outDir: "dist/main",
      rollupOptions: {
        external: ["better-sqlite3"],
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
