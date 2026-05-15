import type {
  CsvImportColumnMapping,
  CsvImportConflictStrategy,
  CsvImportExecuteSummary,
  CsvImportFormat,
  CsvImportMissingContainerStrategy,
  CsvImportPreviewSummary
} from "./CsvImportService";
import { CsvImportService } from "./CsvImportService";
import type { ActivityActorType } from "@local-work-os/core";
import type { DatabaseConnection } from "@local-work-os/db";

export type CsvTaskImportPreviewInput = {
  workspaceId: string;
  contents: string;
  format?: CsvImportFormat;
  mapping?: CsvImportColumnMapping;
  conflictStrategy?: CsvImportConflictStrategy;
  missingContainerStrategy?: CsvImportMissingContainerStrategy;
  maxPreviewRows?: number;
};

export type CsvTaskImportExecuteInput = CsvTaskImportPreviewInput & {
  actorType?: ActivityActorType;
};

export class CsvTaskImporter {
  readonly module = "csvTaskImporter";

  private readonly csvImportService: CsvImportService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: (prefix: string) => string;
    now?: () => Date;
  }) {
    this.csvImportService = new CsvImportService(input);
  }

  previewTaskCsvImport(input: CsvTaskImportPreviewInput): CsvImportPreviewSummary {
    return this.csvImportService.previewImport({
      ...input,
      targetType: "task"
    });
  }

  async applyTaskCsvImport(input: CsvTaskImportExecuteInput): Promise<CsvImportExecuteSummary> {
    return await this.csvImportService.executeImport({
      ...input,
      targetType: "task"
    });
  }
}
