import type {
  AttachmentRecord,
  ContainerRecord,
  ItemRecord,
  LinkRecord,
  ListDetailsRecord,
  ListItemRecord,
  NoteDetailsRecord,
  TaskRecord
} from "@local-work-os/db";

export type ProjectMarkdownExportItem = {
  item: ItemRecord;
  task?: TaskRecord;
  note?: NoteDetailsRecord;
  list?: ListDetailsRecord;
  listItems?: ListItemRecord[];
  link?: LinkRecord;
  attachments?: AttachmentRecord[];
  tags?: string[];
};

export type BuildProjectMarkdownInput = {
  exportedAt: string;
  project: ContainerRecord;
  items: ProjectMarkdownExportItem[];
};

export class ProjectMarkdownExporter {
  build(input: BuildProjectMarkdownInput): string {
    const lines = [
      `# ${escapeMarkdownText(input.project.name)}`,
      "",
      `- Status: ${escapeMarkdownText(input.project.status)}`,
      `- Slug: ${escapeMarkdownText(input.project.slug)}`,
      `- Exported: ${escapeMarkdownText(input.exportedAt)}`
    ];

    if (input.project.description !== null) {
      lines.push(
        `- Description: ${escapeMarkdownText(input.project.description)}`
      );
    }

    lines.push("");
    this.appendTasks(lines, input.items.filter(hasTask));
    this.appendLists(lines, input.items.filter(hasList));
    this.appendNotes(lines, input.items.filter(hasNote));
    this.appendLinks(lines, input.items.filter(hasLink));
    this.appendFiles(lines, input.items.filter(hasAttachments));

    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
  }

  private appendTasks(
    lines: string[],
    items: Array<ProjectMarkdownExportItem & { task: TaskRecord }>
  ): void {
    lines.push("## Tasks", "");

    if (items.length === 0) {
      lines.push("No tasks.", "");
      return;
    }

    for (const entry of items) {
      const done = entry.task.taskStatus === "done" ? "x" : " ";
      const metadata = formatMetadata([
        ["Status", entry.task.taskStatus],
        ["Priority", entry.task.priority],
        ["Start", entry.task.startAt],
        ["Due", entry.task.dueAt],
        ["Completed", entry.task.completedAt],
        ["Tags", formatTags(entry.tags)]
      ]);
      lines.push(`- [${done}] ${escapeMarkdownText(entry.item.title)}${metadata}`);

      if (entry.item.body !== null) {
        lines.push(`  - Notes: ${escapeMarkdownText(entry.item.body)}`);
      }
    }

    lines.push("");
  }

  private appendLists(
    lines: string[],
    items: Array<ProjectMarkdownExportItem & { list: ListDetailsRecord }>
  ): void {
    lines.push("## Lists", "");

    if (items.length === 0) {
      lines.push("No lists.", "");
      return;
    }

    for (const entry of items) {
      lines.push(`### ${escapeMarkdownText(entry.item.title)}`);
      const listItems = entry.listItems ?? [];

      if (listItems.length === 0) {
        lines.push("", "No list items.", "");
        continue;
      }

      for (const listItem of listItems) {
        const done = listItem.status === "done" ? "x" : " ";
        const indent = "  ".repeat(Math.max(0, listItem.depth));
        const metadata = formatMetadata([
          ["Status", listItem.status],
          ["Start", listItem.startAt],
          ["Due", listItem.dueAt]
        ]);
        lines.push(
          `${indent}- [${done}] ${escapeMarkdownText(listItem.title)}${metadata}`
        );
      }

      lines.push("");
    }
  }

  private appendNotes(
    lines: string[],
    items: Array<ProjectMarkdownExportItem & { note: NoteDetailsRecord }>
  ): void {
    lines.push("## Notes", "");

    if (items.length === 0) {
      lines.push("No notes.", "");
      return;
    }

    for (const entry of items) {
      lines.push(
        `### ${escapeMarkdownText(entry.item.title)}`,
        "",
        "```markdown",
        escapeFenceContent(entry.note.content),
        "```",
        ""
      );
    }
  }

  private appendLinks(
    lines: string[],
    items: Array<ProjectMarkdownExportItem & { link: LinkRecord }>
  ): void {
    lines.push("## Links", "");

    if (items.length === 0) {
      lines.push("No links.", "");
      return;
    }

    for (const entry of items) {
      const description =
        entry.link.description === null
          ? ""
          : ` - ${escapeMarkdownText(entry.link.description)}`;
      lines.push(
        `- ${escapeMarkdownText(entry.item.title)}: ${escapeMarkdownText(
          entry.link.normalizedUrl
        )}${description}`
      );
    }

    lines.push("");
  }

  private appendFiles(
    lines: string[],
    items: Array<ProjectMarkdownExportItem & { attachments: AttachmentRecord[] }>
  ): void {
    lines.push("## Files", "");

    if (items.length === 0) {
      lines.push("No files.", "");
      return;
    }

    for (const entry of items) {
      for (const attachment of entry.attachments) {
        const metadata = formatMetadata([
          ["Stored", attachment.storedName],
          ["Path", attachment.storagePath],
          ["Size", `${attachment.sizeBytes} B`],
          ["MIME", attachment.mimeType],
          ["Checksum", attachment.checksum]
        ]);
        lines.push(
          `- ${escapeMarkdownText(attachment.originalName)}${metadata}`
        );

        if (attachment.description !== null) {
          lines.push(
            `  - Description: ${escapeMarkdownText(attachment.description)}`
          );
        }
      }
    }

    lines.push("");
  }
}

function hasTask(
  entry: ProjectMarkdownExportItem
): entry is ProjectMarkdownExportItem & { task: TaskRecord } {
  return entry.task !== undefined;
}

function hasList(
  entry: ProjectMarkdownExportItem
): entry is ProjectMarkdownExportItem & { list: ListDetailsRecord } {
  return entry.list !== undefined;
}

function hasNote(
  entry: ProjectMarkdownExportItem
): entry is ProjectMarkdownExportItem & { note: NoteDetailsRecord } {
  return entry.note !== undefined;
}

function hasLink(
  entry: ProjectMarkdownExportItem
): entry is ProjectMarkdownExportItem & { link: LinkRecord } {
  return entry.link !== undefined;
}

function hasAttachments(
  entry: ProjectMarkdownExportItem
): entry is ProjectMarkdownExportItem & { attachments: AttachmentRecord[] } {
  return (entry.attachments ?? []).length > 0;
}

function formatMetadata(
  entries: Array<[label: string, value: string | number | null | undefined]>
): string {
  const parts = entries
    .filter(([, value]) => value !== undefined && value !== null && `${value}` !== "")
    .map(([label, value]) => `${label}: ${escapeMarkdownText(String(value))}`);

  return parts.length === 0 ? "" : ` (${parts.join(", ")})`;
}

function formatTags(tags: string[] | undefined): string | null {
  return tags === undefined || tags.length === 0 ? null : tags.join(", ");
}

function escapeMarkdownText(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function escapeFenceContent(value: string): string {
  return value.replace(/```/g, "``\\`");
}
