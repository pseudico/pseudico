import {
  ActivityLogRepository,
  ContainerRepository,
  LinkRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LinkMetadataService,
  LinkService,
  assertFetchableLinkMetadataUrl,
  networkFeatureDisabledMessage,
  type LinkMetadataFetcher
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("LinkMetadataService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("fetches metadata, persists it on the link, and refreshes activity/search", async () => {
    const linkService = createLinkService();
    const created = await linkService.createLink({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      url: "https://example.com/brief"
    });
    const fetcher = vi.fn<LinkMetadataFetcher>(async () =>
      htmlResponse(`<!doctype html>
        <html>
          <head>
            <title>Fallback title</title>
            <meta property="og:title" content="Fetched launch brief">
            <meta name="description" content="Fetched supplier reference">
            <meta property="og:image" content="/images/card.png">
            <link rel="icon" href="/favicon.ico">
          </head>
        </html>`)
    );

    const result = await new LinkMetadataService({
      fetcher,
      linkService,
      networkFeatureGuard: allowNetworkGuard()
    }).fetchAndApply({
      workspaceId: "workspace_1",
      itemId: created.item.id
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.com/brief",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.metadata).toEqual({
      title: "Fetched launch brief",
      description: "Fetched supplier reference",
      faviconUrl: "https://example.com/favicon.ico",
      previewImageUrl: "https://example.com/images/card.png"
    });
    expect(result.link.item).toMatchObject({
      title: "Fetched launch brief",
      body: "Fetched supplier reference"
    });
    expect(
      new LinkRepository(connection).getByItemId(created.item.id)
    ).toMatchObject({
      link: {
        title: "Fetched launch brief",
        description: "Fetched supplier reference",
        faviconPath: "https://example.com/favicon.ico",
        previewImagePath: "https://example.com/images/card.png"
      }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(["link_created", "link_updated"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.item.id
      })
    ).toMatchObject({
      title: "Fetched launch brief",
      body: expect.stringContaining("Fetched supplier reference")
    });
  });

  it("honors the opt-in network guard before making a request", async () => {
    const linkService = createLinkService();
    const created = await linkService.createLink({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      url: "https://example.com/brief"
    });
    const fetcher = vi.fn<LinkMetadataFetcher>(async () =>
      htmlResponse("<html><title>Never fetched</title></html>")
    );

    await expect(
      new LinkMetadataService({
        fetcher,
        linkService,
        networkFeatureGuard: {
          assertFeatureAllowed() {
            throw new Error(networkFeatureDisabledMessage("metadataFetch"));
          }
        }
      }).fetchAndApply({
        workspaceId: "workspace_1",
        itemId: created.item.id
      })
    ).rejects.toThrow("Link metadata fetching is disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects private and credentialed metadata fetch URLs", () => {
    expect(() => assertFetchableLinkMetadataUrl("file:///tmp/page.html")).toThrow(
      "HTTP or HTTPS"
    );
    expect(() =>
      assertFetchableLinkMetadataUrl("https://user:pass@example.com")
    ).toThrow("must not include credentials");
    expect(() =>
      assertFetchableLinkMetadataUrl("http://127.0.0.1:8080")
    ).toThrow("private network");
    expect(() =>
      assertFetchableLinkMetadataUrl("http://192.168.1.2/page")
    ).toThrow("private network");
  });
});

function createLinkService(): LinkService {
  return new LinkService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function allowNetworkGuard(): {
  assertFeatureAllowed(): void;
} {
  return {
    assertFeatureAllowed: () => undefined
  };
}

function htmlResponse(html: string): Awaited<ReturnType<LinkMetadataFetcher>> {
  return {
    ok: true,
    status: 200,
    url: "https://example.com/brief",
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type" ? "text/html" : null;
      }
    },
    async text() {
      return html;
    }
  };
}
