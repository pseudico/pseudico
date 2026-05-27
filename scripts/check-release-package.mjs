import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { arch, platform, release } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appRoot = resolve(repoRoot, "apps", "desktop");
const outputPath = resolve(repoRoot, "docs", "release", "package-artifact-check.json");
const builderConfigPath = resolve(appRoot, "electron-builder.yml");
const rootPackageJsonPath = resolve(repoRoot, "package.json");
const appPackageJsonPath = resolve(appRoot, "package.json");
const builderConfig = await readFile(builderConfigPath, "utf8");
const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8"));
const appPackageJson = JSON.parse(await readFile(appPackageJsonPath, "utf8"));
const packaged = getPackagedPaths();
const checks = [];

await assertPath(packaged.unpackedRoot, "unpacked app directory exists");
await assertPath(packaged.resourcesRoot, "packaged resources directory exists");
await assertPath(packaged.executable, "packaged executable exists");
await assertPath(packaged.appAsar, "packaged app.asar exists");

const forbiddenWorkspaceArtifacts = await findForbiddenWorkspaceArtifacts(packaged.unpackedRoot);
checks.push({
  name: "no workspace data inside package",
  passed: forbiddenWorkspaceArtifacts.length === 0,
  details: { forbiddenWorkspaceArtifacts }
});
checks.push({
  name: "unpacked dir target configured for smoke",
  passed: /target:\s*\n\s*-\s*target:\s*dir/.test(builderConfig),
  details: { expected: "electron-builder dir target" }
});
checks.push({
  name: "Windows NSIS installer target configured",
  passed:
    process.platform !== "win32" ||
    /target:\s*nsis/.test(builderConfig),
  details: { expected: "electron-builder win target nsis" }
});
checks.push({
  name: "Windows zip archive target configured",
  passed:
    process.platform !== "win32" ||
    /target:\s*zip/.test(builderConfig),
  details: { expected: "electron-builder win target zip" }
});
checks.push({
  name: "publish disabled",
  passed: /publish:\s*null/.test(builderConfig),
  details: { expected: "publish: null" }
});
checks.push({
  name: "asar enabled",
  passed: /asar:\s*true/.test(builderConfig),
  details: { expected: "asar: true" }
});
checks.push({
  name: "desktop package description metadata present",
  passed:
    typeof appPackageJson.description === "string" &&
    appPackageJson.description.trim().length > 0,
  details: { packageJson: appPackageJsonPath }
});
checks.push({
  name: "desktop package author metadata present",
  passed:
    typeof appPackageJson.author === "string"
      ? appPackageJson.author.trim().length > 0
      : typeof appPackageJson.author?.name === "string" &&
        appPackageJson.author.name.trim().length > 0,
  details: { packageJson: appPackageJsonPath }
});
checks.push({
  name: "product name configured",
  passed: /productName:\s*Local Work OS/.test(builderConfig),
  details: { expected: "productName: Local Work OS" }
});
checks.push({
  name: "beta version configured",
  passed:
    rootPackageJson.version === appPackageJson.version &&
    /^0\.1\.0-beta\.\d+$/.test(appPackageJson.version),
  details: {
    rootVersion: rootPackageJson.version,
    desktopVersion: appPackageJson.version
  }
});

const distributionArtifacts = await findDistributionArtifacts(packaged.outputRoot);
checks.push({
  name: "Windows NSIS installer artifact exists",
  passed:
    process.platform !== "win32" ||
    distributionArtifacts.some((artifact) => artifact.kind === "windows-nsis-installer"),
  details: {
    artifacts: distributionArtifacts.map((artifact) => artifact.path)
  }
});
checks.push({
  name: "Windows zip archive artifact exists",
  passed:
    process.platform !== "win32" ||
    distributionArtifacts.some((artifact) => artifact.kind === "windows-zip-archive"),
  details: {
    artifacts: distributionArtifacts.map((artifact) => artifact.path)
  }
});

const signing = getSigningStatus(builderConfig);
const gitInfo = await getGitInfo();
const artifacts = await Promise.all([
  describeArtifact("executable", packaged.executable),
  describeArtifact("app.asar", packaged.appAsar),
  ...distributionArtifacts.map((artifact) =>
    describeArtifact(artifact.kind, artifact.path)
  )
]);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  localOnly: true,
  source: gitInfo,
  platform: {
    os: platform(),
    release: release(),
    arch: arch()
  },
  package: {
    productName: "Local Work OS",
    version: appPackageJson.version,
    packageKind:
      process.platform === "win32"
        ? "windows-nsis-installer+zip-archive+unpacked-dir"
        : "unpacked-dir",
    distributionChannel: "manual/local beta handoff; no hosted release or auto-update feed",
    unpackedRoot: packaged.unpackedRoot,
    resourcesRoot: packaged.resourcesRoot,
    signingStatus: signing,
    installerStatus:
      process.platform === "win32"
        ? "NSIS installer produced for unsigned controlled beta"
        : "installer not produced on this platform",
    archiveStatus:
      process.platform === "win32"
        ? "zip archive produced for controlled beta"
        : "archive not produced on this platform",
    autoUpdateStatus: "disabled; electron-builder publish is null and no update feed is configured",
    dataBoundary: "workspace data must live under the selected workspace folder or app userData, not inside dist-packaged resources"
  },
  artifacts,
  checks,
  passed: checks.every((check) => check.passed),
  nextRequiredManualEvidence: [
    "Run pnpm package:smoke on the target OS.",
    "Launch the packaged app manually and create/open a temporary workspace.",
    "Back up before upgrade and verify data remains under the workspace folder.",
    "Publish SHA-256 checksums next to any artifact handed to an operator.",
    "Warn beta testers that unsigned Windows SmartScreen or unknown-publisher prompts are expected.",
    "Resolve owner decisions for public signing/notarization before public release."
  ]
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote release package artifact check to ${outputPath}`);

if (!report.passed) {
  process.exitCode = 1;
}

function getPackagedPaths() {
  if (process.platform === "win32") {
    const outputRoot = resolve(appRoot, "dist-packaged");
    const unpackedRoot = resolve(appRoot, "dist-packaged", "win-unpacked");
    return {
      outputRoot,
      unpackedRoot,
      resourcesRoot: join(unpackedRoot, "resources"),
      executable: join(unpackedRoot, "Local Work OS.exe"),
      appAsar: join(unpackedRoot, "resources", "app.asar")
    };
  }

  if (process.platform === "darwin") {
    const outputRoot = resolve(appRoot, "dist-packaged");
    const unpackedRoot = resolve(appRoot, "dist-packaged", "mac", "Local Work OS.app");
    return {
      outputRoot,
      unpackedRoot,
      resourcesRoot: join(unpackedRoot, "Contents", "Resources"),
      executable: join(unpackedRoot, "Contents", "MacOS", "Local Work OS"),
      appAsar: join(unpackedRoot, "Contents", "Resources", "app.asar")
    };
  }

  const outputRoot = resolve(appRoot, "dist-packaged");
  const unpackedRoot = resolve(appRoot, "dist-packaged", "linux-unpacked");
  return {
    outputRoot,
    unpackedRoot,
    resourcesRoot: join(unpackedRoot, "resources"),
    executable: join(unpackedRoot, "local-work-os"),
    appAsar: join(unpackedRoot, "resources", "app.asar")
  };
}

async function findDistributionArtifacts(outputRoot) {
  let entries = [];
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(outputRoot, entry.name);

      if (/\.zip$/i.test(entry.name)) {
        return { kind: "windows-zip-archive", path };
      }

      if (/\.exe$/i.test(entry.name)) {
        return { kind: "windows-nsis-installer", path };
      }

      return null;
    })
    .filter((artifact) => artifact !== null)
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function assertPath(path, name) {
  try {
    await stat(path);
    checks.push({ name, passed: true, details: { path } });
  } catch (error) {
    checks.push({
      name,
      passed: false,
      details: { path, error: error instanceof Error ? error.message : String(error) }
    });
  }
}

async function describeArtifact(kind, path) {
  const fileStat = await stat(path);
  return {
    kind,
    path,
    sizeBytes: fileStat.size,
    sha256: await sha256File(path)
  };
}

async function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

function getSigningStatus(config) {
  if (process.platform === "win32" && /signAndEditExecutable:\s*false/.test(config)) {
    return "unsigned Windows beta package; signAndEditExecutable is false; SmartScreen/unknown-publisher warnings expected";
  }

  if (process.platform === "darwin") {
    return "macOS dir package only; signing/notarization owner decision required before public distribution";
  }

  return "unsigned development package; platform signing/checksum policy required before public distribution";
}

async function getGitInfo() {
  const [commit, branch, status] = await Promise.all([
    runGit(["rev-parse", "HEAD"]),
    runGit(["branch", "--show-current"]),
    runGit(["status", "--short"])
  ]);

  return {
    commit,
    branch,
    clean: status === "",
    statusSummary: status === "" ? "clean" : status.split(/\r?\n/).filter(Boolean)
  };
}

function runGit(args) {
  return new Promise((resolveGit) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout) => {
      if (error) {
        resolveGit(null);
        return;
      }

      resolveGit(stdout.trim());
    });
  });
}

async function findForbiddenWorkspaceArtifacts(root) {
  const forbidden = new Set([
    "workspace.json",
    "local-work-os.sqlite",
    "local-work-os.sqlite-wal",
    "local-work-os.sqlite-shm",
    "recent-workspaces.json"
  ]);
  const found = [];
  await walk(root, async (path, entry) => {
    if (forbidden.has(entry.name)) {
      found.push(relative(root, path));
    }
  });
  return found.sort();
}

async function walk(directory, visit) {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    await visit(path, entry);
    if (entry.isDirectory()) {
      await walk(path, visit);
    }
  }
}
