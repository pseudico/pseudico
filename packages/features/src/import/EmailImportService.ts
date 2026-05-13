import {
  createLocalId,
  parseInlineTagSlugs,
  type ActivityActorType,
  type AttachmentRecord
} from "@local-work-os/core";
import type { DatabaseConnection, TaskWithItemRecord } from "@local-work-os/db";
import {
  FileAttachmentService,
  type CopiedAttachmentFileInput
} from "../files/FileAttachmentService";
import { TaskService } from "../tasks/TaskService";

export type EmailImportSourceKind = "eml" | "maildir";

export type EmailImportMessageSource = {
  sourcePath: string;
  fileName: string;
  raw: string;
  sourceKind?: EmailImportSourceKind;
  copiedOriginal?: CopiedAttachmentFileInput;
};

export type ParsedEmailMessage = {
  sourcePath: string;
  fileName: string;
  subject: string;
  from: string | null;
  to: string | null;
  cc: string | null;
  date: string | null;
  messageId: string | null;
  textBody: string;
  htmlBody: string | null;
  sanitizedBody: string;
  inlineTags: string[];
};

export type EmailImportPreview = {
  sourcePath: string;
  fileName: string;
  subject: string;
  from: string | null;
  to: string | null;
  date: string | null;
  taskTitle: string;
  bodyPreview: string;
  inlineTags: string[];
  warning: string | null;
};

export type ImportEmailMessagesAsTasksInput = {
  workspaceId: string;
  containerId: string;
  messages: EmailImportMessageSource[];
  actorType?: ActivityActorType;
  containerTabId?: string | null;
  extractTags?: boolean;
};

export type EmailTaskImportResult = {
  message: ParsedEmailMessage;
  task: TaskWithItemRecord;
  originalAttachment: AttachmentRecord | null;
};

export type EmailImportIssue = {
  sourcePath: string;
  code: "empty_message" | "parse_failed" | "task_create_failed" | "attachment_failed";
  message: string;
};

export type EmailTaskImportSummary = {
  workspaceId: string;
  containerId: string;
  importedAt: string;
  importedCount: number;
  skippedCount: number;
  results: EmailTaskImportResult[];
  issues: EmailImportIssue[];
};

export type EmailImportServiceIdFactory = (prefix: string) => string;

export class EmailImportService {
  readonly module = "emailImport";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: EmailImportServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: EmailImportServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  previewMessages(messages: EmailImportMessageSource[]): EmailImportPreview[] {
    return messages.map((message) => {
      try {
        const parsed = parseEmailMessage(message);

        return {
          sourcePath: parsed.sourcePath,
          fileName: parsed.fileName,
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to,
          date: parsed.date,
          taskTitle: createTaskTitle(parsed),
          bodyPreview: truncatePreview(parsed.sanitizedBody),
          inlineTags: parsed.inlineTags,
          warning: parsed.sanitizedBody.length === 0 ? "Email body is empty." : null
        };
      } catch (error) {
        return {
          sourcePath: message.sourcePath,
          fileName: message.fileName,
          subject: "(unreadable email)",
          from: null,
          to: null,
          date: null,
          taskTitle: `Email: ${message.fileName}`,
          bodyPreview: "",
          inlineTags: [],
          warning: error instanceof Error ? error.message : "Email could not be parsed."
        };
      }
    });
  }

  async importMessagesAsTasks(
    input: ImportEmailMessagesAsTasksInput
  ): Promise<EmailTaskImportSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");

    const results: EmailTaskImportResult[] = [];
    const issues: EmailImportIssue[] = [];
    const importedAt = this.now().toISOString();
    const taskService = new TaskService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
    const fileService = new FileAttachmentService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    for (const source of input.messages) {
      if (source.raw.trim().length === 0) {
        issues.push({
          sourcePath: source.sourcePath,
          code: "empty_message",
          message: "Email file is empty."
        });
        continue;
      }

      let parsed: ParsedEmailMessage;
      try {
        parsed = parseEmailMessage(source);
      } catch (error) {
        issues.push({
          sourcePath: source.sourcePath,
          code: "parse_failed",
          message: error instanceof Error ? error.message : "Email parse failed."
        });
        continue;
      }

      try {
        const task = await taskService.createTask({
          workspaceId: input.workspaceId,
          containerId: input.containerId,
          ...(input.containerTabId === undefined
            ? {}
            : { containerTabId: input.containerTabId }),
          title: createTaskTitle(parsed),
          body: createTaskBody(parsed, input.extractTags !== false),
          actorType: input.actorType ?? "importer"
        });
        let originalAttachment: AttachmentRecord | null = null;

        if (source.copiedOriginal !== undefined) {
          try {
            originalAttachment = (
              await fileService.attachFileToItem({
                itemId: task.item.id,
                copiedFile: {
                  ...source.copiedOriginal,
                  mimeType: source.copiedOriginal.mimeType ?? "message/rfc822"
                },
                actorType: input.actorType ?? "importer",
                description: "Original imported email"
              })
            ).attachment;
          } catch (error) {
            issues.push({
              sourcePath: source.sourcePath,
              code: "attachment_failed",
              message:
                error instanceof Error
                  ? error.message
                  : "Original email attachment failed."
            });
          }
        }

        results.push({
          message: parsed,
          task,
          originalAttachment
        });
      } catch (error) {
        issues.push({
          sourcePath: source.sourcePath,
          code: "task_create_failed",
          message:
            error instanceof Error ? error.message : "Email task creation failed."
        });
      }
    }

    return {
      workspaceId: input.workspaceId,
      containerId: input.containerId,
      importedAt,
      importedCount: results.length,
      skippedCount: input.messages.length - results.length,
      results,
      issues
    };
  }
}

export function parseEmailMessage(
  source: EmailImportMessageSource
): ParsedEmailMessage {
  validateNonEmptyString(source.sourcePath, "sourcePath");
  validateNonEmptyString(source.fileName, "fileName");

  const normalizedRaw = source.raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const separatorIndex = normalizedRaw.search(/\n\n/);
  const headerText =
    separatorIndex === -1 ? normalizedRaw : normalizedRaw.slice(0, separatorIndex);
  const bodyText =
    separatorIndex === -1 ? "" : normalizedRaw.slice(separatorIndex + 2);
  const headers = parseHeaders(headerText);
  const subject = normalizeHeader(headers.get("subject")) ?? "(No subject)";
  const bodyParts = extractBodyParts(headers, bodyText);
  const sanitizedBody = sanitizeEmailBody(
    bodyParts.textBody.length > 0 ? bodyParts.textBody : (bodyParts.htmlBody ?? ""),
    bodyParts.textBody.length === 0 && bodyParts.htmlBody !== null
  );
  const inlineTags = Array.from(
    new Set(parseInlineTagSlugs(`${subject}\n${sanitizedBody}`))
  ).sort();

  return {
    sourcePath: source.sourcePath,
    fileName: source.fileName,
    subject,
    from: normalizeHeader(headers.get("from")),
    to: normalizeHeader(headers.get("to")),
    cc: normalizeHeader(headers.get("cc")),
    date: normalizeHeader(headers.get("date")),
    messageId: normalizeHeader(headers.get("message-id")),
    textBody: bodyParts.textBody,
    htmlBody: bodyParts.htmlBody,
    sanitizedBody,
    inlineTags
  };
}

export function sanitizeEmailBody(body: string, isHtml = false): string {
  const withoutDangerousHtml = isHtml
    ? body
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    : body;

  return decodeHtmlEntities(withoutDangerousHtml)
    .split("")
    .map((character) => sanitizeControlCharacter(character))
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeControlCharacter(character: string): string {
  const code = character.charCodeAt(0);

  if (code === 0) {
    return "";
  }

  if ((code > 0 && code < 9) || code === 11 || code === 12 || (code > 13 && code < 32) || code === 127) {
    return " ";
  }

  return character;
}

function parseHeaders(headerText: string): Map<string, string> {
  const headers = new Map<string, string>();
  let currentHeader: string | null = null;

  for (const line of headerText.split("\n")) {
    if (/^[ \t]/.test(line) && currentHeader !== null) {
      headers.set(currentHeader, `${headers.get(currentHeader) ?? ""} ${line.trim()}`);
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    currentHeader = line.slice(0, separatorIndex).trim().toLowerCase();
    headers.set(currentHeader, line.slice(separatorIndex + 1).trim());
  }

  return headers;
}

function extractBodyParts(
  headers: Map<string, string>,
  bodyText: string
): { textBody: string; htmlBody: string | null } {
  const contentType = headers.get("content-type") ?? "text/plain";
  const transferEncoding = (headers.get("content-transfer-encoding") ?? "")
    .trim()
    .toLowerCase();
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)?.[1]
    ?? /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)?.[2]
    ?? null;

  if (boundary === null || !/^multipart\//i.test(contentType)) {
    const decoded = decodeTransferBody(bodyText, transferEncoding);
    return /^text\/html/i.test(contentType)
      ? { textBody: "", htmlBody: decoded }
      : { textBody: decoded, htmlBody: null };
  }

  let textBody = "";
  let htmlBody: string | null = null;
  const boundaryMarker = `--${boundary}`;
  const sections = bodyText
    .split(boundaryMarker)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "--");

  for (const section of sections) {
    const normalized = section.replace(/--$/, "").trim();
    const separatorIndex = normalized.search(/\n\n/);

    if (separatorIndex === -1) {
      continue;
    }

    const partHeaders = parseHeaders(normalized.slice(0, separatorIndex));
    const partContentType = partHeaders.get("content-type") ?? "text/plain";
    const partEncoding = (partHeaders.get("content-transfer-encoding") ?? "")
      .trim()
      .toLowerCase();
    const decodedPart = decodeTransferBody(
      normalized.slice(separatorIndex + 2),
      partEncoding
    );

    if (textBody.length === 0 && /^text\/plain/i.test(partContentType)) {
      textBody = decodedPart;
    } else if (htmlBody === null && /^text\/html/i.test(partContentType)) {
      htmlBody = decodedPart;
    }
  }

  return { textBody, htmlBody };
}

function decodeTransferBody(body: string, encoding: string): string {
  if (encoding === "base64") {
    try {
      return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {
      return body;
    }
  }

  if (encoding === "quoted-printable") {
    return decodeQuotedPrintable(body);
  }

  return body;
}

function decodeQuotedPrintable(value: string): string {
  return value
    .replace(/=\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
}

function normalizeHeader(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const decoded = decodeMimeWords(value).replace(/\s+/g, " ").trim();
  return decoded.length === 0 ? null : decoded;
}

function decodeMimeWords(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g,
    (_match, charset: string, encoding: string, encoded: string) => {
      try {
        const normalizedCharset = charset.toLowerCase();
        if (normalizedCharset !== "utf-8" && normalizedCharset !== "us-ascii") {
          return encoded;
        }
        if (encoding.toLowerCase() === "b") {
          return Buffer.from(encoded, "base64").toString("utf8");
        }
        return decodeQuotedPrintable(encoded.replace(/_/g, " "));
      } catch {
        return encoded;
      }
    }
  );
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
    apos: "'"
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token) => {
    const entityToken = String(token);
    if (entityToken.startsWith("#x") || entityToken.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entityToken.slice(2), 16));
    }
    if (entityToken.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entityToken.slice(1), 10));
    }
    return namedEntities[entityToken] ?? entity;
  });
}

function createTaskTitle(message: ParsedEmailMessage): string {
  return `Email: ${message.subject}`.slice(0, 240);
}

function createTaskBody(
  message: ParsedEmailMessage,
  includeExtractedTags: boolean
): string {
  const metadataLines = [
    `From: ${message.from ?? "Unknown"}`,
    `To: ${message.to ?? "Unknown"}`,
    ...(message.cc === null ? [] : [`Cc: ${message.cc}`]),
    `Date: ${message.date ?? "Unknown"}`,
    `Source: ${message.fileName}`,
    ...(message.messageId === null ? [] : [`Message-ID: ${message.messageId}`])
  ];
  const tagLine =
    includeExtractedTags && message.inlineTags.length > 0
      ? [`Tags: ${message.inlineTags.map((tag) => `@${tag}`).join(" ")}`]
      : [];

  return [...metadataLines, ...tagLine, "", message.sanitizedBody]
    .join("\n")
    .trim();
}

function truncatePreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
