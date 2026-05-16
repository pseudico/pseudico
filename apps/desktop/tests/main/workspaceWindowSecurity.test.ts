import { describe, expect, it } from "vitest";
import { createWorkspaceWindowWebPreferences } from "../../src/main/workspaceWindowSecurity";

describe("workspace window security preferences", () => {
  it("keeps Electron renderer hardening enabled", () => {
    expect(
      createWorkspaceWindowWebPreferences({
        preloadPath: "C:/app/preload/index.mjs",
        devTools: false
      })
    ).toMatchObject({
      preload: "C:/app/preload/index.mjs",
      allowRunningInsecureContent: false,
      contextIsolation: true,
      devTools: false,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    });
  });
});
