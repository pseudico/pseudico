import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, tmpdir, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const requireFromDbPackage = createRequire(
  new URL("../packages/db/package.json", import.meta.url)
);
const Database = requireFromDbPackage("better-sqlite3");

const VALID_SIZES = [1_000, 10_000, 100_000];
const BUDGETS = {
  1000: { open: 200, search: 150, dashboard: 250, today: 300, export: 1_000 },
  10000: { open: 500, search: 350, dashboard: 750, today: 900, export: 6_000 },
  100000: { open: 1_500, search: 1_000, dashboard: 2_000, today: 3_000, export: 45_000 }
};
const BUDGET_NOTES = {
  open: "Open summary should use bounded startup counts, not unbounded feed reads.",
  search: "Search budget covers indexed query hydration for the first 25 results.",
  dashboard: "Dashboard budget covers default local widgets with bounded pages.",
  today: "Today budget covers due, backlog, tomorrow, and summary projections.",
  export: "Export budget covers in-memory workspace JSON assembly only."
};

const options = parseArgs(process.argv.slice(2));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  localOnly: true,
  command: "pnpm benchmark:large",
  environment: getEnvironmentSummary(),
  sizes: [],
  notes: [
    "Benchmarks run against generated local SQLite workspaces in a temporary folder.",
    "No telemetry, network upload, or hosted service is used.",
    "The production service budget constants live in packages/features/src/performance/."
  ]
};

for (const itemCount of options.sizes) {
  report.sizes.push(await runSize(itemCount));
}

await mkdir(dirname(options.out), { recursive: true });
await writeFile(options.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote large workspace benchmark report to ${options.out}`);

async function runSize(itemCount) {
  const workspaceRoot = await mkdtemp(
    resolve(tmpdir(), `local-work-os-benchmark-${itemCount}-`)
  );
  const databasePath = resolve(workspaceRoot, "data", "local-work-os.sqlite");
  await mkdir(dirname(databasePath), { recursive: true });
  const memoryBefore = getMemorySnapshot();

  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  try {
    await applyInitialSchema(db);
    const workspaceId = `benchmark_workspace_${itemCount}`;
    const timestamp = new Date().toISOString();
    const seedStarted = performance.now();
    const seed = seedWorkspace(db, { workspaceId, itemCount, timestamp });
    const seedElapsedMs = roundElapsed(performance.now() - seedStarted);
    const benchmark = runBenchmark(db, {
      workspaceId,
      itemCount,
      timestamp
    });

    return {
      itemCount,
      workspaceRoot: options.keep ? workspaceRoot : null,
      seedElapsedMs,
      seed,
      benchmark,
      memory: {
        before: memoryBefore,
        after: getMemorySnapshot()
      }
    };
  } finally {
    db.close();

    if (!options.keep) {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }
}

async function applyInitialSchema(db) {
  const migrationSql = await readFile(
    new URL("../packages/db/src/migrations/0001_initial_schema.sql", import.meta.url),
    "utf8"
  );
  db.exec(migrationSql);
}

function seedWorkspace(db, input) {
  const containerCount = Math.min(100, input.itemCount);
  const counts = {
    workspaceId: input.workspaceId,
    containerCount,
    itemCount: input.itemCount,
    taskCount: 0,
    noteCount: 0,
    listCount: 0,
    listItemCount: 0,
    searchRecordCount: input.itemCount,
    activityEventCount: input.itemCount
  };
  const insertWorkspace = db.prepare(
    "insert into workspaces (id, name, schema_version, created_at, updated_at) values (?, ?, ?, ?, ?)"
  );
  const insertContainer = db.prepare(
    `insert into containers (
      id, workspace_id, type, name, slug, description, status, category_id, color,
      is_favorite, is_system, sort_order, created_at, updated_at
    ) values (?, ?, ?, ?, ?, null, 'active', null, null, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `insert into items (
      id, workspace_id, container_id, container_tab_id, type, title, body, category_id,
      status, sort_order, pinned, created_at, updated_at
    ) values (?, ?, ?, null, ?, ?, ?, null, 'active', ?, 0, ?, ?)`
  );
  const insertTask = db.prepare(
    `insert into task_details (
      item_id, workspace_id, task_status, priority, start_at, due_at, all_day,
      timezone, completed_at, created_at, updated_at
    ) values (?, ?, ?, ?, null, ?, 1, null, null, ?, ?)`
  );
  const insertNote = db.prepare(
    `insert into note_details (
      item_id, workspace_id, format, content, preview, created_at, updated_at
    ) values (?, ?, 'markdown', ?, ?, ?, ?)`
  );
  const insertList = db.prepare(
    `insert into list_details (
      item_id, workspace_id, show_completed, progress_mode, created_at, updated_at
    ) values (?, ?, 1, 'count', ?, ?)`
  );
  const insertListItem = db.prepare(
    `insert into list_items (
      id, workspace_id, list_item_parent_id, list_id, title, body, status, depth,
      sort_order, start_at, due_at, completed_at, created_at, updated_at
    ) values (?, ?, null, ?, ?, ?, 'open', 0, ?, null, ?, null, ?, ?)`
  );
  const insertSearch = db.prepare(
    `insert into search_index (
      id, workspace_id, target_type, target_id, title, body, tags, category,
      metadata_json, is_deleted, updated_at
    ) values (?, ?, 'item', ?, ?, ?, 'performance fixture large-workspace', null, ?, 0, ?)`
  );
  const insertActivity = db.prepare(
    `insert into activity_log (
      id, workspace_id, actor_type, action, target_type, target_id, summary, created_at
    ) values (?, ?, 'system', 'performance_fixture_seeded', 'item', ?, ?, ?)`
  );

  db.transaction(() => {
    insertWorkspace.run(
      input.workspaceId,
      `Large Workspace Benchmark ${input.itemCount}`,
      1,
      input.timestamp,
      input.timestamp
    );
    insertContainer.run(
      "inbox",
      input.workspaceId,
      "inbox",
      "Inbox",
      "inbox",
      1,
      1,
      0,
      input.timestamp,
      input.timestamp
    );

    for (let index = 0; index < containerCount; index += 1) {
      insertContainer.run(
        `container_${index}`,
        input.workspaceId,
        "project",
        `Performance Project ${index + 1}`,
        `performance-project-${index + 1}`,
        0,
        0,
        index + 1,
        input.timestamp,
        input.timestamp
      );
    }

    for (let index = 0; index < input.itemCount; index += 1) {
      const itemId = `item_${index}`;
      const title = `Performance fixture item ${index + 1}`;
      const body = `Generated large-workspace fixture row ${index + 1}.`;
      const containerId = `container_${index % containerCount}`;
      const itemType = getFixtureItemType(index);
      insertItem.run(
        itemId,
        input.workspaceId,
        containerId,
        itemType,
        title,
        body,
        index,
        input.timestamp,
        input.timestamp
      );

      if (itemType === "task") {
        insertTask.run(
          itemId,
          input.workspaceId,
          index % 17 === 0 ? "waiting" : "open",
          index % 6,
          createFixtureDueAt(input.timestamp, index),
          input.timestamp,
          input.timestamp
        );
        counts.taskCount += 1;
      } else if (itemType === "note") {
        insertNote.run(
          itemId,
          input.workspaceId,
          `# ${title}\n\n${body}`,
          body,
          input.timestamp,
          input.timestamp
        );
        counts.noteCount += 1;
      } else {
        insertList.run(itemId, input.workspaceId, input.timestamp, input.timestamp);
        counts.listCount += 1;

        for (let listIndex = 0; listIndex < 3; listIndex += 1) {
          insertListItem.run(
            `list_item_${index}_${listIndex}`,
            input.workspaceId,
            itemId,
            `Checklist row ${listIndex + 1} for ${title}`,
            `Generated row for large-workspace list ${index + 1}.`,
            listIndex,
            createFixtureDueAt(input.timestamp, index + listIndex),
            input.timestamp,
            input.timestamp
          );
          counts.listItemCount += 1;
        }
      }

      insertSearch.run(
        `search_${index}`,
        input.workspaceId,
        itemId,
        title,
        body,
        JSON.stringify({ fixture: true, index }),
        input.timestamp
      );
      insertActivity.run(
        `activity_${index}`,
        input.workspaceId,
        itemId,
        `Seeded ${title}.`,
        input.timestamp
      );
    }
  })();

  return counts;
}

function runBenchmark(db, input) {
  const operations = [
    measure("open", input.itemCount, () => measureOpen(db, input.workspaceId)),
    measure("search", input.itemCount, () => measureSearch(db, input.workspaceId)),
    measure("dashboard", input.itemCount, () =>
      measureDashboard(db, input.workspaceId, input.timestamp)
    ),
    measure("today", input.itemCount, () =>
      measureToday(db, input.workspaceId, input.timestamp)
    ),
    measure("export", input.itemCount, () => measureExport(db, input.workspaceId))
  ];

  return {
    workspaceId: input.workspaceId,
    itemCount: input.itemCount,
    generatedAt: new Date().toISOString(),
    passed: operations.every((operation) => operation.passedBudget),
    operations
  };
}

function measure(operation, itemCount, callback) {
  const started = performance.now();
  const rowCount = callback();
  const elapsedMs = roundElapsed(performance.now() - started);
  const maxMs = BUDGETS[itemCount][operation];

  return {
    operation,
    elapsedMs,
    maxMs,
    passedBudget: elapsedMs <= maxMs,
    rowCount,
    notes: BUDGET_NOTES[operation]
  };
}

function measureOpen(db, workspaceId) {
  return (
    db.prepare("select count(*) as count from workspaces where id = ?").get(workspaceId).count +
    getCount(db, "containers", workspaceId) +
    getCount(db, "items", workspaceId) +
    getCount(db, "search_index", workspaceId)
  );
}

function measureSearch(db, workspaceId) {
  return db
    .prepare(
      `select id
       from search_index
       where workspace_id = ?
         and is_deleted = 0
         and (lower(title) like '%fixture%' or lower(body) like '%fixture%' or lower(tags) like '%fixture%')
       order by updated_at desc, title asc
       limit 25`
    )
    .all(workspaceId).length;
}

function measureDashboard(db, workspaceId, timestamp) {
  return (
    measureToday(db, workspaceId, timestamp) +
    db.prepare(
      `select count(*) as count
       from containers
       where workspace_id = ?
         and type = 'project'
         and deleted_at is null`
    ).get(workspaceId).count +
    db.prepare(
      `select count(*) as count
       from activity_log
       where workspace_id = ?
       order by created_at desc
       limit 10`
    ).get(workspaceId).count
  );
}

function measureToday(db, workspaceId, timestamp) {
  const day = createDayRange(timestamp, 0);
  const backlog = createDayRange(timestamp, -7);
  const tomorrow = createDayRange(timestamp, 1);
  return (
    countTasksBetween(db, workspaceId, day.start, day.end) +
    countTasksBetween(db, workspaceId, backlog.start, day.start) +
    countTasksBetween(db, workspaceId, tomorrow.start, tomorrow.end)
  );
}

function measureExport(db, workspaceId) {
  const tables = [
    "containers",
    "items",
    "task_details",
    "note_details",
    "list_details",
    "list_items",
    "activity_log",
    "search_index"
  ];
  const data = Object.fromEntries(
    tables.map((table) => [
      table,
      db.prepare(`select * from ${table} where workspace_id = ?`).all(workspaceId)
    ])
  );
  JSON.stringify(data);
  return Object.values(data).reduce((total, rows) => total + rows.length, 0);
}

function getCount(db, table, workspaceId) {
  return db
    .prepare(`select count(*) as count from ${table} where workspace_id = ?`)
    .get(workspaceId).count;
}

function countTasksBetween(db, workspaceId, startInclusive, endExclusive) {
  return db
    .prepare(
      `select count(*) as count
       from task_details td
       inner join items i on i.id = td.item_id
       where td.workspace_id = ?
         and td.task_status in ('open', 'waiting')
         and td.completed_at is null
         and i.archived_at is null
         and i.deleted_at is null
         and td.due_at >= ?
         and td.due_at < ?`
    )
    .get(workspaceId, startInclusive, endExclusive).count;
}

function getFixtureItemType(index) {
  if (index % 10 === 0) {
    return "list";
  }

  if (index % 5 === 0) {
    return "note";
  }

  return "task";
}

function createFixtureDueAt(timestamp, index) {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + (index % 21) - 10);
  return date.toISOString();
}

function createDayRange(timestamp, offsetDays) {
  const start = new Date(timestamp);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function parseArgs(args) {
  const parsed = {
    sizes: [1_000],
    out: resolve(
      "docs",
      "performance",
      "reports",
      `large-workspace-benchmark-${safeTimestamp(new Date())}.json`
    ),
    keep: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--sizes") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error("--sizes requires a comma-separated value.");
      }
      parsed.sizes = parseSizes(value);
      index += 1;
    } else if (arg.startsWith("--sizes=")) {
      parsed.sizes = parseSizes(arg.slice("--sizes=".length));
    } else if (arg === "--out") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error("--out requires a local file path.");
      }
      parsed.out = resolve(value);
      index += 1;
    } else if (arg.startsWith("--out=")) {
      parsed.out = resolve(arg.slice("--out=".length));
    } else if (arg === "--keep") {
      parsed.keep = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function parseSizes(value) {
  const sizes = value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));

  if (
    sizes.length === 0 ||
    sizes.some((size) => !VALID_SIZES.includes(size))
  ) {
    throw new Error("--sizes must contain one or more of 1000, 10000, 100000.");
  }

  return sizes;
}

function safeTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function roundElapsed(elapsedMs) {
  return Math.round(elapsedMs * 100) / 100;
}

function getEnvironmentSummary() {
  return {
    platform: platform(),
    release: release(),
    arch: arch(),
    node: process.version,
    cpuCount: cpus().length,
    totalMemoryMb: bytesToMegabytes(totalmem())
  };
}

function getMemorySnapshot() {
  const memory = process.memoryUsage();

  return {
    rssMb: bytesToMegabytes(memory.rss),
    heapUsedMb: bytesToMegabytes(memory.heapUsed),
    heapTotalMb: bytesToMegabytes(memory.heapTotal),
    externalMb: bytesToMegabytes(memory.external)
  };
}

function bytesToMegabytes(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function printHelpAndExit() {
  console.log(`Usage: pnpm benchmark:large -- --sizes 1000,10000 --out docs/performance/reports/latest.json

Options:
  --sizes  Comma-separated benchmark scales: 1000, 10000, 100000.
  --out    Report JSON path. Defaults under docs/performance/reports/.
  --keep   Keep generated temporary workspace folders for manual inspection.
`);
  process.exit(0);
}
