import {
  ActivityLogRepository,
  CalendarFeedRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CalendarFeedService, CalendarService, parseIcsEvents } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date("2026-05-15T09:30:00.000Z");
const TIMESTAMP = "2026-05-01T00:00:00.000Z";
const ICS_FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Local Work OS Test//EN
BEGIN:VEVENT
UID:event-1@example.test
SUMMARY:Board review
DESCRIPTION:Review local-only launch plan
LOCATION:Office
DTSTART:20260515T100000Z
DTEND:20260515T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.test
SUMMARY:All-day planning
DTSTART:20260516
DTEND:20260517
END:VEVENT
END:VCALENDAR`;

describe("CalendarFeedService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 14,
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("parses ICS fixtures including timed and all-day events", () => {
    expect(parseIcsEvents(ICS_FIXTURE)).toMatchObject([
      {
        uid: "event-1@example.test",
        summary: "Board review",
        description: "Review local-only launch plan",
        location: "Office",
        startAt: "2026-05-15T10:00:00.000Z",
        endAt: "2026-05-15T11:00:00.000Z",
        allDay: false
      },
      {
        uid: "event-2@example.test",
        summary: "All-day planning",
        startAt: "2026-05-16T00:00:00.000Z",
        endAt: "2026-05-17T00:00:00.000Z",
        allDay: true
      }
    ]);
  });

  it("imports a local ICS file as read-only calendar source rows with activity and search records", async () => {
    const service = createCalendarFeedService();
    const result = await service.importIcs({
      workspaceId: "workspace_1",
      sourceName: "Local events",
      sourcePath: "imports/local-events.ics",
      icsText: ICS_FIXTURE
    });

    expect(result.importedEventCount).toBe(2);
    expect(result.skippedEventCount).toBe(0);
    expect(result.source).toMatchObject({
      workspaceId: "workspace_1",
      name: "Local events",
      sourceType: "file",
      readOnly: true,
      networkEnabled: false
    });
    expect(new CalendarFeedRepository(connection).listEventsBetween({
      workspaceId: "workspace_1",
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-05-17T00:00:00.000Z"
    }).map((event) => event.title)).toEqual(["Board review", "All-day planning"]);
    expect(new ActivityLogRepository(connection).listRecent("workspace_1", 1)[0])
      .toMatchObject({ action: "calendar_feed_imported", targetType: "export" });
    expect(new SearchIndexRepository(connection).search("workspace_1", "Board review")[0])
      .toMatchObject({ targetType: "saved_view", title: "Board review" });
  });

  it("shows imported read-only events in calendar day buckets", async () => {
    await createCalendarFeedService().importIcs({
      workspaceId: "workspace_1",
      sourceName: "Local events",
      icsText: ICS_FIXTURE
    });

    const month = new CalendarService({ connection, now: () => NOW }).getCalendarMonth({
      workspaceId: "workspace_1",
      month: "2026-05"
    });
    const may15 = month.days.find((day) => day.date === "2026-05-15");

    expect(may15?.items).toMatchObject([
      {
        kind: "calendar_event",
        title: "Board review",
        containerName: "Local events",
        status: "read_only",
        navigationTarget: { targetType: "calendar_event" }
      }
    ]);
  });

  it("blocks network ICS imports unless the network preference is explicit", async () => {
    await expect(createCalendarFeedService().importIcs({
      workspaceId: "workspace_1",
      sourceName: "Remote events",
      sourceType: "network",
      sourceUrl: "https://example.test/calendar.ics",
      icsText: ICS_FIXTURE
    })).rejects.toThrow("Network calendar feeds are disabled");

    await expect(createCalendarFeedService().importIcs({
      workspaceId: "workspace_1",
      sourceName: "Remote events",
      sourceType: "network",
      sourceUrl: "https://example.test/calendar.ics",
      networkEnabled: true,
      icsText: ICS_FIXTURE
    })).resolves.toMatchObject({ importedEventCount: 2 });
  });
});

function createCalendarFeedService(): CalendarFeedService {
  return new CalendarFeedService({
    connection,
    now: () => NOW,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    }
  });
}
