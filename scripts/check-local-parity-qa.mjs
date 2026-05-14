import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { requiredMapKeys, requiredSmokeTags } from "./check-test-coverage-map.mjs";

export const requiredSections = [
  "## Scope",
  "## QA pass summary",
  "## Feature parity QA matrix",
  "## Gap log",
  "## Release decision",
  "## Machine-check contract"
];

export const requiredGapIds = [
  "LWO-QA-001",
  "LWO-QA-002",
  "LWO-QA-003",
  "LWO-QA-006",
  "LWO-QA-009",
  "LWO-QA-012",
  "LWO-QA-017",
  "LWO-QA-019"
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReportPath = path.join(repoRoot, "docs", "LOCAL_PARITY_QA_REPORT.md");

function countTableRows(content, key) {
  const pattern = new RegExp("^\\| `" + key + "` \\|", "gm");
  return [...content.matchAll(pattern)].length;
}

export function validateLocalParityQaReport(reportPath = defaultReportPath) {
  const failures = [];

  if (!existsSync(reportPath)) {
    return {
      ok: false,
      failures: [`Missing local parity QA report: ${path.relative(repoRoot, reportPath)}`],
      summary: { sections: 0, mapKeys: 0, smokeTags: 0, gapIds: 0 }
    };
  }

  const content = readFileSync(reportPath, "utf8");

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      failures.push(`Missing required section: ${section}`);
    }
  }

  for (const key of requiredMapKeys) {
    const occurrences = countTableRows(content, key);
    if (occurrences !== 1) {
      failures.push(`Expected one parity QA matrix row for ${key}; found ${occurrences}`);
    }
  }

  for (const tag of requiredSmokeTags) {
    if (!content.includes(`\`${tag}\``)) {
      failures.push(`Missing smoke tag reference: ${tag}`);
    }
  }

  for (const gapId of requiredGapIds) {
    if (!content.includes(`\`${gapId}\``)) {
      failures.push(`Missing gap log entry: ${gapId}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      sections: requiredSections.length,
      mapKeys: requiredMapKeys.length,
      smokeTags: requiredSmokeTags.length,
      gapIds: requiredGapIds.length
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateLocalParityQaReport(process.argv[2] ? path.resolve(process.argv[2]) : defaultReportPath);

  if (!result.ok) {
    console.error("Local parity QA report validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Local parity QA report OK: ${result.summary.mapKeys} feature rows, ${result.summary.smokeTags} smoke tags, ${result.summary.gapIds} logged gaps.`
  );
}
