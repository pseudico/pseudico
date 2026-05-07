import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertRuntimeDataPathOutsideAppBundle,
  resolveUserDataPath,
  resolveWorkspacePath
} from "../../src/main/services/mainProcessPaths";

const appPath = resolve("C:/Program Files/Local Work OS/resources/app.asar");
const userDataPath = resolve("C:/Users/Example/AppData/Roaming/Local Work OS");

const app = {
  getAppPath: () => appPath,
  getPath: (name: string) => {
    if (name !== "userData") {
      throw new Error(`Unexpected app path request: ${name}`);
    }

    return userDataPath;
  }
};

describe("main process paths", () => {
  it("resolves runtime user data paths outside the packaged app bundle", () => {
    const recentWorkspacesPath = resolveUserDataPath(
      app,
      "recent-workspaces.json"
    );

    expect(recentWorkspacesPath).toBe(
      join(userDataPath, "recent-workspaces.json")
    );
    expect(
      assertRuntimeDataPathOutsideAppBundle(app, recentWorkspacesPath)
    ).toBe(recentWorkspacesPath);
  });

  it("resolves workspace data and attachment paths under the selected workspace", () => {
    const workspaceRootPath = resolve("C:/Users/Example/Documents/Smoke");

    expect(resolveWorkspacePath(workspaceRootPath, "databasePath")).toBe(
      join(workspaceRootPath, "data", "local-work-os.sqlite")
    );
    expect(resolveWorkspacePath(workspaceRootPath, "attachmentsPath")).toBe(
      join(workspaceRootPath, "attachments")
    );
  });

  it("rejects runtime data paths inside the packaged app resources", () => {
    expect(() =>
      assertRuntimeDataPathOutsideAppBundle(
        app,
        join(appPath, "recent-workspaces.json")
      )
    ).toThrow("Runtime data path must live outside the packaged app resources");
    expect(() =>
      assertRuntimeDataPathOutsideAppBundle(
        app,
        join(dirname(appPath), "app.asar.unpacked", "data.sqlite")
      )
    ).toThrow("Runtime data path must live outside the packaged app resources");
  });
});
