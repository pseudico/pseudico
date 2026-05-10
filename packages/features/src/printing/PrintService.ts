import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  type AttachmentRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type LinkRecord,
  type ListDetailsRecord,
  type ListItemRecord,
  type NoteDetailsRecord,
  type TaskRecord
} from "@local-work-os/db";

export type PrintSourceType = "selected_items" | "container" | "view";

export type BuildPrintHtmlInput = {
  workspaceId: string;
  title?: string;
  itemIds?: readonly string[];
  containerId?: string;
};

export type PrintHtmlDocument = {
  workspaceId: string;
  title: string;
  sourceType: PrintSourceType;
  sourceId: string;
  itemCount: number;
  generatedAt: string;
  html: string;
};

export type RecordPrintPdfExportInput = {
  workspaceId: string;
  relativePath: string;
  sizeBytes: number;
  sourceType: PrintSourceType;
  sourceId: string;
  itemCount: number;
  actorType?: ActivityActorType;
};

export type PrintPdfExportResult = RecordPrintPdfExportInput & {
  id: string;
  createdAt: string;
};

export type PrintServiceIdFactory = (prefix: string) => string;

export class PrintService {
  readonly module = "printing";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: PrintServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: PrintServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  buildPrintHtml(input: BuildPrintHtmlInput): PrintHtmlDocument {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const workspace = new WorkspaceRepository(this.connection).getById(
      input.workspaceId
    );

    if (workspace === null) {
      throw new Error(`Workspace row was not found: ${input.workspaceId}.`);
    }

    const generatedAt = createIsoTimestamp(this.now());
    const source = resolvePrintSource(this.connection, input);
    const hydratedItems = source.items.map((item) => hydratePrintableItem(this.connection, item));
    const title = input.title?.trim() || source.title;

    return {
      workspaceId: input.workspaceId,
      title,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      itemCount: hydratedItems.length,
      generatedAt,
      html: new PrintHtmlRenderer().render({
        title,
        subtitle: workspace.name,
        generatedAt,
        sourceLabel: source.sourceLabel,
        items: hydratedItems
      })
    };
  }

  recordPrintPdfExport(input: RecordPrintPdfExportInput): PrintPdfExportResult {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.relativePath, "relativePath");
    validateNonEmptyString(input.sourceId, "sourceId");

    const id = this.idFactory("export");
    const createdAt = createIsoTimestamp(this.now());

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.exportCreated,
      targetType: "export",
      targetId: id,
      summary: `Created print/PDF export ${input.relativePath}.`,
      beforeJson: null,
      afterJson: JSON.stringify({
        export: {
          id,
          kind: "print_pdf",
          relativePath: input.relativePath,
          sizeBytes: input.sizeBytes,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          itemCount: input.itemCount
        }
      }),
      timestamp: createdAt
    });

    return {
      ...input,
      id,
      createdAt
    };
  }
}

export type PrintableItem = {
  item: ItemRecord;
  tags: string[];
  task?: TaskRecord | null;
  note?: NoteDetailsRecord | null;
  list?: ListDetailsRecord | null;
  listItems?: ListItemRecord[];
  link?: LinkRecord | null;
  attachments?: AttachmentRecord[];
};

export type PrintHtmlRendererInput = {
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceLabel: string;
  items: readonly PrintableItem[];
};

export class PrintHtmlRenderer {
  render(input: PrintHtmlRendererInput): string {
    const body = input.items.length === 0
      ? `<p class="empty-state">No printable items were found for this view.</p>`
      : input.items.map((item) => this.renderItem(item)).join("\n");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; color: #25231f; background: #fff; }
    main { max-width: 840px; margin: 0 auto; padding: 32px; }
    header.print-header { border-bottom: 2px solid #dfddd4; margin-bottom: 24px; padding-bottom: 16px; }
    .eyebrow { color: #6d6a62; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 4px 0 8px; font-size: 30px; }
    h2 { border-bottom: 1px solid #ebe9e1; margin: 22px 0 10px; padding-bottom: 6px; font-size: 20px; }
    h3 { margin: 14px 0 8px; font-size: 16px; }
    article { break-inside: avoid; margin-bottom: 22px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 10px 0; }
    dt { color: #6d6a62; font-weight: 700; }
    dd { margin: 0; }
    .markdown, .body { white-space: normal; }
    .markdown p, .body p { margin: 8px 0; }
    .markdown ul { margin: 8px 0 8px 22px; padding: 0; }
    .tag-list { color: #245c55; }
    .list-row { margin-left: calc(var(--depth, 0) * 18px); }
    .empty-state { color: #6d6a62; font-style: italic; }
    @media print { main { padding: 16mm; } button { display: none; } }
  </style>
</head>
<body>
  <main>
    <header class="print-header">
      <p class="eyebrow">Local Work OS print/PDF</p>
      <h1>${escapeHtml(input.title)}</h1>
      <p>${escapeHtml(input.subtitle)} · ${escapeHtml(input.sourceLabel)} · Generated ${escapeHtml(input.generatedAt)}</p>
    </header>
    ${body}
  </main>
</body>
</html>`;
  }

  private renderItem(entry: PrintableItem): string {
    const item = entry.item;
    const tags = entry.tags.length === 0 ? "" : `<p class="tag-list">${entry.tags.map((tag) => `@${escapeHtml(tag)}`).join(" ")}</p>`;
    const details: Array<[string, string]> = [
      ["Type", item.type],
      ["Status", item.status],
      ["Created", item.createdAt],
      ["Updated", item.updatedAt]
    ];
    if (item.completedAt !== null) {
      details.push(["Completed", item.completedAt]);
    }
    if (item.categoryId !== null) {
      details.push(["Category ID", item.categoryId]);
    }

    return `<article data-item-id="${escapeHtml(item.id)}" data-item-type="${escapeHtml(item.type)}">
  <h2>${escapeHtml(item.title)}</h2>
  <dl>${details.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
  ${tags}
  ${this.renderBody(item)}
  ${this.renderTask(entry.task)}
  ${this.renderNote(entry.note)}
  ${this.renderList(entry.list, entry.listItems ?? [])}
  ${this.renderLink(entry.link)}
  ${this.renderAttachments(entry.attachments ?? [])}
</article>`;
  }

  private renderBody(item: ItemRecord): string {
    if (item.body === null || item.body.trim().length === 0) {
      return "";
    }

    return `<section class="body"><h3>Summary</h3>${renderMarkdown(item.body)}</section>`;
  }

  private renderTask(task: TaskRecord | null | undefined): string {
    if (task == null) {
      return "";
    }

    const rows: Array<[string, string]> = [
      ["Task status", task.taskStatus],
      ["Priority", task.priority === null ? "None" : String(task.priority)],
      ["Start", task.startAt ?? "Not set"],
      ["Due", task.dueAt ?? "Not set"]
    ];

    return `<section><h3>Task details</h3><dl>${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl></section>`;
  }

  private renderNote(note: NoteDetailsRecord | null | undefined): string {
    if (note == null || note.content.trim().length === 0) {
      return "";
    }

    return `<section class="markdown"><h3>Note</h3>${renderMarkdown(note.content)}</section>`;
  }

  private renderList(
    list: ListDetailsRecord | null | undefined,
    rows: readonly ListItemRecord[]
  ): string {
    if (list == null) {
      return "";
    }

    const content = rows.length === 0
      ? `<p class="empty-state">No list rows.</p>`
      : `<ul>${rows.map((row) => `<li class="list-row" style="--depth:${Math.max(0, row.depth)}"><strong>${escapeHtml(row.title)}</strong> <span>(${escapeHtml(row.status)})</span>${row.body === null ? "" : renderMarkdown(row.body)}</li>`).join("")}</ul>`;

    return `<section><h3>List</h3>${content}</section>`;
  }

  private renderLink(link: LinkRecord | null | undefined): string {
    if (link == null) {
      return "";
    }

    return `<section><h3>Link</h3><dl><dt>URL</dt><dd>${escapeHtml(link.url)}</dd>${link.description === null ? "" : `<dt>Description</dt><dd>${escapeHtml(link.description)}</dd>`}</dl></section>`;
  }

  private renderAttachments(attachments: readonly AttachmentRecord[]): string {
    if (attachments.length === 0) {
      return "";
    }

    return `<section><h3>Files</h3><ul>${attachments.map((attachment) => `<li><strong>${escapeHtml(attachment.originalName)}</strong> — ${formatBytes(attachment.sizeBytes)}<br><code>${escapeHtml(attachment.storagePath)}</code>${attachment.description === null ? "" : `<p>${escapeHtml(attachment.description)}</p>`}</li>`).join("")}</ul></section>`;
  }
}

export const printingModuleContract = {
  module: "printing",
  purpose: "Build sanitized local print/PDF views for selected items and containers.",
  owns: ["print HTML rendering", "print export activity records", "print source contracts"],
  doesNotOwn: ["cloud sharing", "renderer filesystem access", "remote PDF services"],
  integrationPoints: ["items", "containers", "files", "links", "activity log", "Electron printToPDF"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function resolvePrintSource(
  connection: DatabaseConnection,
  input: BuildPrintHtmlInput
): {
  sourceType: PrintSourceType;
  sourceId: string;
  sourceLabel: string;
  title: string;
  items: ItemRecord[];
} {
  const itemRepository = new ItemRepository(connection);

  if (input.itemIds !== undefined && uniqueIds(input.itemIds).length > 0) {
    const items = uniqueIds(input.itemIds).map((itemId) => requireWorkspaceItem(
      itemRepository,
      input.workspaceId,
      itemId
    ));

    return {
      sourceType: "selected_items",
      sourceId: items.map((item) => item.id).join(","),
      sourceLabel: `${items.length} selected item${items.length === 1 ? "" : "s"}`,
      title: input.title?.trim() || "Selected items",
      items
    };
  }

  if (input.containerId !== undefined) {
    validateNonEmptyString(input.containerId, "containerId");
    const container = new ContainerRepository(connection).getById(input.containerId);

    if (container === null) {
      throw new Error(`Container row was not found: ${input.containerId}.`);
    }

    if (container.workspaceId !== input.workspaceId) {
      throw new Error("Container workspaceId must match the target workspace.");
    }

    return {
      sourceType: "container",
      sourceId: container.id,
      sourceLabel: formatContainerLabel(container),
      title: input.title?.trim() || container.name,
      items: itemRepository.listByContainer(container.id)
    };
  }

  throw new Error("Print input requires itemIds or containerId.");
}

function hydratePrintableItem(
  connection: DatabaseConnection,
  item: ItemRecord
): PrintableItem {
  const entry: PrintableItem = {
    item,
    tags: new TagRepository(connection)
      .listTagsForTarget({
        workspaceId: item.workspaceId,
        targetType: "item",
        targetId: item.id
      })
      .map((tag) => tag.slug)
  };

  if (item.type === "task") {
    entry.task = new TaskRepository(connection).getDetailsByItemId(item.id);
  }

  if (item.type === "note") {
    entry.note = new NoteRepository(connection).getDetailsByItemId(item.id);
  }

  if (item.type === "list") {
    const listRepository = new ListRepository(connection);
    entry.list = listRepository.getDetailsByItemId(item.id);
    entry.listItems = listRepository.listItems(item.id);
  }

  if (item.type === "link") {
    entry.link = new LinkRepository(connection).getDetailsByItemId(item.id);
  }

  if (item.type === "file") {
    entry.attachments = new AttachmentRepository(connection).listForItem({
      workspaceId: item.workspaceId,
      itemId: item.id
    });
  }

  return entry;
}

function requireWorkspaceItem(
  itemRepository: ItemRepository,
  workspaceId: string,
  itemId: string
): ItemRecord {
  validateNonEmptyString(itemId, "itemId");
  const item = itemRepository.getById(itemId);

  if (item === null) {
    throw new Error(`Item was not found: ${itemId}.`);
  }

  if (item.workspaceId !== workspaceId) {
    throw new Error(`Item ${itemId} does not belong to workspace ${workspaceId}.`);
  }

  return item;
}

function renderMarkdown(markdown: string): string {
  const blocks: string[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading !== null) {
      flushList();
      const marker = heading[1] ?? "";
      const text = heading[2] ?? "";
      const level = marker.length + 2;
      blocks.push(`<h${level}>${escapeHtml(text)}</h${level}>`);
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet !== null) {
      listItems.push(`<li>${escapeHtml(bullet[1] ?? "")}</li>`);
      continue;
    }

    flushList();
    blocks.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();
  return blocks.join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function formatContainerLabel(container: ContainerRecord): string {
  switch (container.type) {
    case "project":
      return "Project";
    case "contact":
      return "Contact";
    case "inbox":
      return "Inbox";
    default:
      return container.type;
  }
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
