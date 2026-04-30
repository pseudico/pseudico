import { describe, expect, it } from "vitest";
import { handleGetDatabaseHealthStatus } from "../../src/main/ipc/databaseHandlers";
import { handleGetModuleStatus } from "../../src/main/ipc/moduleStatusHandlers";
import {
  handleCreateWorkspace,
  handleGetCurrentWorkspace,
  handleListRecentWorkspaces,
  handleOpenWorkspace
} from "../../src/main/ipc/workspaceHandlers";

describe("workspace IPC handlers", () => {
  it("returns an empty current workspace placeholder", () => {
    expect(handleGetCurrentWorkspace()).toEqual({
      ok: true,
      data: null
    });
  });

  it("returns an empty recent workspace placeholder", () => {
    expect(handleListRecentWorkspaces()).toEqual({
      ok: true,
      data: []
    });
  });

  it("validates create workspace input before placeholder behavior", () => {
    expect(handleCreateWorkspace({ name: "", rootPath: "C:\\work" })).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "createWorkspace requires non-empty name and rootPath fields."
      }
    });

    expect(
      handleCreateWorkspace({ name: "Personal", rootPath: "C:\\work" })
    ).toEqual({
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Workspace filesystem operations are reserved for LWO-M1-003."
      }
    });
  });

  it("validates open workspace input before placeholder behavior", () => {
    expect(handleOpenWorkspace({ rootPath: "" })).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "openWorkspace requires a non-empty rootPath field."
      }
    });

    expect(handleOpenWorkspace({ rootPath: "C:\\work" })).toEqual({
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Workspace filesystem operations are reserved for LWO-M1-003."
      }
    });
  });
});

describe("database IPC handlers", () => {
  it("returns a disconnected health placeholder", () => {
    expect(handleGetDatabaseHealthStatus()).toEqual({
      ok: true,
      data: {
        connected: false,
        schemaVersion: null,
        workspaceExists: false,
        inboxExists: false,
        activityLogAvailable: false,
        searchIndexAvailable: false,
        databasePath: null
      }
    });
  });
});

describe("placeholder module IPC handlers", () => {
  it("documents future file IPC without enabling file operations", () => {
    expect(handleGetModuleStatus("files")).toEqual({
      ok: true,
      data: {
        module: "files",
        available: true,
        implemented: false,
        message:
          "File IPC is typed but awaits workspace filesystem service tickets."
      }
    });
  });
});
