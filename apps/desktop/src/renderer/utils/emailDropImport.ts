import type { ApiResult, EmailTaskImportSummary } from "../../preload/api";

export type EmailDropSourceSplit = {
  emailSourcePaths: string[];
  attachmentSourcePaths: string[];
};

export type EmailDropImportSummary = {
  importedCount: number;
  skippedCount: number;
  issueCount: number;
  errors: string[];
};

type ImportEmailSource = (
  sourcePath: string
) => Promise<ApiResult<EmailTaskImportSummary>>;

export function isEmailImportSourcePath(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  return lower.endsWith(".eml") || lower.includes("/cur/") || lower.includes("/new/");
}

export function splitEmailDropSourcePaths(
  sourcePaths: readonly string[]
): EmailDropSourceSplit {
  const emailSourcePaths: string[] = [];
  const attachmentSourcePaths: string[] = [];

  for (const sourcePath of sourcePaths) {
    if (isEmailImportSourcePath(sourcePath)) {
      emailSourcePaths.push(sourcePath);
    } else {
      attachmentSourcePaths.push(sourcePath);
    }
  }

  return { emailSourcePaths, attachmentSourcePaths };
}

export async function importEmailDropSources(
  sourcePaths: readonly string[],
  importEmailSource: ImportEmailSource
): Promise<EmailDropImportSummary> {
  const summary: EmailDropImportSummary = {
    importedCount: 0,
    skippedCount: 0,
    issueCount: 0,
    errors: []
  };

  for (const sourcePath of sourcePaths) {
    const result = await importEmailSource(sourcePath);

    if (!result.ok) {
      summary.errors.push(result.error.message);
      continue;
    }

    summary.importedCount += result.data.importedCount;
    summary.skippedCount += result.data.skippedCount;
    summary.issueCount += result.data.issues.length;
  }

  return summary;
}

export function formatEmailDropImportMessage(
  summary: Pick<EmailDropImportSummary, "importedCount" | "skippedCount" | "issueCount">
): string {
  const parts = [`Imported ${summary.importedCount} email${summary.importedCount === 1 ? "" : "s"} as tasks.`];

  if (summary.skippedCount > 0) {
    parts.push(`Skipped ${summary.skippedCount}.`);
  }

  if (summary.issueCount > 0) {
    parts.push(`${summary.issueCount} issue${summary.issueCount === 1 ? "" : "s"} reported.`);
  }

  return parts.join(" ");
}
