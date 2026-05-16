import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReportPath = path.join(
  repoRoot,
  "docs",
  "release",
  "dependency-license-audit.json"
);
const defaultNoticesPath = path.join(
  repoRoot,
  "docs",
  "release",
  "THIRD_PARTY_NOTICES.md"
);

const deniedLicenseFragments = [
  "AGPL",
  "GPL-",
  "LGPL",
  "SSPL",
  "BUSL",
  "Commons Clause"
];
const telemetryOrCloudPackagePatterns = [
  /(^|[/@-])sentry($|[/@-])/i,
  /datadog/i,
  /newrelic/i,
  /posthog/i,
  /segment/i,
  /mixpanel/i,
  /amplitude/i,
  /rollbar/i,
  /bugsnag/i,
  /telemetry/i,
  /analytics/i,
  /electron-updater/i,
  /auto-update/i,
  /license-?key/i,
  /stripe/i,
  /firebase/i,
  /supabase/i,
  /auth0/i
];
const networkPackagePatterns = [
  /(^|[/@-])got($|[/@-])/i,
  /node-fetch/i,
  /cross-fetch/i,
  /axios/i,
  /undici/i,
  /superagent/i,
  /request/i,
  /simple-get/i,
  /http-proxy/i,
  /websocket/i
];

const options = parseArgs(process.argv.slice(2));
const workspacePackagePaths = findWorkspacePackageJsons();
const workspacePackages = new Map(
  workspacePackagePaths.map((packageJsonPath) => {
    const pkg = readJson(packageJsonPath);
    return [
      pkg.name,
      {
        packageJsonPath,
        packageDir: path.dirname(packageJsonPath),
        package: pkg
      }
    ];
  })
);
const runtimeDependencies = collectRuntimeDependencies();
const releaseToolingDependencies = collectReleaseToolingDependencies();
const failures = [];
const warnings = [];

for (const dependency of runtimeDependencies) {
  auditDependency(dependency, "runtime");
}

for (const dependency of releaseToolingDependencies) {
  auditDependency(dependency, "release_tooling");
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  localOnlyGuardrails: {
    telemetry: "forbidden by default",
    cloudSync: "forbidden",
    hostedAccounts: "forbidden",
    billingOrLicenseActivation: "forbidden",
    autoUpdate: "deferred; no update feed may be added by this gate"
  },
  summary: {
    workspacePackageCount: workspacePackages.size,
    runtimeDependencyCount: runtimeDependencies.length,
    releaseToolingDependencyCount: releaseToolingDependencies.length,
    failureCount: failures.length,
    warningCount: warnings.length
  },
  failures,
  warnings,
  runtimeDependencies: runtimeDependencies.map(toReportDependency),
  releaseToolingDependencies: releaseToolingDependencies.map(toReportDependency)
};

await mkdir(path.dirname(options.report), { recursive: true });
await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await mkdir(path.dirname(options.notices), { recursive: true });
await writeFile(options.notices, renderNotices(report), "utf8");

if (failures.length > 0) {
  console.error("Dependency/license audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Dependency/license audit OK: ${runtimeDependencies.length} runtime dependencies, ${releaseToolingDependencies.length} release-tooling dependencies, ${warnings.length} warnings.`
);
console.log(`Wrote ${path.relative(repoRoot, options.report)}`);
console.log(`Wrote ${path.relative(repoRoot, options.notices)}`);

function parseArgs(args) {
  const parsed = {
    report: defaultReportPath,
    notices: defaultNoticesPath
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out") {
      parsed.report = path.resolve(repoRoot, requireArgValue(args, index));
      index += 1;
    } else if (arg === "--notices") {
      parsed.notices = path.resolve(repoRoot, requireArgValue(args, index));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireArgValue(args, index) {
  const value = args[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${args[index]}`);
  }

  return value;
}

function findWorkspacePackageJsons() {
  return [
    "package.json",
    ...findPackageJsonsUnder("apps"),
    ...findPackageJsonsUnder("packages")
  ].map((relativePath) => path.join(repoRoot, relativePath));
}

function findPackageJsonsUnder(relativeRoot) {
  const root = path.join(repoRoot, relativeRoot);

  if (!existsSync(root)) {
    return [];
  }

  return readDirNames(root)
    .map((name) => path.join(relativeRoot, name, "package.json"))
    .filter((packageJsonPath) => existsSync(path.join(repoRoot, packageJsonPath)));
}

function readDirNames(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function collectRuntimeDependencies() {
  const seen = new Map();

  for (const workspace of workspacePackages.values()) {
    collectDependencyClosure({
      dependencyNames: Object.keys(workspace.package.dependencies ?? {}),
      importerDir: workspace.packageDir,
      seen,
      includeWorkspaceDependencies: true
    });
  }

  return [...seen.values()].sort(compareDependency);
}

function collectReleaseToolingDependencies() {
  const rootPackage = workspacePackages.get(readJson(path.join(repoRoot, "package.json")).name);
  const desktopPackage = workspacePackages.get("@local-work-os/desktop");
  const names = new Set([
    ...Object.keys(rootPackage?.package.devDependencies ?? {}),
    ...Object.keys(desktopPackage?.package.devDependencies ?? {})
  ]);

  return [...names]
    .filter((name) => !isWorkspacePackage(name))
    .map((name) => resolveDependency(name, desktopPackage?.packageDir ?? repoRoot))
    .filter((dependency) => dependency !== null)
    .sort(compareDependency);
}

function collectDependencyClosure(input) {
  for (const dependencyName of input.dependencyNames) {
    if (input.includeWorkspaceDependencies && isWorkspacePackage(dependencyName)) {
      const workspace = workspacePackages.get(dependencyName);

      if (workspace !== undefined) {
        collectDependencyClosure({
          dependencyNames: Object.keys(workspace.package.dependencies ?? {}),
          importerDir: workspace.packageDir,
          seen: input.seen,
          includeWorkspaceDependencies: true
        });
      }

      continue;
    }

    const dependency = resolveDependency(dependencyName, input.importerDir);

    if (dependency === null) {
      warnings.push(`Could not resolve runtime dependency ${dependencyName} from ${input.importerDir}.`);
      continue;
    }

    const key = `${dependency.name}@${dependency.version}`;

    if (input.seen.has(key)) {
      continue;
    }

    input.seen.set(key, dependency);
    collectDependencyClosure({
      dependencyNames: Object.keys(dependency.dependencies ?? {}),
      importerDir: dependency.packageDir,
      seen: input.seen,
      includeWorkspaceDependencies: false
    });
    collectDependencyClosure({
      dependencyNames: Object.keys(dependency.optionalDependencies ?? {}),
      importerDir: dependency.packageDir,
      seen: input.seen,
      includeWorkspaceDependencies: false
    });
  }
}

function isWorkspacePackage(name) {
  return workspacePackages.has(name);
}

function resolveDependency(name, importerDir) {
  const requireFromImporter = createRequire(path.join(importerDir, "package.json"));
  let packageJsonPath;

  try {
    packageJsonPath = requireFromImporter.resolve(`${name}/package.json`);
  } catch {
    try {
      packageJsonPath = findPackageJsonAbove(requireFromImporter.resolve(name));
    } catch {
      return null;
    }
  }

  const pkg = readJson(packageJsonPath);

  return {
    name: pkg.name ?? name,
    version: pkg.version ?? "unknown",
    license: normaliseLicense(pkg.license),
    description: pkg.description ?? null,
    homepage: pkg.homepage ?? null,
    repository: normaliseRepository(pkg.repository),
    packageDir: path.dirname(packageJsonPath),
    dependencies: pkg.dependencies ?? {},
    optionalDependencies: pkg.optionalDependencies ?? {}
  };
}

function findPackageJsonAbove(startPath) {
  let current = path.dirname(startPath);

  while (current !== path.dirname(current)) {
    const candidate = path.join(current, "package.json");

    if (existsSync(candidate)) {
      return candidate;
    }

    current = path.dirname(current);
  }

  throw new Error(`Could not find package.json above ${startPath}`);
}

function auditDependency(dependency, group) {
  if (dependency.license === "UNKNOWN") {
    warnings.push(`${group} dependency ${dependency.name}@${dependency.version} has no license metadata.`);
  }

  if (deniedLicenseFragments.some((fragment) => dependency.license.includes(fragment))) {
    failures.push(
      `${group} dependency ${dependency.name}@${dependency.version} uses review-blocking license ${dependency.license}.`
    );
  }

  if (telemetryOrCloudPackagePatterns.some((pattern) => pattern.test(dependency.name))) {
    failures.push(
      `${group} dependency ${dependency.name}@${dependency.version} matches a telemetry/cloud/update/licensing denylist pattern.`
    );
  }

  if (networkPackagePatterns.some((pattern) => pattern.test(dependency.name))) {
    warnings.push(
      `${group} dependency ${dependency.name}@${dependency.version} is network-capable or commonly used for network I/O; confirm it is not used for normal local-only workflows.`
    );
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normaliseLicense(license) {
  if (typeof license === "string" && license.trim().length > 0) {
    return license.trim();
  }

  if (license && typeof license === "object" && typeof license.type === "string") {
    return license.type;
  }

  return "UNKNOWN";
}

function normaliseRepository(repository) {
  if (typeof repository === "string") {
    return repository;
  }

  if (repository && typeof repository === "object" && typeof repository.url === "string") {
    return repository.url;
  }

  return null;
}

function toReportDependency(dependency) {
  return {
    name: dependency.name,
    version: dependency.version,
    license: dependency.license,
    description: dependency.description,
    homepage: dependency.homepage,
    repository: dependency.repository,
    packagePath: path.relative(repoRoot, dependency.packageDir).replace(/\\/g, "/"),
    dependencies: dependency.dependencies,
    optionalDependencies: dependency.optionalDependencies
  };
}

function compareDependency(left, right) {
  return `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`);
}

function renderNotices(report) {
  const runtimeRows = report.runtimeDependencies
    .map(
      (dependency) =>
        `| ${dependency.name} | ${dependency.version} | ${dependency.license} | ${formatSource(dependency)} |`
    )
    .join("\n");
  const toolingRows = report.releaseToolingDependencies
    .map(
      (dependency) =>
        `| ${dependency.name} | ${dependency.version} | ${dependency.license} | ${formatSource(dependency)} |`
    )
    .join("\n");

  return `# Third-Party Dependency Notices

Generated by \`pnpm audit:dependencies\`.

This inventory is a release-readiness evidence artifact. It records package metadata from the local dependency install and highlights license/privacy review inputs. It is not a legal opinion and does not replace owner legal review before public distribution.

## Runtime dependencies

| Package | Version | License | Source |
|---|---:|---|---|
${runtimeRows}

## Release tooling dependencies

These packages are used by local development, testing, packaging, linting, or build workflows. They are reviewed for release tooling risk, but they are not part of the local workspace data model.

| Package | Version | License | Source |
|---|---:|---|---|
${toolingRows}

## Audit summary

- Runtime dependencies: ${report.summary.runtimeDependencyCount}
- Release-tooling dependencies: ${report.summary.releaseToolingDependencyCount}
- Failures: ${report.summary.failureCount}
- Warnings: ${report.summary.warningCount}

Review warnings in \`dependency-license-audit.json\` before public release.
`;
}

function formatSource(dependency) {
  return dependency.repository ?? dependency.homepage ?? "";
}
