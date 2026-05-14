import type { DatabaseConnection } from "@local-work-os/db";
import {
  CsvTaskImporter,
  type CsvTaskImportPreviewInput
} from "./CsvTaskImporter";
import {
  MarkdownNoteImporter,
  type MarkdownNoteImportPreviewInput
} from "./MarkdownNoteImporter";

export class ImportPreviewService {
  readonly module = "importPreview";

  private readonly csvTaskImporter: CsvTaskImporter;
  private readonly markdownNoteImporter: MarkdownNoteImporter;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: (prefix: string) => string;
    now?: () => Date;
  }) {
    this.csvTaskImporter = new CsvTaskImporter(input);
    this.markdownNoteImporter = new MarkdownNoteImporter(input);
  }

  previewTaskCsvImport(input: CsvTaskImportPreviewInput) {
    return this.csvTaskImporter.previewTaskCsvImport(input);
  }

  previewMarkdownImport(input: MarkdownNoteImportPreviewInput) {
    return this.markdownNoteImporter.previewMarkdownImport(input);
  }
}
