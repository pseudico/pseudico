import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { createDatabaseConnection, resolveWorkspaceDatabasePath } from "@local-work-os/db";
import { DemoWorkspaceService, type DemoWorkspaceSeedResult } from "@local-work-os/features";
import {
  ensureDirectoryInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../safeFileSystem";
import type { WorkspaceSummary } from "./WorkspaceManifest";

export type GenerateDemoWorkspaceInput = {
  workspace: WorkspaceSummary;
};

export class DemoWorkspaceGeneratorService {
  private readonly now: () => Date;

  constructor(input: { now?: () => Date } = {}) {
    this.now = input.now ?? (() => new Date());
  }

  async generateDemoWorkspace(
    input: GenerateDemoWorkspaceInput
  ): Promise<DemoWorkspaceSeedResult> {
    const sampleFile = createDemoAttachmentFile(this.now());
    await ensureDirectoryInsideWorkspace(
      input.workspace.rootPath,
      dirname(sampleFile.storagePath)
    );
    await writeTextFileInsideWorkspace(
      input.workspace.rootPath,
      sampleFile.storagePath,
      sampleFile.contents
    );

    const connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(input.workspace.rootPath)
    });

    try {
      return await new DemoWorkspaceService({
        connection,
        now: this.now
      }).seedDemoWorkspace({
        workspaceId: input.workspace.id,
        sampleFile: {
          originalName: sampleFile.originalName,
          storedName: sampleFile.storedName,
          storagePath: sampleFile.storagePath,
          mimeType: sampleFile.mimeType,
          sizeBytes: Buffer.byteLength(sampleFile.contents, "utf8"),
          checksum: createHash("sha256").update(sampleFile.contents).digest("hex")
        }
      });
    } finally {
      connection.close();
    }
  }
}

function createDemoAttachmentFile(now: Date): {
  contents: string;
  mimeType: string;
  originalName: string;
  storagePath: string;
  storedName: string;
} {
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const storedName = "demo-workspace-brief.md";
  const contents = [
    "# Local Work OS demo brief",
    "",
    "This file was generated locally for the optional demo workspace.",
    "It contains fictional sample content only and never requires a cloud service.",
    "",
    "Suggested tour:",
    "- Open Dashboard and Today.",
    "- Browse the Launch Readiness project.",
    "- Review demo contacts and relationships.",
    "- Search for @demo."
  ].join("\n");

  return {
    contents,
    mimeType: "text/markdown",
    originalName: "Demo Workspace Brief.md",
    storagePath: `attachments/${year}/${month}/demo-workspace/${storedName}`,
    storedName
  };
}
