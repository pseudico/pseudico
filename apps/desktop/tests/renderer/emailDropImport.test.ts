import { describe, expect, it } from "vitest";
import { apiError, apiOk } from "../../src/preload/api";
import {
  formatEmailDropImportMessage,
  importEmailDropSources,
  isEmailImportSourcePath,
  splitEmailDropSourcePaths
} from "../../src/renderer/utils/emailDropImport";

describe("email drop import helpers", () => {
  it("classifies EML and Maildir message paths without treating normal files as emails", () => {
    expect(isEmailImportSourcePath("C:\\Inbox\\message.eml")).toBe(true);
    expect(isEmailImportSourcePath("/mail/cur/1710000:2,S")).toBe(true);
    expect(isEmailImportSourcePath("/mail/new/1710001")).toBe(true);
    expect(isEmailImportSourcePath("C:\\Docs\\message.pdf")).toBe(false);
  });

  it("splits mixed drops so emails are imported before regular file attachment", () => {
    expect(
      splitEmailDropSourcePaths([
        "C:\\Inbox\\message.eml",
        "C:\\Docs\\brief.pdf",
        "/mail/cur/1710000:2,S"
      ])
    ).toEqual({
      emailSourcePaths: ["C:\\Inbox\\message.eml", "/mail/cur/1710000:2,S"],
      attachmentSourcePaths: ["C:\\Docs\\brief.pdf"]
    });
  });

  it("aggregates imports and preserves per-source failures", async () => {
    const summary = await importEmailDropSources(
      ["C:\\Inbox\\first.eml", "C:\\Inbox\\bad.eml"],
      async (sourcePath) =>
        sourcePath.endsWith("bad.eml")
          ? apiError("WORKSPACE_ERROR", "Could not parse bad.eml")
          : apiOk({
              workspaceId: "workspace_1",
              containerId: "container_inbox",
              importedAt: "2026-05-15T00:00:00.000Z",
              importedCount: 1,
              skippedCount: 0,
              importedTasks: [
                {
                  itemId: "item_email_1",
                  title: "First email",
                  sourcePath,
                  attachmentId: "attachment_1"
                }
              ],
              issues: []
            })
    );

    expect(summary).toEqual({
      importedCount: 1,
      skippedCount: 0,
      issueCount: 0,
      errors: ["Could not parse bad.eml"]
    });
  });

  it("formats imported, skipped, and issue counts for drop feedback", () => {
    expect(
      formatEmailDropImportMessage({ importedCount: 2, skippedCount: 1, issueCount: 1 })
    ).toBe("Imported 2 emails as tasks. Skipped 1. 1 issue reported.");
  });
});
