import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  CalendarFeedRepository,
  SearchIndexRepository,
  TransactionService,
  type CalendarEventRecord,
  type CalendarSourceRecord,
  type DatabaseConnection,
  type UpsertCalendarEventInput
} from "@local-work-os/db";
import type { NetworkFeatureId } from "../privacy";

export type IcsImportSourceType = "file" | "network";

export type IcsImportInput = {
  workspaceId: string;
  sourceName: string;
  icsText: string;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  sourceType?: IcsImportSourceType;
  networkEnabled?: boolean;
  actorType?: ActivityActorType;
};

export type IcsImportResult = {
  source: CalendarSourceRecord;
  importedEventCount: number;
  skippedEventCount: number;
  events: CalendarEventRecord[];
};

export type CalendarFeedEventView = CalendarEventRecord & {
  kind: "calendar_event";
  readOnly: true;
  sourceName: string;
  navigationTarget: {
    targetType: "calendar_event";
    targetId: string;
    workspaceId: string;
    sourceId: string;
  };
};

export type CalendarFeedServiceIdFactory = (prefix: string) => string;
export type CalendarNetworkFeatureGuard = {
  assertFeatureAllowed: (
    workspaceId: string,
    featureId: Extract<NetworkFeatureId, "icsUrlImport">
  ) => void;
};

export class CalendarFeedService {
  readonly module = "calendar.feeds";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: CalendarFeedServiceIdFactory;
  private readonly networkFeatureGuard: CalendarNetworkFeatureGuard | null;
  private readonly now: Clock;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: CalendarFeedServiceIdFactory;
    networkFeatureGuard?: CalendarNetworkFeatureGuard;
    now?: Clock;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.networkFeatureGuard = input.networkFeatureGuard ?? null;
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async importIcs(input: IcsImportInput): Promise<IcsImportResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.sourceName, "sourceName");
    validateNonEmptyString(input.icsText, "icsText");

    const sourceType = input.sourceType ?? (input.sourceUrl === undefined || input.sourceUrl === null ? "file" : "network");

    if (sourceType === "network" && input.networkEnabled !== true) {
      throw new Error("Network calendar feeds are disabled. Enable the explicit network preference before importing a URL feed.");
    }

    if (sourceType === "network") {
      this.networkFeatureGuard?.assertFeatureAllowed(
        input.workspaceId,
        "icsUrlImport"
      );
    }

    if (sourceType === "network" && !isSafeCalendarUrl(input.sourceUrl)) {
      throw new Error("Network calendar feeds require an http(s) sourceUrl.");
    }

    const parsedEvents = parseIcsEvents(input.icsText);
    const timestamp = createIsoTimestamp(this.now());

    return await this.transactionService.runInTransaction(() => {
      const repository = new CalendarFeedRepository(this.connection);
      const source = repository.upsertSource({
        id: this.idFactory("calendar_source"),
        workspaceId: input.workspaceId,
        name: input.sourceName.trim(),
        sourceType,
        sourcePath: input.sourcePath ?? null,
        sourceUrl: input.sourceUrl ?? null,
        networkEnabled: sourceType === "network" && input.networkEnabled === true,
        readOnly: true,
        importedAt: timestamp,
        timestamp
      });
      const validEvents = parsedEvents.filter((event) => event.startAt !== null && event.endAt !== null);
      const events = repository.replaceEventsForSource({
        sourceId: source.id,
        workspaceId: input.workspaceId,
        timestamp,
        events: validEvents.map((event): UpsertCalendarEventInput => ({
          id: this.idFactory("calendar_event"),
          workspaceId: input.workspaceId,
          sourceId: source.id,
          externalUid: event.uid,
          title: event.summary,
          description: event.description,
          location: event.location,
          startAt: event.startAt!,
          endAt: event.endAt!,
          allDay: event.allDay,
          timezone: event.timezone,
          rawJson: JSON.stringify(event.raw),
          timestamp
        }))
      });

      for (const event of events) {
        this.indexEvent(event, source.name, timestamp);
      }

      this.logImport({
        workspaceId: input.workspaceId,
        source,
        importedEventCount: events.length,
        skippedEventCount: parsedEvents.length - validEvents.length,
        actorType: input.actorType ?? "importer",
        timestamp
      });

      return {
        source,
        importedEventCount: events.length,
        skippedEventCount: parsedEvents.length - validEvents.length,
        events
      };
    });
  }

  listSources(workspaceId: string): CalendarSourceRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");
    return new CalendarFeedRepository(this.connection).listSources(workspaceId);
  }

  listEventsBetween(input: {
    workspaceId: string;
    startInclusive: string;
    endExclusive: string;
  }): CalendarFeedEventView[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const repository = new CalendarFeedRepository(this.connection);
    const sourceNames = new Map(
      repository.listSources(input.workspaceId).map((source) => [source.id, source.name])
    );

    return repository.listEventsBetween(input).map((event) => ({
      ...event,
      kind: "calendar_event",
      readOnly: true,
      sourceName: sourceNames.get(event.sourceId) ?? "Imported calendar",
      navigationTarget: {
        targetType: "calendar_event",
        targetId: event.id,
        workspaceId: event.workspaceId,
        sourceId: event.sourceId
      }
    }));
  }

  private indexEvent(event: CalendarEventRecord, sourceName: string, timestamp: string): void {
    new SearchIndexRepository(this.connection).upsert({
      id: this.idFactory("search"),
      workspaceId: event.workspaceId,
      targetType: "saved_view",
      targetId: `calendar_event:${event.id}`,
      title: event.title,
      body: [event.description ?? "", event.location ?? "", sourceName].filter(Boolean).join("\n"),
      category: "Calendar feed",
      metadataJson: JSON.stringify({
        kind: "calendar_event",
        sourceId: event.sourceId,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay
      }),
      timestamp
    });
  }

  private logImport(input: {
    workspaceId: string;
    source: CalendarSourceRecord;
    importedEventCount: number;
    skippedEventCount: number;
    actorType: ActivityActorType;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.calendarFeedImported,
      targetType: "export",
      targetId: input.source.id,
      summary: `Imported ${input.importedEventCount} read-only calendar events from "${input.source.name}".`,
      beforeJson: null,
      afterJson: JSON.stringify({
        source: input.source,
        importedEventCount: input.importedEventCount,
        skippedEventCount: input.skippedEventCount
      }),
      timestamp: input.timestamp
    });
  }
}

type ParsedIcsEvent = {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  timezone: string | null;
  raw: Record<string, string>;
};

export function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(icsText);
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current !== null) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (current === null) {
      continue;
    }

    const parsed = parseIcsProperty(line);
    if (parsed !== null) {
      current[parsed.key] = parsed.value;
      for (const [parameterKey, parameterValue] of Object.entries(parsed.parameters)) {
        current[`${parsed.key};${parameterKey}`] = parameterValue;
      }
    }
  }

  return events.map(toParsedIcsEvent);
}

function toParsedIcsEvent(raw: Record<string, string>): ParsedIcsEvent {
  const uid = normalizeIcsText(raw.UID ?? "") || createFallbackUid(raw);
  const start = parseIcsDate(raw.DTSTART ?? "", raw["DTSTART;TZID"] ?? null);
  const explicitEnd = parseIcsDate(raw.DTEND ?? "", raw["DTEND;TZID"] ?? null);
  const endAt = explicitEnd.iso ?? inferEnd(start);

  return {
    uid,
    summary: normalizeIcsText(raw.SUMMARY ?? "Untitled calendar event"),
    description: nullableText(raw.DESCRIPTION),
    location: nullableText(raw.LOCATION),
    startAt: start.iso,
    endAt,
    allDay: start.allDay,
    timezone: raw["DTSTART;TZID"] ?? raw["DTEND;TZID"] ?? null,
    raw
  };
}

function unfoldIcsLines(icsText: string): string[] {
  const physicalLines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  for (const physicalLine of physicalLines) {
    if (/^[ \t]/.test(physicalLine) && lines.length > 0) {
      lines[lines.length - 1] += physicalLine.slice(1);
      continue;
    }

    const trimmedEnd = physicalLine.trimEnd();
    if (trimmedEnd.length > 0) {
      lines.push(trimmedEnd);
    }
  }

  return lines;
}

function parseIcsProperty(line: string): { key: string; parameters: Record<string, string>; value: string } | null {
  const delimiter = line.indexOf(":");
  if (delimiter === -1) {
    return null;
  }
  const nameAndParams = line.slice(0, delimiter);
  const value = line.slice(delimiter + 1);
  const [name, ...parameterParts] = nameAndParams.split(";");
  if (name === undefined) {
    return null;
  }
  const parameters: Record<string, string> = {};
  for (const parameter of parameterParts) {
    const [key, parameterValue] = parameter.split("=");
    if (key !== undefined && parameterValue !== undefined) {
      parameters[key.toUpperCase()] = parameterValue;
    }
  }
  return { key: name.toUpperCase(), parameters, value };
}

function parseIcsDate(value: string, timezone: string | null): { iso: string | null; allDay: boolean } {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return { iso: `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T00:00:00.000Z`, allDay: true };
  }

  const utcMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(trimmed);
  if (utcMatch !== null) {
    return { iso: `${utcMatch[1]}-${utcMatch[2]}-${utcMatch[3]}T${utcMatch[4]}:${utcMatch[5]}:${utcMatch[6]}.000Z`, allDay: false };
  }

  const localMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(trimmed);
  if (localMatch !== null) {
    const suffix = timezone === null ? "Z" : "";
    const parsed = new Date(`${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}:${localMatch[6]}${suffix}`);
    return Number.isNaN(parsed.getTime()) ? { iso: null, allDay: false } : { iso: parsed.toISOString(), allDay: false };
  }

  return { iso: null, allDay: false };
}

function inferEnd(start: { iso: string | null; allDay: boolean }): string | null {
  if (start.iso === null) {
    return null;
  }
  const date = new Date(start.iso);
  date.setUTCDate(date.getUTCDate() + (start.allDay ? 1 : 0));
  if (!start.allDay) {
    date.setUTCHours(date.getUTCHours() + 1);
  }
  return date.toISOString();
}

function normalizeIcsText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function nullableText(value: string | undefined): string | null {
  const normalized = normalizeIcsText(value ?? "");
  return normalized.length === 0 ? null : normalized;
}

function createFallbackUid(raw: Record<string, string>): string {
  return [raw.DTSTART ?? "missing-start", raw.SUMMARY ?? "Untitled calendar event"].join(":");
}

function isSafeCalendarUrl(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
