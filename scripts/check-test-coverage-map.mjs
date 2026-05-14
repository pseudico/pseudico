import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const requiredSections = [
  "## Purpose",
  "## Coverage levels",
  "## Current test organization",
  "## Playwright organization plan",
  "## Feature coverage matrix",
  "## Smoke tags",
  "## Follow-up test ticket seeds",
  "## PR usage rule",
  "## Machine-check contract"
];

export const requiredMapKeys = [
  "workspace-core",
  "electron-security",
  "projects-containers",
  "contacts",
  "inbox-capture",
  "tasks-planning",
  "lists",
  "notes",
  "files-attachments",
  "links-browser-capture",
  "metadata",
  "search",
  "saved-views",
  "today-dashboard",
  "timeline-calendar",
  "templates-workflows",
  "import-export-backup",
  "privacy-maintenance",
  "demo-help-i18n-release"
];

export const requiredSmokeTags = [
  "@smoke:workspace",
  "@smoke:security",
  "@smoke:projects",
  "@smoke:contacts",
  "@smoke:inbox",
  "@smoke:tasks",
  "@smoke:lists",
  "@smoke:notes",
  "@smoke:files",
  "@smoke:links",
  "@smoke:metadata",
  "@smoke:search",
  "@smoke:saved-views",
  "@smoke:planning",
  "@smoke:calendar",
  "@smoke:automation",
  "@smoke:backup-import",
  "@smoke:privacy",
  "@smoke:release"
];

export const requiredFollowUpSeeds = [
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
const defaultDocPath = path.join(repoRoot, "docs", "TEST_COVERAGE_MAP.md");

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

export function validateCoverageMap(docPath = defaultDocPath) {
  const failures = [];

  if (!existsSync(docPath)) {
    return {
      ok: false,
      failures: [`Missing coverage map: ${path.relative(repoRoot, docPath)}`],
      summary: { sections: 0, mapKeys: 0, smokeTags: 0, followUpSeeds: 0 }
    };
  }

  const content = readFileSync(docPath, "utf8");

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      failures.push(`Missing required section: ${section}`);
    }
  }

  for (const key of requiredMapKeys) {
    const occurrences = countOccurrences(content, `\`${key}\``);
    if (occurrences !== 1) {
      failures.push(`Expected map key ${key} exactly once; found ${occurrences}`);
    }
  }

  for (const tag of requiredSmokeTags) {
    if (!content.includes(`\`${tag}\``)) {
      failures.push(`Missing smoke tag: ${tag}`);
    }
  }

  for (const seed of requiredFollowUpSeeds) {
    if (!content.includes(`\`${seed}\``)) {
      failures.push(`Missing follow-up seed: ${seed}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      sections: requiredSections.length,
      mapKeys: requiredMapKeys.length,
      smokeTags: requiredSmokeTags.length,
      followUpSeeds: requiredFollowUpSeeds.length
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateCoverageMap(process.argv[2] ? path.resolve(process.argv[2]) : defaultDocPath);

  if (!result.ok) {
    console.error("Test coverage map validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Test coverage map OK: ${result.summary.mapKeys} map keys, ${result.summary.smokeTags} smoke tags, ${result.summary.followUpSeeds} follow-up seeds.`
  );
}
