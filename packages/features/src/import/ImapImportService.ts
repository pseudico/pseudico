import {
  ActivityLogService,
  AppSettingsRepository,
  ImapImportRepository,
  type DatabaseConnection,
  type ImapImportJobRecord
} from "@local-work-os/db";
import {
  ActivityAction,
  createLocalId,
  type ActivityActorType,
  type ActivityActionValue
} from "@local-work-os/core";
import {
  EmailImportService,
  parseEmailMessage,
  type EmailTaskImportSummary
} from "./EmailImportService";

export const IMAP_IMPORT_SETTINGS_KEY = "import.imap.settings.v1";

export type ImapImportFilterMode = "unread" | "label";

export type ImapImportFilter = {
  mode: ImapImportFilterMode;
  label?: string | null;
  limit?: number;
};

export type ImapImportSettings = {
  workspaceId: string;
  accountKey: string;
  displayName: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  mailbox: string;
  enabled: boolean;
  filter: ImapImportFilter;
  credentialStorage: "os_keychain" | "manual_session" | "not_configured";
  updatedAt: string;
};

export type SaveImapImportSettingsInput = Omit<
  ImapImportSettings,
  "accountKey" | "updatedAt" | "credentialStorage"
> & {
  accountKey?: string;
  password?: string;
  credentialStorage?: ImapImportSettings["credentialStorage"];
  actorType?: ActivityActorType;
};

export type ImapCredential = {
  password: string;
};

export type ImapCredentialStore = {
  get(accountKey: string): Promise<ImapCredential | null>;
  save?: (accountKey: string, credential: ImapCredential) => Promise<void>;
  delete?: (accountKey: string) => Promise<void>;
  kind?: "os_keychain" | "manual_session" | "not_configured";
};

export type ImapConnectionTestResult = {
  ok: boolean;
  accountKey: string;
  message: string;
  capabilities: string[];
};

export type ImapFetchedMessage = {
  uid: string;
  raw: string;
  messageId?: string | null;
  labels?: string[];
  flags?: string[];
  receivedAt?: string | null;
};

export type ImapClientAdapter = {
  testConnection: (
    settings: ImapImportSettings,
    credential: ImapCredential
  ) => Promise<ImapConnectionTestResult>;
  fetchMessages: (
    settings: ImapImportSettings,
    credential: ImapCredential,
    filter: ImapImportFilter
  ) => Promise<ImapFetchedMessage[]>;
};

export type ImportImapMessagesInput = {
  workspaceId: string;
  containerId: string;
  accountKey?: string;
  settings?: ImapImportSettings;
  actorType?: ActivityActorType;
};

export type ImapImportSkippedMessage = {
  uid: string;
  messageId: string | null;
  reason: "duplicate";
};

export type ImapTaskImportSummary = {
  job: ImapImportJobRecord;
  emailSummary: EmailTaskImportSummary;
  skippedDuplicates: ImapImportSkippedMessage[];
};

export class ImapImportService {
  readonly module = "imapImport";

  private readonly client: ImapClientAdapter;
  private readonly connection: DatabaseConnection;
  private readonly credentialStore: ImapCredentialStore;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    client?: ImapClientAdapter;
    credentialStore?: ImapCredentialStore;
    idFactory?: (prefix: string) => string;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.client = input.client ?? unavailableImapClientAdapter;
    this.credentialStore = input.credentialStore ?? unavailableCredentialStore;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  getSettings(workspaceId: string): ImapImportSettings | null {
    validateNonEmptyString(workspaceId, "workspaceId");
    const row = new AppSettingsRepository(this.connection).findByKey({
      workspaceId,
      settingKey: IMAP_IMPORT_SETTINGS_KEY
    });

    if (row === null) {
      return null;
    }

    return parseStoredSettings(row.valueJson, workspaceId);
  }

  async saveSettings(input: SaveImapImportSettingsInput): Promise<ImapImportSettings> {
    validateSettingsInput(input);
    const timestamp = this.now().toISOString();
    const accountKey = input.accountKey ?? createAccountKey(input);
    const credentialStorage = input.credentialStorage ?? this.credentialStore.kind ?? "not_configured";
    const settings: ImapImportSettings = {
      workspaceId: input.workspaceId,
      accountKey,
      displayName: input.displayName.trim(),
      host: input.host.trim(),
      port: input.port,
      secure: input.secure,
      username: input.username.trim(),
      mailbox: input.mailbox.trim(),
      enabled: input.enabled,
      filter: normalizeFilter(input.filter),
      credentialStorage,
      updatedAt: timestamp
    };

    if (input.password !== undefined) {
      if (this.credentialStore.save === undefined) {
        throw new Error("IMAP credential storage is not configured for this build.");
      }
      await this.credentialStore.save(accountKey, { password: input.password });
    }

    new AppSettingsRepository(this.connection).upsert({
      id: this.idFactory("setting"),
      workspaceId: input.workspaceId,
      settingKey: IMAP_IMPORT_SETTINGS_KEY,
      valueJson: JSON.stringify(settings),
      timestamp
    });

    logWorkspaceEvent({
      connection: this.connection,
      idFactory: this.idFactory,
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.workspacePreferencesUpdated,
      summary: `Updated optional local IMAP settings for ${settings.displayName}.`,
      after: settings
    });

    return settings;
  }

  async testConnection(input: {
    workspaceId: string;
    accountKey?: string;
    settings?: ImapImportSettings;
  }): Promise<ImapConnectionTestResult> {
    const settings = this.resolveSettings(input);
    const credential = await this.requireCredential(settings.accountKey);
    return this.client.testConnection(settings, credential);
  }

  async importMessages(input: ImportImapMessagesInput): Promise<ImapTaskImportSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    const settings = this.resolveSettings(input);
    const credential = await this.requireCredential(settings.accountKey);
    const timestamp = this.now().toISOString();
    const repository = new ImapImportRepository(this.connection);
    const job = repository.createJob({
      id: this.idFactory("imap_job"),
      workspaceId: input.workspaceId,
      accountKey: settings.accountKey,
      mailbox: settings.mailbox,
      filterJson: JSON.stringify(settings.filter),
      startedAt: timestamp,
      timestamp
    });

    try {
      const fetchedMessages = await this.client.fetchMessages(
        settings,
        credential,
        settings.filter
      );
      const importableMessages: Array<{
        fetched: ImapFetchedMessage;
        messageId: string | null;
        raw: string;
      }> = [];
      const skippedDuplicates: ImapImportSkippedMessage[] = [];

      for (const message of fetchedMessages) {
        validateNonEmptyString(message.uid, "message uid");
        const parsedMessageId = parseMessageId(message);
        const duplicate = repository.findImportedMessage({
          workspaceId: input.workspaceId,
          accountKey: settings.accountKey,
          mailbox: settings.mailbox,
          messageUid: message.uid,
          messageId: parsedMessageId
        });

        if (duplicate !== null) {
          skippedDuplicates.push({
            uid: message.uid,
            messageId: parsedMessageId,
            reason: "duplicate"
          });
          continue;
        }

        importableMessages.push({
          fetched: message,
          messageId: parsedMessageId,
          raw: message.raw
        });
      }

      const emailSummary = await new EmailImportService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).importMessagesAsTasks({
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        messages: importableMessages.map(({ fetched, raw }) => ({
          sourcePath: `imap://${settings.accountKey}/${encodeURIComponent(settings.mailbox)}/${encodeURIComponent(fetched.uid)}`,
          fileName: `${sanitizeFileName(fetched.uid)}.eml`,
          raw,
          sourceKind: "eml"
        })),
        actorType: input.actorType ?? "importer",
        extractTags: true
      });

      for (const result of emailSummary.results) {
        const imported = importableMessages.find(
          (message) =>
            `imap://${settings.accountKey}/${encodeURIComponent(settings.mailbox)}/${encodeURIComponent(message.fetched.uid)}` === result.message.sourcePath
        );

        if (imported === undefined) {
          continue;
        }

        repository.createImportedMessage({
          id: this.idFactory("imap_message"),
          workspaceId: input.workspaceId,
          accountKey: settings.accountKey,
          mailbox: settings.mailbox,
          messageUid: imported.fetched.uid,
          messageId: imported.messageId,
          itemId: result.task.item.id,
          importedAt: timestamp,
          timestamp
        });
      }

      const completedJob = repository.completeJob({
        jobId: job.id,
        status: emailSummary.issues.some((issue) => issue.code === "task_create_failed")
          ? "failed"
          : "completed",
        finishedAt: this.now().toISOString(),
        importedCount: emailSummary.importedCount,
        skippedDuplicateCount: skippedDuplicates.length,
        errorMessage: emailSummary.issues.length === 0 ? null : summarizeIssues(emailSummary.issues.map((issue) => issue.message))
      });

      logWorkspaceEvent({
        connection: this.connection,
        idFactory: this.idFactory,
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "importer",
        action: ActivityAction.imapImportCompleted,
        summary: `Imported ${completedJob.importedCount} IMAP message(s); skipped ${completedJob.skippedDuplicateCount} duplicate(s).`,
        after: completedJob
      });

      return {
        job: completedJob,
        emailSummary,
        skippedDuplicates
      };
    } catch (error) {
      const failedJob = repository.completeJob({
        jobId: job.id,
        status: "failed",
        finishedAt: this.now().toISOString(),
        importedCount: 0,
        skippedDuplicateCount: 0,
        errorMessage: error instanceof Error ? error.message : "IMAP import failed."
      });

      logWorkspaceEvent({
        connection: this.connection,
        idFactory: this.idFactory,
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "importer",
        action: ActivityAction.imapImportFailed,
        summary: failedJob.errorMessage ?? "IMAP import failed.",
        after: failedJob
      });

      throw error;
    }
  }

  private resolveSettings(input: {
    workspaceId: string;
    accountKey?: string;
    settings?: ImapImportSettings;
  }): ImapImportSettings {
    if (input.settings !== undefined) {
      if (input.settings.workspaceId !== input.workspaceId) {
        throw new Error("IMAP settings workspaceId must match the import workspace.");
      }
      return input.settings;
    }

    const settings = this.getSettings(input.workspaceId);
    if (settings === null) {
      throw new Error("IMAP import settings are not configured.");
    }

    if (input.accountKey !== undefined && input.accountKey !== settings.accountKey) {
      throw new Error("Only the saved IMAP account can be used in this workspace.");
    }

    return settings;
  }

  private async requireCredential(accountKey: string): Promise<ImapCredential> {
    const credential = await this.credentialStore.get(accountKey);

    if (credential === null || credential.password.length === 0) {
      throw new Error("IMAP credentials are not available. Store them in the OS keychain or provide them for this session.");
    }

    return credential;
  }
}

function parseStoredSettings(valueJson: string, workspaceId: string): ImapImportSettings {
  const parsed = JSON.parse(valueJson) as Partial<ImapImportSettings>;
  const candidate = {
    ...parsed,
    workspaceId
  };
  validateSettingsInput(candidate as SaveImapImportSettingsInput);
  return {
    workspaceId,
    accountKey: typeof parsed.accountKey === "string" && parsed.accountKey.trim().length > 0
      ? parsed.accountKey
      : createAccountKey(candidate as SaveImapImportSettingsInput),
    displayName: String(parsed.displayName),
    host: String(parsed.host),
    port: Number(parsed.port),
    secure: parsed.secure === true,
    username: String(parsed.username),
    mailbox: String(parsed.mailbox),
    enabled: parsed.enabled === true,
    filter: normalizeFilter(parsed.filter),
    credentialStorage: isCredentialStorage(parsed.credentialStorage)
      ? parsed.credentialStorage
      : "not_configured",
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString()
  };
}

function validateSettingsInput(input: SaveImapImportSettingsInput): void {
  validateNonEmptyString(input.workspaceId, "workspaceId");
  validateNonEmptyString(input.displayName, "displayName");
  validateNonEmptyString(input.host, "host");
  validateNonEmptyString(input.username, "username");
  validateNonEmptyString(input.mailbox, "mailbox");

  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
    throw new Error("IMAP port must be an integer from 1 to 65535.");
  }
}

function normalizeFilter(filter: Partial<ImapImportFilter> | undefined): ImapImportFilter {
  if (filter?.mode === "label") {
    const label = filter.label?.trim();
    if (label === undefined || label.length === 0) {
      throw new Error("Labelled IMAP import requires a label/mailbox flag.");
    }
    return { mode: "label", label, limit: normalizeLimit(filter.limit) };
  }

  return { mode: "unread", label: null, limit: normalizeLimit(filter?.limit) };
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return 50;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("IMAP import limit must be an integer from 1 to 500.");
  }
  return limit;
}

function createAccountKey(input: Pick<SaveImapImportSettingsInput, "host" | "port" | "username">): string {
  return `${input.username.trim().toLowerCase()}@${input.host.trim().toLowerCase()}:${input.port}`;
}

function isCredentialStorage(value: unknown): value is ImapImportSettings["credentialStorage"] {
  return value === "os_keychain" || value === "manual_session" || value === "not_configured";
}

function parseMessageId(message: ImapFetchedMessage): string | null {
  if (message.messageId !== undefined && message.messageId !== null && message.messageId.trim().length > 0) {
    return message.messageId.trim();
  }

  try {
    return parseEmailMessage({
      sourcePath: `imap:${message.uid}`,
      fileName: `${message.uid}.eml`,
      raw: message.raw
    }).messageId;
  } catch {
    return null;
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "message";
}

function summarizeIssues(messages: string[]): string {
  return messages.slice(0, 3).join("; ");
}

function logWorkspaceEvent(input: {
  connection: DatabaseConnection;
  idFactory: (prefix: string) => string;
  workspaceId: string;
  actorType: ActivityActorType;
  action: ActivityActionValue;
  summary: string;
  after: unknown;
}): void {
  new ActivityLogService({
    connection: input.connection,
    idFactory: input.idFactory
  }).logEvent({
    workspaceId: input.workspaceId,
    actorType: input.actorType,
    action: input.action,
    targetType: "workspace",
    targetId: input.workspaceId,
    summary: input.summary,
    afterJson: JSON.stringify(input.after)
  });
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

const unavailableCredentialStore: ImapCredentialStore = {
  kind: "not_configured",
  async get() {
    return null;
  }
};

const unavailableImapClientAdapter: ImapClientAdapter = {
  async testConnection() {
    throw new Error("No local IMAP client adapter is configured for this build.");
  },
  async fetchMessages() {
    throw new Error("No local IMAP client adapter is configured for this build.");
  }
};
