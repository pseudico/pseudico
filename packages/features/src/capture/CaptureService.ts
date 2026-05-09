import type { FeatureModuleContract } from "../featureModuleContract";
import { createLocalId, type ActivityActorType } from "@local-work-os/core";
import type { DatabaseConnection } from "@local-work-os/db";
import { InboxService } from "../inbox";
import { LinkService, type LinkMutationResult } from "../links";
import { TaskService, type TaskMutationResult } from "../tasks";

export type CaptureServiceIdFactory = (prefix: string) => string;

export type BrowserCapturePayload = {
  workspaceId: string;
  sourceUrl: string;
  actorType?: ActivityActorType;
  capturedAt?: string | null;
  pageTitle?: string | null;
  title?: string | null;
  description?: string | null;
  selectionText?: string | null;
  note?: string | null;
};

export type NormalizedBrowserCapture = {
  workspaceId: string;
  sourceUrl: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  description: string | null;
  selectionText: string | null;
  note: string | null;
  capturedAt: string | null;
};

export type CreateInboxLinkFromCaptureInput = BrowserCapturePayload & {
  pinned?: boolean;
};

export type CreateInboxTaskFromCaptureInput = BrowserCapturePayload & {
  taskTitle?: string | null;
  dueAt?: string | null;
  priority?: number | null;
};

export type CaptureLinkResult = {
  capture: NormalizedBrowserCapture;
  link: LinkMutationResult;
};

export type CaptureTaskResult = {
  capture: NormalizedBrowserCapture;
  task: TaskMutationResult;
};

const MAX_TITLE_LENGTH = 240;
const MAX_TEXT_LENGTH = 8_000;

export class CaptureService {
  readonly module = "capture";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: CaptureServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: CaptureServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  captureWebPage(input: BrowserCapturePayload): NormalizedBrowserCapture {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.sourceUrl, "sourceUrl");

    const linkService = this.createLinkService();
    const normalizedUrl = linkService.normaliseUrl(input.sourceUrl);
    const domain = linkService.extractDomain(normalizedUrl);
    const title =
      truncateText(
        normalizeNullableString(input.title) ??
          normalizeNullableString(input.pageTitle) ??
          domain,
        MAX_TITLE_LENGTH
      ) ?? domain;

    return {
      workspaceId: input.workspaceId,
      sourceUrl: input.sourceUrl.trim(),
      normalizedUrl,
      domain,
      title,
      description: truncateText(
        normalizeNullableString(input.description),
        MAX_TEXT_LENGTH
      ),
      selectionText: truncateText(
        normalizeNullableString(input.selectionText),
        MAX_TEXT_LENGTH
      ),
      note: truncateText(normalizeNullableString(input.note), MAX_TEXT_LENGTH),
      capturedAt: normalizeNullableString(input.capturedAt)
    };
  }

  async createInboxLinkFromCapture(
    input: CreateInboxLinkFromCaptureInput
  ): Promise<CaptureLinkResult> {
    const capture = this.captureWebPage(input);
    const inbox = this.createInboxService().getInbox(capture.workspaceId);
    const description = buildLinkDescription(capture);
    const link = await this.createLinkService().createLink({
      workspaceId: capture.workspaceId,
      containerId: inbox.id,
      url: capture.sourceUrl,
      title: capture.title,
      description,
      ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
      actorType: input.actorType ?? "local_user"
    });

    return { capture, link };
  }

  async createInboxTaskFromCapture(
    input: CreateInboxTaskFromCaptureInput
  ): Promise<CaptureTaskResult> {
    const capture = this.captureWebPage(input);
    const inbox = this.createInboxService().getInbox(capture.workspaceId);
    const taskTitle =
      truncateText(normalizeNullableString(input.taskTitle), MAX_TITLE_LENGTH) ??
      `Review ${capture.title}`;
    const task = await this.createTaskService().createTask({
      workspaceId: capture.workspaceId,
      containerId: inbox.id,
      title: taskTitle,
      body: buildTaskBody(capture),
      dueAt: input.dueAt ?? null,
      priority: input.priority ?? null,
      actorType: input.actorType ?? "local_user"
    });

    return { capture, task };
  }

  private createInboxService(): InboxService {
    return new InboxService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }

  private createLinkService(): LinkService {
    return new LinkService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }

  private createTaskService(): TaskService {
    return new TaskService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }
}

export const captureModuleContract = {
  module: "capture",
  purpose:
    "Normalize local browser-capture payloads and create Inbox links or tasks through existing services.",
  owns: ["capture payload contract", "Inbox link capture", "Inbox task capture"],
  doesNotOwn: ["browser extension publishing", "network listeners by default", "cloud capture"],
  integrationPoints: ["links", "tasks", "inbox", "activity", "search"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

function buildLinkDescription(capture: NormalizedBrowserCapture): string | null {
  const parts = [capture.description, capture.selectionText, capture.note].filter(
    (part): part is string => part !== null
  );

  return parts.length === 0 ? null : parts.join("\n\n");
}

function buildTaskBody(capture: NormalizedBrowserCapture): string {
  const lines = [`Source: ${capture.normalizedUrl}`];

  if (capture.description !== null) {
    lines.push("", capture.description);
  }

  if (capture.selectionText !== null) {
    lines.push("", "Selected text:", capture.selectionText);
  }

  if (capture.note !== null) {
    lines.push("", "Note:", capture.note);
  }

  return lines.join("\n");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function truncateText(value: string | null, maxLength: number): string | null {
  if (value === null || value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength).trimEnd();
}
