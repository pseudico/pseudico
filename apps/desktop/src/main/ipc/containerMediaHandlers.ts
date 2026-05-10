import { nativeImage } from "electron";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname } from "node:path";
import { createLocalId, type AttachmentRecord, type ContainerMediaRecord, type ContainerMediaRole } from "@local-work-os/core";
import { createDatabaseConnection, resolveWorkspaceDatabasePath, type DatabaseConnection } from "@local-work-os/db";
import { ContainerMediaService } from "@local-work-os/features";
import {
  apiError, apiOk, type ApiResult, type ChooseAndSetContainerMediaInput, type ContainerMediaSummary, type WorkspaceSummary
} from "../../preload/api";
import { copyFileIntoWorkspace, ensureDirectory, localPathExists, resolveInsideWorkspace, validateWorkspaceRelativePath, writeBinaryFileInsideWorkspace, type CopiedWorkspaceFile } from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;

export type ContainerMediaIpcPlatform = { chooseSourcePath: () => Promise<string | null> };

export function createContainerMediaIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: ContainerMediaIpcPlatform = { chooseSourcePath: async () => null }
) {
  return {
    async handleChooseAndSet(input: unknown): Promise<ApiResult<ContainerMediaSummary | null>> {
      if (!isChooseAndSetContainerMediaInput(input)) return apiError("INVALID_INPUT", "chooseAndSet requires containerId and role.");
      const sourcePath = await platform.chooseSourcePath();
      if (sourcePath === null) return apiOk(null);
      return await withContainerMediaService(workspaceService, async (context) => {
        const copiedFile = await copyFileIntoWorkspace({ workspaceRootPath: context.workspace.rootPath, sourcePath, attachmentId: createLocalId("attachment") });
        const thumbnailStoragePath = await createThumbnail({ workspace: context.workspace, copiedFile, role: input.role });
        const result = await context.service.setContainerMedia({
          workspaceId: context.workspace.id,
          containerId: input.containerId,
          role: input.role,
          copiedFile,
          thumbnailStoragePath,
          ...(input.altText === undefined ? {} : { altText: input.altText })
        });
        if (result.media === null || result.attachment === null) return apiError("WORKSPACE_ERROR", "Container media was not created.");
        return apiOk(await toContainerMediaSummary(context.workspace, result.media, result.attachment));
      });
    },

    async handleGetActive(input: unknown): Promise<ApiResult<ContainerMediaSummary | null>> {
      if (!isGetActiveInput(input)) return apiError("INVALID_INPUT", "getActive requires containerId and role.");
      return await withContainerMediaService(workspaceService, async (context) => {
        const media = context.service.getActiveMedia(input.containerId, input.role);
        if (media === null) return apiOk(null);
        const attachment = context.service.getAttachmentForMedia(media);
        if (attachment === null) return apiError("WORKSPACE_ERROR", "Container media attachment was not found.");
        return apiOk(await toContainerMediaSummary(context.workspace, media, attachment));
      });
    },

    async handleRemove(input: unknown): Promise<ApiResult<ContainerMediaSummary | null>> {
      if (!isGetActiveInput(input)) return apiError("INVALID_INPUT", "remove requires containerId and role.");
      return await withContainerMediaService(workspaceService, async (context) => {
        const before = context.service.getActiveMedia(input.containerId, input.role);
        const beforeAttachment = before === null ? null : context.service.getAttachmentForMedia(before);
        await context.service.removeContainerMedia(input);
        if (before === null || beforeAttachment === null) return apiOk(null);
        return apiOk(await toContainerMediaSummary(context.workspace, { ...before, deletedAt: new Date().toISOString() }, beforeAttachment));
      });
    }
  };
}

async function withContainerMediaService<T>(workspaceService: CurrentWorkspaceService, operation: (context: { connection: DatabaseConnection; service: ContainerMediaService; workspace: WorkspaceSummary }) => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();
  if (workspace === null) return apiError("WORKSPACE_ERROR", "No workspace is open.");
  const connection = await createDatabaseConnection({ databasePath: resolveWorkspaceDatabasePath(workspace.rootPath), fileMustExist: true });
  try { return await operation({ connection, service: new ContainerMediaService({ connection }), workspace }); }
  catch (error) { return apiError("WORKSPACE_ERROR", error instanceof Error ? error.message : "Container media operation failed."); }
  finally { connection.close(); }
}

async function createThumbnail(input: { workspace: WorkspaceSummary; copiedFile: CopiedWorkspaceFile; role: ContainerMediaRole }): Promise<string | null> {
  const sourcePath = resolveInsideWorkspace(input.workspace.rootPath, input.copiedFile.storagePath);
  const image = nativeImage.createFromPath(sourcePath);
  if (image.isEmpty()) return null;
  const size = input.role === "project_banner" ? { width: 1200, height: 360 } : { width: 256, height: 256 };
  const thumbnail = image.resize(size);
  const ext = extname(input.copiedFile.storedName) || ".png";
  const name = `${basename(input.copiedFile.storedName, ext)}-thumb.png`;
  const parent = dirname(input.copiedFile.storagePath).replace(/\\/g, "/");
  const storagePath = validateWorkspaceRelativePath(`${parent}/thumbnails/${name}`);
  await ensureDirectory(dirname(resolveInsideWorkspace(input.workspace.rootPath, storagePath)));
  await writeBinaryFileInsideWorkspace(input.workspace.rootPath, storagePath, thumbnail.toPNG());
  return storagePath;
}

async function toContainerMediaSummary(workspace: WorkspaceSummary, media: ContainerMediaRecord, attachment: AttachmentRecord): Promise<ContainerMediaSummary> {
  const thumbnailPath = media.thumbnailStoragePath ?? attachment.storagePath;
  const fullPath = resolveInsideWorkspace(workspace.rootPath, attachment.storagePath);
  const thumbPath = resolveInsideWorkspace(workspace.rootPath, thumbnailPath);
  const exists = await localPathExists(fullPath);
  const thumbnailExists = await localPathExists(thumbPath);
  return {
    id: media.id, workspaceId: media.workspaceId, containerId: media.containerId, attachmentId: media.attachmentId, role: media.role,
    thumbnailStoragePath: media.thumbnailStoragePath, altText: media.altText, originalName: attachment.originalName, mimeType: attachment.mimeType, storagePath: attachment.storagePath,
    exists, thumbnailExists, previewDataUrl: thumbnailExists ? await readImageDataUrl(thumbPath, media.thumbnailStoragePath === null ? attachment.mimeType : "image/png") : null,
    createdAt: media.createdAt, updatedAt: media.updatedAt, deletedAt: media.deletedAt
  };
}

async function readImageDataUrl(path: string, mimeType: string | null): Promise<string> {
  const data = await readFile(path);
  const mime = mimeType?.startsWith("image/") ? mimeType : "image/png";
  return `data:${mime};base64,${data.toString("base64")}`;
}
function isChooseAndSetContainerMediaInput(input: unknown): input is ChooseAndSetContainerMediaInput { return isRecord(input) && isNonEmptyString(input.containerId) && isRole(input.role) && (input.altText === undefined || input.altText === null || typeof input.altText === "string"); }
function isGetActiveInput(input: unknown): input is { containerId: string; role: ContainerMediaRole } { return isRecord(input) && isNonEmptyString(input.containerId) && isRole(input.role); }
function isRole(value: unknown): value is ContainerMediaRole { return value === "project_banner" || value === "contact_avatar"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }

