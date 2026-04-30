import {
  GITKEEP_WORKSPACE_DIRECTORIES,
  REQUIRED_WORKSPACE_DIRECTORIES,
  WORKSPACE_FORMAT_VERSION,
  WORKSPACE_MANIFEST_FILE,
  createIsoTimestamp,
  createWorkspaceManifest,
  createWorkspacePaths,
  isWorkspaceManifest,
  workspaceSummaryFromManifest,
  type RecentWorkspaceEntry,
  type WorkspaceManifest,
  type WorkspaceSummary,
  type WorkspaceValidationProblem,
  type WorkspaceValidationResult
} from "./WorkspaceManifest";
import { WorkspaceFileSystemError } from "./WorkspaceFileSystemError";
import type { RecentWorkspacesService } from "./RecentWorkspacesService";
import {
  assertSafeWorkspaceRootPath,
  ensureDirectory,
  ensureDirectoryInsideWorkspace,
  isDirectory,
  localPathExists,
  readTextFileInsideWorkspace,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../safeFileSystem";

export type CreateWorkspaceServiceInput = {
  name: string;
  rootPath: string;
};

export type OpenWorkspaceServiceInput = {
  rootPath: string;
};

export type ValidateWorkspaceServiceInput = {
  rootPath: string;
  repair?: boolean;
};

export class WorkspaceFileSystemService {
  private readonly recentWorkspacesService: RecentWorkspacesService;
  private readonly now: () => Date;
  private currentWorkspace: WorkspaceSummary | null = null;

  constructor(input: {
    recentWorkspacesService: RecentWorkspacesService;
    now?: () => Date;
  }) {
    this.recentWorkspacesService = input.recentWorkspacesService;
    this.now = input.now ?? (() => new Date());
  }

  async createWorkspace(
    input: CreateWorkspaceServiceInput
  ): Promise<WorkspaceSummary> {
    const name = this.validateWorkspaceName(input.name);
    const workspaceRootPath = assertSafeWorkspaceRootPath(input.rootPath);
    const manifestPath = resolveInsideWorkspace(
      workspaceRootPath,
      WORKSPACE_MANIFEST_FILE
    );

    if (await localPathExists(manifestPath)) {
      throw new WorkspaceFileSystemError(
        "WORKSPACE_ERROR",
        "A workspace.json file already exists at this workspace path."
      );
    }

    await ensureDirectory(workspaceRootPath);
    await this.ensureWorkspaceStructure(workspaceRootPath);

    const manifest = createWorkspaceManifest({
      name,
      createdAt: this.now()
    });

    await this.writeWorkspaceManifest(workspaceRootPath, manifest);
    const summary = workspaceSummaryFromManifest(workspaceRootPath, manifest);
    await this.rememberWorkspace(summary);
    this.currentWorkspace = summary;

    return summary;
  }

  async openWorkspace(
    input: OpenWorkspaceServiceInput
  ): Promise<WorkspaceSummary> {
    const validation = await this.validateWorkspace({
      rootPath: input.rootPath,
      repair: true
    });

    if (!validation.ok || validation.manifest === undefined) {
      throw new WorkspaceFileSystemError(
        "WORKSPACE_ERROR",
        validation.problems[0]?.message ?? "Workspace validation failed."
      );
    }

    const lastOpenedAt = createIsoTimestamp(this.now());
    const manifest: WorkspaceManifest = {
      ...validation.manifest,
      lastOpenedAt
    };

    await this.writeWorkspaceManifest(validation.workspaceRootPath, manifest);
    const summary = workspaceSummaryFromManifest(
      validation.workspaceRootPath,
      manifest
    );
    await this.rememberWorkspace(summary);
    this.currentWorkspace = summary;

    return summary;
  }

  getCurrentWorkspace(): WorkspaceSummary | null {
    return this.currentWorkspace;
  }

  listRecentWorkspaces(): Promise<RecentWorkspaceEntry[]> {
    return this.recentWorkspacesService.listRecentWorkspaces();
  }

  async validateWorkspace(
    input: ValidateWorkspaceServiceInput
  ): Promise<WorkspaceValidationResult> {
    let workspaceRootPath: string;

    try {
      workspaceRootPath = assertSafeWorkspaceRootPath(input.rootPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workspace path is invalid.";
      const unsafeRootPath = input.rootPath.trim();
      const paths = createWorkspacePaths(unsafeRootPath);

      return {
        ok: false,
        workspaceRootPath: unsafeRootPath,
        paths,
        problems: [
          {
            code: "INVALID_WORKSPACE_PATH",
            message,
            severity: "error",
            repairable: false
          }
        ]
      };
    }

    const paths = createWorkspacePaths(workspaceRootPath);
    const problems: WorkspaceValidationProblem[] = [];

    if (!(await localPathExists(workspaceRootPath))) {
      return {
        ok: false,
        workspaceRootPath,
        paths,
        problems: [
          {
            code: "WORKSPACE_ROOT_MISSING",
            message: "Workspace folder does not exist.",
            severity: "error",
            repairable: false,
            path: workspaceRootPath
          }
        ]
      };
    }

    if (!(await isDirectory(workspaceRootPath))) {
      return {
        ok: false,
        workspaceRootPath,
        paths,
        problems: [
          {
            code: "WORKSPACE_ROOT_NOT_DIRECTORY",
            message: "Workspace path is not a directory.",
            severity: "error",
            repairable: false,
            path: workspaceRootPath
          }
        ]
      };
    }

    const manifest = await this.readValidatedManifest(
      workspaceRootPath,
      problems
    );

    if (manifest !== null) {
      await this.validateRequiredDirectories(
        workspaceRootPath,
        Boolean(input.repair),
        problems
      );
    }

    const ok = !problems.some((problem) => problem.severity === "error");
    const result = {
      ok,
      workspaceRootPath,
      paths,
      problems
    };

    return manifest === null ? result : { ...result, manifest };
  }

  async readWorkspaceManifest(
    workspaceRootPath: string
  ): Promise<WorkspaceManifest> {
    const contents = await readTextFileInsideWorkspace(
      assertSafeWorkspaceRootPath(workspaceRootPath),
      WORKSPACE_MANIFEST_FILE
    );
    const parsed = JSON.parse(contents) as unknown;

    if (!isWorkspaceManifest(parsed)) {
      throw new WorkspaceFileSystemError(
        "WORKSPACE_ERROR",
        "workspace.json does not match the Local Work OS manifest format."
      );
    }

    return parsed;
  }

  async writeWorkspaceManifest(
    workspaceRootPath: string,
    manifest: WorkspaceManifest
  ): Promise<void> {
    await writeTextFileInsideWorkspace(
      workspaceRootPath,
      WORKSPACE_MANIFEST_FILE,
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  }

  private async ensureWorkspaceStructure(
    workspaceRootPath: string
  ): Promise<void> {
    await Promise.all(
      REQUIRED_WORKSPACE_DIRECTORIES.map((directory) =>
        ensureDirectoryInsideWorkspace(workspaceRootPath, directory)
      )
    );
    await Promise.all(
      GITKEEP_WORKSPACE_DIRECTORIES.map((directory) =>
        writeTextFileInsideWorkspace(
          workspaceRootPath,
          `${directory}/.gitkeep`,
          ""
        )
      )
    );
  }

  private async validateRequiredDirectories(
    workspaceRootPath: string,
    repair: boolean,
    problems: WorkspaceValidationProblem[]
  ): Promise<void> {
    for (const directory of REQUIRED_WORKSPACE_DIRECTORIES) {
      const directoryPath = resolveInsideWorkspace(workspaceRootPath, directory);

      if (await isDirectory(directoryPath)) {
        continue;
      }

      if (repair) {
        await ensureDirectoryInsideWorkspace(workspaceRootPath, directory);

        if ((GITKEEP_WORKSPACE_DIRECTORIES as readonly string[]).includes(directory)) {
          await writeTextFileInsideWorkspace(
            workspaceRootPath,
            `${directory}/.gitkeep`,
            ""
          );
        }

        problems.push({
          code: "REQUIRED_DIRECTORY_REPAIRED",
          message: `Missing workspace directory was repaired: ${directory}.`,
          severity: "warning",
          repairable: true,
          path: directoryPath
        });
        continue;
      }

      problems.push({
        code: "REQUIRED_DIRECTORY_MISSING",
        message: `Workspace directory is missing: ${directory}.`,
        severity: "error",
        repairable: true,
        path: directoryPath
      });
    }
  }

  private async readValidatedManifest(
    workspaceRootPath: string,
    problems: WorkspaceValidationProblem[]
  ): Promise<WorkspaceManifest | null> {
    if (
      !(await localPathExists(
        resolveInsideWorkspace(workspaceRootPath, WORKSPACE_MANIFEST_FILE)
      ))
    ) {
      problems.push({
        code: "MANIFEST_MISSING",
        message: "workspace.json is missing.",
        severity: "error",
        repairable: false,
        path: resolveInsideWorkspace(workspaceRootPath, WORKSPACE_MANIFEST_FILE)
      });
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        await readTextFileInsideWorkspace(
          workspaceRootPath,
          WORKSPACE_MANIFEST_FILE
        )
      ) as unknown;
    } catch (error) {
      problems.push({
        code: "MANIFEST_INVALID_JSON",
        message:
          error instanceof Error
            ? `workspace.json is not valid JSON: ${error.message}`
            : "workspace.json is not valid JSON.",
        severity: "error",
        repairable: false,
        path: resolveInsideWorkspace(workspaceRootPath, WORKSPACE_MANIFEST_FILE)
      });
      return null;
    }

    if (!isWorkspaceManifest(parsed)) {
      problems.push({
        code: "MANIFEST_INVALID_SHAPE",
        message:
          "workspace.json does not match the Local Work OS manifest format.",
        severity: "error",
        repairable: false,
        path: resolveInsideWorkspace(workspaceRootPath, WORKSPACE_MANIFEST_FILE)
      });

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "app" in parsed &&
        typeof parsed.app === "object" &&
        parsed.app !== null &&
        "workspaceFormat" in parsed.app &&
        parsed.app.workspaceFormat !== WORKSPACE_FORMAT_VERSION
      ) {
        problems.push({
          code: "UNSUPPORTED_WORKSPACE_FORMAT",
          message: "workspace.json uses an unsupported workspace format.",
          severity: "error",
          repairable: false,
          path: resolveInsideWorkspace(
            workspaceRootPath,
            WORKSPACE_MANIFEST_FILE
          )
        });
      }

      return null;
    }

    return parsed;
  }

  private validateWorkspaceName(name: string): string {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new WorkspaceFileSystemError(
        "INVALID_INPUT",
        "Workspace name must be non-empty."
      );
    }

    return trimmed;
  }

  private async rememberWorkspace(summary: WorkspaceSummary): Promise<void> {
    await this.recentWorkspacesService.rememberRecentWorkspace({
      name: summary.name,
      rootPath: summary.rootPath,
      lastOpenedAt: summary.openedAt
    });
  }
}
