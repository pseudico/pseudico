import type {
  ContainerRecord,
  ItemRecord,
  TaskRecord
} from "@local-work-os/db";

export type TaskDelimitedExportFormat = "csv" | "tsv";

export type TaskDelimitedExportRow = {
  item: ItemRecord;
  task: TaskRecord;
  container: ContainerRecord | null;
  tags?: string[];
};

export type BuildTaskDelimitedExportInput = {
  format: TaskDelimitedExportFormat;
  rows: TaskDelimitedExportRow[];
};

const taskExportHeaders = [
  "Project",
  "Task",
  "Status",
  "Priority",
  "Start",
  "Due",
  "Completed",
  "Tags",
  "Body",
  "Item ID"
] as const;

export class TaskCsvExporter {
  build(input: BuildTaskDelimitedExportInput): string {
    const delimiter = input.format === "tsv" ? "\t" : ",";
    const rows = [
      taskExportHeaders,
      ...input.rows.map((row) => [
        row.container?.name ?? "",
        row.item.title,
        row.task.taskStatus,
        row.task.priority === null ? "" : String(row.task.priority),
        row.task.startAt ?? "",
        row.task.dueAt ?? "",
        row.task.completedAt ?? "",
        row.tags?.join("; ") ?? "",
        row.item.body ?? "",
        row.item.id
      ])
    ];

    return `${rows
      .map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter))
      .join("\n")}\n`;
  }
}

function escapeDelimitedCell(value: string, delimiter: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (
    normalized.includes("\"") ||
    normalized.includes("\n") ||
    normalized.includes(delimiter)
  ) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
}
