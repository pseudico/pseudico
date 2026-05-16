# Operator Readiness Ticket Pack

Status: draft/import-ready Linear ticket pack
Created: 2026-05-15
Source review: Pseudico Operator-Readiness Review
Target outcome: nontechnical operator handoff

## Purpose

This ticket pack converts the operator-readiness gaps into scoped Linear-ready
issues for later Codex threads. The standard is not "feature exists in code";
the standard is "a nontechnical operator can use, recover, and trust Pseudico
without a developer nearby, using a written runbook."

## Program-level handoff definition

Pseudico is nontechnical-operator ready only when all of these are true:

- A fresh workspace can complete the full core journey through the packaged app.
- Data persists after restart and survives backup/restore into a clean workspace.
- Search, saved views, activity, and relationships remain consistent after writes.
- Missing files, bad paths, malformed imports, locked/corrupt databases, and failed
  backups produce understandable recovery instructions rather than silent failure.
- Local-only guarantees are verified: no telemetry, hosted account, cloud sync,
  remote storage, or required network service.
- The operator runbook explains setup, daily use, backup, restore, maintenance,
  troubleshooting, known limitations, and escalation boundaries.
- CI/release checks pass, including lint, typecheck, tests, build, package smoke,
  dependency/license audit, and release-candidate QA evidence.

## Ticket sequence

Run these as a hardening program, not as unrelated bugs:

1. PSE-OR-001 and PSE-OR-002 prove the real operator journey and restore safety.
2. PSE-OR-003 and PSE-OR-004 make recovery understandable and testable.
3. PSE-OR-005 through PSE-OR-009 close release, security, integrity, performance,
   and documentation risks.
4. PSE-OR-010 is the final certification gate and must not pass until the earlier
   tickets are complete or explicitly accepted by the owner.

---

## PSE-OR-001 ? Add full fresh-workspace operator smoke

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P0
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:qa`, `area:testing`, `area:desktop`, `area:workspace`, `area:projects`, `area:contacts`, `area:inbox`, `area:tasks`, `area:notes`, `area:files`, `area:links`, `area:search`, `area:saved-views`, `area:today`, `area:dashboard`, `quality:needs-e2e`, `quality:needs-manual-qa`, `risk:ux`

### Issue

The current automated coverage proves many services and renderer fragments, but
there is no complete fresh-workspace operator journey evidence through the real
app. This blocks nontechnical handoff because the app may be functionally rich
but still fail as an integrated workflow.

### Goal

Create a reproducible smoke workflow that starts from an empty local workspace
and verifies the app can be used like an operator would use it.

### Scope

- Add or extend a smoke harness for a fresh disposable workspace.
- Cover the packaged/development app path that is closest to real operator use.
- Exercise these flows in one integrated journey:
  - create/open workspace;
  - confirm Inbox and workspace health;
  - create contact and project;
  - create task, note, list, file attachment, and link;
  - apply tag/category;
  - relate records together;
  - search for created content;
  - create/evaluate a saved view or collection;
  - plan at least one task in Today;
  - view dashboard and calendar/timeline projection;
  - close/reopen and confirm state persists.
- Save test evidence in a durable local QA report or deterministic test output.

### Out of scope

- Redesigning UI.
- Adding new product features not needed to complete the journey.
- Cloud sync, hosted accounts, telemetry, or remote storage.

### Possible resolution

Prefer Playwright/Electron E2E if the project adds Playwright; otherwise use the
existing Vitest smoke harness plus a clearly documented manual QA script until
browser-level automation is available. If full automation is too large, split the
first PR into: harness foundation, object creation journey, restart persistence
journey.

### Integrated functionality standard

The journey must pass from a truly empty local workspace, not from a seeded
developer database. A nontechnical operator must be able to follow the same flow
from the runbook and get the same result.

### Acceptance criteria

- [ ] Fresh workspace journey is automated or has a checked-in manual script with deterministic fixture names.
- [ ] Journey covers project, contact, Inbox, task, note, list, file, link, tag/category, relationship, search, saved view/collection, Today, dashboard, and calendar/timeline.
- [ ] App restart/persistence is verified.
- [ ] Failure output identifies the broken step in operator language.
- [ ] Evidence is referenced from `docs/QA_SCRIPTS.md` or a new operator QA report.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

### Test requirements

- Smoke/E2E test or deterministic manual QA script.
- Renderer/main tests only where needed to support the harness.
- Manual packaged-app confirmation if automation cannot drive OS dialogs.

### Codex instructions

```text
@Codex implement PSE-OR-001.
Read AGENTS.md, docs/QA_SCRIPTS.md, docs/TEST_COVERAGE_MAP.md, docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, and docs/SECURITY.md.
Build the smallest complete fresh-workspace operator smoke that proves integrated use, not isolated unit behavior.
Do not add cloud/mobile/team/public-sharing scope.
If Playwright/Electron automation is too large, create a deterministic manual QA script and a follow-up automation issue, but still prove the journey now.
```

---

## PSE-OR-002 ? Add backup/restore golden workflow

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P0
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:qa`, `area:backup`, `area:export`, `area:import`, `area:files`, `area:db`, `area:testing`, `quality:needs-e2e`, `quality:needs-manual-qa`, `risk:file-system`, `risk:data-model`

### Issue

Backup/export/restore services exist and tests pass, but nontechnical handoff
requires proof that a real operator can back up a populated workspace and restore
it into a fresh workspace without losing records, attachments, metadata,
relationships, activity, or search behavior.

### Goal

Create a golden restore workflow that verifies local data portability and recovery.

### Scope

- Generate or create a populated local workspace fixture with:
  - projects, contacts, Inbox items, tasks, lists, notes, files, links;
  - tags, categories, relationships, saved views/collections;
  - Today planning entries and dashboard-relevant data;
  - at least one attachment with content verification.
- Create manual backup and/or full workspace export.
- Restore into a clean separate workspace folder.
- Verify record counts, representative field values, attachment bytes/checksums,
  relationships, activity log presence, and search/index rebuild behavior.
- Document where backups/exports are stored and how an operator selects a restore target.

### Out of scope

- Cloud backup.
- Replacing or overwriting a user workspace in place unless explicitly supported
  with strong safeguards.
- New import formats unrelated to workspace recovery.

### Possible resolution

Add a golden fixture test around existing `BackupService`, `RestoreService`, and
export/import paths. Where OS dialogs are needed, add manual QA steps and keep
automated verification at service/main IPC level.

### Integrated functionality standard

An operator must be able to recover useful work in a clean workspace and verify
that the restored workspace is complete enough to continue working.

### Acceptance criteria

- [ ] Golden fixture backup/export is created locally.
- [ ] Restore into a fresh workspace is verified.
- [ ] Attachments are verified by path containment and checksum/content.
- [ ] Search index is valid or rebuild is triggered and verified after restore.
- [ ] Activity log contains meaningful restore/import events where expected.
- [ ] Restore failures produce safe, understandable errors and do not corrupt the target workspace.
- [ ] Documentation/runbook steps are updated.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

### Test requirements

- Feature/service integration test for golden restore.
- Main IPC test if restore is available through Electron boundary.
- Manual packaged-app backup/restore QA script.

### Codex instructions

```text
@Codex implement PSE-OR-002.
Read docs/DATA_MODEL.md, docs/DB_CORRUPTION_RECOVERY.md, docs/MIGRATIONS.md, docs/ATTACHMENT_MANIFEST_AUDIT.md, docs/QA_SCRIPTS.md, and docs/SECURITY.md.
Prove backup/restore as an integrated recovery workflow, including attachments, activity, and search.
Do not implement cloud backup or destructive in-place restore.
```

---

## PSE-OR-003 ? Write nontechnical operator runbook

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P0
**Suggested estimate:** 2
**Suggested labels:** `phase:M14`, `type:docs`, `area:docs`, `area:workspace`, `area:backup`, `area:files`, `area:search`, `area:security`, `quality:needs-docs`, `risk:ux`

### Issue

The current help content is useful but too thin for nontechnical handoff. If the
operator needs a developer to explain workspace creation, backup, restore,
maintenance, or known limitations, Pseudico is not operator-ready.

### Goal

Create a complete operator manual and in-app/help-center content map for daily
use and recovery.

### Scope

- Add `docs/OPERATOR_RUNBOOK.md` or equivalent.
- Cover:
  - what Pseudico is and is not for;
  - create/open workspace;
  - daily capture workflow;
  - projects/contacts/tasks/notes/lists/files/links;
  - tags/categories/relationships;
  - search and saved views;
  - Today, dashboard, timeline/calendar;
  - backup/export/import/restore;
  - attachments and missing files;
  - maintenance tools and when to run them;
  - local-only privacy and optional network features;
  - troubleshooting table;
  - known limitations;
  - escalation checklist for developer/support.
- Link the runbook from docs README and, where practical, in-app help.

### Out of scope

- Marketing website copy.
- Legal privacy policy final wording beyond clear local-only operational guidance.
- UI redesign.

### Possible resolution

Write the runbook as a durable Markdown doc and mirror short summaries into
`docs/help/` / `HelpContent.ts` only where they benefit the in-app help center.

### Integrated functionality standard

A nontechnical operator should be able to start from the runbook and perform the
core smoke and restore workflows without developer narration.

### Acceptance criteria

- [ ] Operator runbook exists and is linked from `docs/README.md`.
- [ ] Runbook includes backup and restore instructions with warnings.
- [ ] Runbook includes troubleshooting for missing files, bad workspace, failed backup, failed import, locked/corrupt database, and search issues.
- [ ] Known limitations are explicit and match `docs/PRODUCT_SPEC.md` / `docs/RELEASE.md`.
- [ ] In-app help is updated or a clear follow-up is created.
- [ ] Documentation avoids claiming release-ready packaging/signing if not complete.

### Test requirements

- Documentation link check if available.
- Help content sync test if in-app help is updated.

### Codex instructions

```text
@Codex implement PSE-OR-003.
Read docs/README.md, docs/PRODUCT_SPEC.md, docs/QA_SCRIPTS.md, docs/RELEASE.md, docs/SECURITY.md, docs/help/README.md, and packages/features/src/help/HelpContent.ts.
Write a nontechnical operator runbook that is honest about limitations and sufficient for handoff.
Do not overclaim release readiness.
```

---

## PSE-OR-004 ? Add failure-mode regression matrix

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P1
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:test`, `area:testing`, `area:workspace`, `area:files`, `area:import`, `area:backup`, `area:db`, `area:search`, `area:ui`, `quality:needs-tests`, `quality:needs-manual-qa`, `risk:file-system`, `risk:migration`, `risk:ux`

### Issue

Many apps work on happy paths but fail operator handoff when a file is missing,
a path is invalid, a database is locked, an import is malformed, or a maintenance
job fails. Pseudico needs intentional failure-mode coverage and operator-facing
recovery behavior.

### Goal

Create and begin enforcing a failure-mode matrix for recoverable local-only errors.

### Scope

- Add `docs/FAILURE_MODE_MATRIX.md` or extend QA docs.
- Cover at minimum:
  - invalid file paths and path traversal attempts;
  - permission-denied workspace folder;
  - missing attachment file;
  - malformed URL;
  - malformed import/export file;
  - huge note and large attachment boundaries;
  - large workspace slow path;
  - app closed/interrupted during write or backup where feasible;
  - search index out of sync and rebuild;
  - backup restore failure;
  - database locked/unavailable/corrupt;
  - duplicate records;
  - empty states;
  - long-running maintenance jobs.
- For each case define expected operator-facing message, recovery action, and
automated/manual evidence.
- Add tests for the highest-risk gaps discovered while building the matrix.

### Out of scope

- Perfectly simulating every OS crash mode in one PR.
- Destructive corruption tests against real user workspaces.
- Cloud/network recovery.

### Possible resolution

Start with a documentation matrix and add regression tests for existing helpers
or IPC handlers. Split follow-ups where the matrix reveals actual product gaps.

### Integrated functionality standard

The app should fail loudly, safely, and recoverably. The operator should know
what happened and what to do next.

### Acceptance criteria

- [ ] Failure-mode matrix exists and is linked from QA/testing docs.
- [ ] Each scenario lists expected behavior, recovery instruction, evidence type, and owner module.
- [ ] At least the P0/P1 scenarios have automated tests or explicit manual QA steps.
- [ ] Any discovered silent data-loss risk is split into a separate P0 bug.
- [ ] UI-facing errors are understandable to nontechnical operators.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

### Test requirements

- Unit tests for validation helpers.
- Main IPC tests for rejected paths/URLs/imports where applicable.
- Feature tests for search rebuild, backup failure, and missing attachment handling where applicable.
- Manual QA for OS permission-denied and locked database cases if not automatable.

### Codex instructions

```text
@Codex implement PSE-OR-004.
Read docs/SECURITY.md, docs/TESTING.md, docs/QA_SCRIPTS.md, docs/DB_CORRUPTION_RECOVERY.md, docs/ATTACHMENT_MANIFEST_AUDIT.md, and docs/MIGRATIONS.md.
Create the failure-mode matrix and add focused regression coverage for the highest-risk existing gaps.
Keep tests local and safe; do not damage real workspaces.
```

---

## PSE-OR-005 ? Add release dependency and license audit gate

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P1
**Suggested estimate:** 2
**Suggested labels:** `phase:M14`, `type:release`, `area:security`, `area:docs`, `risk:dependency`, `quality:needs-docs`

### Issue

Release readiness requires dependency/license review and evidence that no hidden
telemetry/cloud dependency has been introduced. Current documentation identifies
this as a release gate, but there is no completed audit artifact or command gate.

### Goal

Add a repeatable local dependency/license/privacy audit step for release candidates.

### Scope

- Add a script or documented command to produce dependency/license inventory.
- Review runtime dependencies and packaged artifacts for:
  - telemetry SDKs;
  - auto-update feeds;
  - hosted accounts/billing/license activation;
  - unexpected network clients;
  - incompatible licenses or missing notices.
- Add/update `docs/DISTRIBUTION_LICENSING_PRIVACY.md` or a generated notice doc
  with current evidence and owner decisions still pending.
- Ensure package smoke/release checklist references the audit.

### Out of scope

- Owner legal decisions.
- Implementing paid licensing.
- Auto-update implementation.
- Publishing public artifacts.

### Possible resolution

Use package-manager metadata plus a small allowlist/denylist script. If full
license notice generation needs a package, keep it scoped and local-only.

### Integrated functionality standard

A release candidate cannot be called release-ready until a human can inspect
runtime dependencies, licenses, and network/privacy posture from committed evidence.

### Acceptance criteria

- [ ] Dependency/license audit command or documented manual process exists.
- [ ] Runtime dependency list is reviewed for network/telemetry/cloud risk.
- [ ] License notice gap is documented or generated.
- [ ] Release checklist includes this gate.
- [ ] No new cloud/telemetry/update dependency is introduced.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

### Test requirements

- Script test if a script is added.
- Documentation verification if docs are updated.

### Codex instructions

```text
@Codex implement PSE-OR-005.
Read docs/DISTRIBUTION_LICENSING_PRIVACY.md, docs/SECURITY.md, package.json, apps/desktop/package.json, and pnpm-lock.yaml.
Add a repeatable dependency/license/privacy audit gate suitable for local release candidates.
Do not add telemetry, cloud sync, hosted accounts, auto-update, or licensing enforcement.
```

---

## PSE-OR-006 ? Verify local-only security and network behavior end to end

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P1
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:qa`, `area:security`, `area:electron-main`, `area:preload`, `area:renderer`, `risk:electron-security`, `risk:ipc`, `risk:dependency`, `quality:needs-tests`, `quality:needs-manual-qa`

### Issue

Local-only is part of the product promise. Current static checks are positive,
but nontechnical handoff needs end-to-end evidence that normal use does not make
unexpected network calls and that optional network-capable features are off by
default and clearly explained.

### Goal

Create a local-only security regression pass covering network defaults, external
URL handling, IPC validation, drag/drop path safety, and Electron hardening.

### Scope

- Verify normal app startup and core operator smoke do not require network.
- Verify privacy/network settings default off for metadata fetch, web widgets,
  ICS URL import, IMAP import, and browser capture.
- Verify external URL open flows use validated protocols only.
- Verify renderer cannot access Node/SQLite/filesystem APIs directly.
- Verify BrowserWindow hardening remains intact.
- Add a documented manual check or automated harness for unexpected network calls
  if feasible in the current stack.

### Out of scope

- Penetration test certification.
- Adding browser capture production bridge.
- Adding remote diagnostics.

### Possible resolution

Extend existing security tests and add a release QA checklist for network-off
operation. Consider a test-only network guard/mocked fetch detector around main
process features that can fetch.

### Integrated functionality standard

An operator can trust that local work remains local during normal workflows, and
any optional network action is explicit, off by default, and documented.

### Acceptance criteria

- [ ] Security regression document/checklist exists.
- [ ] Automated tests cover renderer boundary, external URL validation, and optional network defaults.
- [ ] Manual or automated no-unexpected-network evidence is captured for the operator smoke path.
- [ ] Any network-capable UI clearly indicates opt-in behavior.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

### Codex instructions

```text
@Codex implement PSE-OR-006.
Read docs/SECURITY.md, docs/SECURITY_AUDIT.md, docs/DISTRIBUTION_LICENSING_PRIVACY.md, apps/desktop/src/main/workspaceWindow.ts, and packages/features/src/privacy/PrivacySettingsService.ts.
Prove local-only behavior end to end without introducing new network services.
```

---

## PSE-OR-007 ? Add activity/search/data-integrity reconciliation audit

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P1
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:test`, `area:activity-log`, `area:search`, `area:db`, `area:testing`, `risk:activity-log`, `risk:search-index`, `risk:data-model`, `quality:needs-tests`

### Issue

The architecture requires data-changing operations to log activity and update
search when relevant. The code has many tests, but operator handoff needs a
cross-feature reconciliation audit proving the rule holds for the integrated
feature set.

### Goal

Add a regression suite and report that checks activity log and search index
consistency across core operator mutations.

### Scope

- Cover creates/updates/deletes/restores for representative:
  - projects, contacts, tasks, lists/list rows, notes, files, links;
  - tags/categories and relationships;
  - saved views/collections if they write data;
  - Today planning changes;
  - backup/restore/import events where applicable.
- Verify activity log entries exist with meaningful target/action summaries.
- Verify searchable content appears, updates, and is removed/marked deleted as expected.
- Verify search health/rebuild diagnostics detect and repair expected mismatch cases.

### Out of scope

- Exhaustive assertion of every field in every event.
- Rewriting services unless a gap is found.

### Possible resolution

Create a feature-level integration test fixture that performs representative
mutations through services and asserts activity/search side effects. Split any
missing activity/search updates into focused bug tickets if too large.

### Integrated functionality standard

An operator must not lose the ability to audit what changed or find what they
created after normal use.

### Acceptance criteria

- [ ] Integrated mutation fixture exists.
- [ ] Activity log consistency is asserted for representative data-changing operations.
- [ ] Search index consistency is asserted for representative searchable changes.
- [ ] Deleted/archived data behaves according to product expectations.
- [ ] Any violations are fixed or split into P0/P1 bugs.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

### Codex instructions

```text
@Codex implement PSE-OR-007.
Read AGENTS.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/TEST_COVERAGE_MAP.md, packages/features/tests, and packages/db/tests.
Add cross-feature activity/search consistency coverage for operator-critical mutations.
Keep fixes small and split broad violations into separate issues.
```

---

## PSE-OR-008 ? Complete large-workspace UI performance and responsiveness QA

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P2
**Suggested estimate:** 2
**Suggested labels:** `phase:M14`, `type:qa`, `area:performance`, `area:renderer`, `area:dashboard`, `area:search`, `area:today`, `quality:needs-manual-qa`, `risk:performance`

### Issue

Service-level benchmark budgets pass for 1k/10k generated workspaces, but a
nontechnical operator experiences UI responsiveness, startup, scrolling, loading
states, and long-running operation feedback. Those need explicit QA.

### Goal

Add release-candidate QA evidence for large-workspace UI behavior.

### Scope

- Use deterministic 1k and 10k local workspace fixtures.
- Verify operator-visible performance for:
  - startup/open workspace;
  - search first result latency;
  - dashboard load;
  - Today load;
  - project/contact feed virtualization;
  - backup/export duration and progress/feedback;
  - memory/CPU observations where practical.
- Add guidance for when to run the 100k full gate.

### Out of scope

- Reaching perfect performance for every future 100k UI path in one PR.
- Telemetry or remote performance collection.

### Possible resolution

Extend `docs/PERFORMANCE.md` and `docs/QA_SCRIPTS.md` with manual UI checks and
add automated service benchmark evidence to the release report. Add targeted UI
tests if virtualization/loading states are not covered.

### Integrated functionality standard

Large local workspaces should remain understandable and responsive enough that
an operator does not assume the app is frozen or losing data.

### Acceptance criteria

- [ ] UI performance QA script exists for 1k/10k local workspaces.
- [ ] Benchmark command and report location are documented.
- [ ] Loading/progress/empty/error states are verified for long-running paths.
- [ ] Any P0/P1 performance blocker is split into a fix ticket.
- [ ] Commands pass: `pnpm benchmark:large -- --sizes 1000,10000` or documented equivalent plus core checks.

### Codex instructions

```text
@Codex implement PSE-OR-008.
Read docs/PERFORMANCE.md, docs/QA_SCRIPTS.md, packages/features/src/performance, and UI virtualization tests.
Create operator-facing performance QA evidence without adding telemetry or network reporting.
```

---

## PSE-OR-009 ? Harden release-candidate packaging and distribution evidence

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready
**Priority:** P1 for release-ready, P2 for internal pilot
**Suggested estimate:** 3
**Suggested labels:** `phase:M14`, `type:release`, `area:desktop`, `area:security`, `area:docs`, `risk:dependency`, `quality:needs-manual-qa`

### Issue

Package smoke passes for the current unpacked development package, but public or
nontechnical handoff needs a clear release-candidate packaging story: what is
built, what is signed/not signed, where data goes, how updates happen, and what
support boundaries exist.

### Goal

Create a release-candidate packaging checklist and, where feasible, automate
packaged-app verification beyond the existing package smoke.

### Scope

- Clarify distribution tier:
  - internal pilot;
  - operator-ready local handoff;
  - public release candidate.
- Verify packaged app creates workspace data outside the app bundle.
- Verify package smoke on target OS.
- Document signing/notarization/checksum status and open owner decisions.
- Document manual update/back-up-before-upgrade instructions.
- Ensure release notes do not overclaim public release readiness.

### Out of scope

- Purchasing signing certificates.
- Implementing auto-update.
- Hosted download/update infrastructure.

### Possible resolution

Update release docs and package smoke evidence. Add scripts/checks only where
repeatable locally. Keep legal/signing owner decisions as explicit open items.

### Integrated functionality standard

A nontechnical operator can install/run the build they are given, know where
their data lives, and know how to back up before upgrading.

### Acceptance criteria

- [ ] Release-candidate packaging checklist is current and linked.
- [ ] `pnpm package:smoke` is part of operator-readiness evidence.
- [ ] Data-outside-bundle guarantee is documented and verified.
- [ ] Signing/checksum/update/manual-install status is explicit.
- [ ] Known limitations are included in release notes/runbook.
- [ ] Commands pass: `pnpm package`, `pnpm package:smoke` where relevant.

### Codex instructions

```text
@Codex implement PSE-OR-009.
Read docs/RELEASE.md, docs/DISTRIBUTION_LICENSING_PRIVACY.md, docs/QA_SCRIPTS.md, and apps/desktop/scripts/run-package-smoke.mjs.
Harden release-candidate packaging evidence and documentation without adding auto-update, accounts, telemetry, or licensing enforcement.
```

---

## PSE-OR-010 ? Produce final operator-readiness certification report

**Phase:** M14/operator-readiness
**Suggested Linear state:** Spec Ready, blocked by PSE-OR-001 through PSE-OR-009
**Priority:** P0 final gate
**Suggested estimate:** 2
**Suggested labels:** `phase:M14`, `type:qa`, `type:release`, `area:docs`, `area:testing`, `quality:needs-manual-qa`, `quality:needs-docs`

### Issue

The project needs a single go/no-go artifact answering: "Can a real operator use
Pseudico safely and reliably without a developer nearby?" Without this final
report, individual fixes may pass while handoff remains ambiguous.

### Goal

Create the final operator-readiness report with verdict, evidence, accepted
risks, and remaining blockers.

### Scope

- Add `docs/OPERATOR_READINESS_REPORT.md` or update the existing QA/release docs.
- Include:
  - verdict: Not ready / Pilot ready / Operator ready / Release ready;
  - confidence summary;
  - feature truth matrix;
  - journey evidence;
  - backup/restore evidence;
  - failure-mode evidence;
  - security/privacy evidence;
  - performance evidence;
  - runbook/documentation evidence;
  - risk register with disposition;
  - explicit owner-accepted limitations;
  - final handoff checklist.
- Ensure all P0/P1 items are fixed or explicitly accepted by the owner.

### Out of scope

- Fixing broad new gaps discovered during certification; create follow-up tickets.
- Legal approval or signing certificate procurement.

### Possible resolution

Use the outputs of PSE-OR-001 through PSE-OR-009 as the evidence pack. The report
should not pass by assertion; each claim needs a command, manual QA record, or
documented owner decision.

### Integrated functionality standard

The final report is the handoff gate. A nontechnical operator should receive the
build, the runbook, and this report as the basis for trusting the app.

### Acceptance criteria

- [ ] Final report exists and links all evidence.
- [ ] All P0/P1 risks are fixed, downgraded with evidence, or explicitly accepted.
- [ ] Verdict is honest and uses the defined readiness levels.
- [ ] Handoff package contents are listed.
- [ ] Commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package:smoke`.

### Codex instructions

```text
@Codex implement PSE-OR-010 only after the earlier operator-readiness issues are complete or explicitly accepted.
Read all operator-readiness artifacts, docs/RELEASE.md, docs/QA_SCRIPTS.md, docs/TEST_COVERAGE_MAP.md, docs/SECURITY.md, and docs/PERFORMANCE.md.
Produce an evidence-based final verdict. Do not overclaim operator-ready or release-ready status.
```

## Linear issue mapping

Created in Linear on 2026-05-15 under parent `PSE-195`:

| Local key | Linear issue |
|---|---|
| Program | `PSE-195` |
| PSE-OR-001 | `PSE-196` |
| PSE-OR-002 | `PSE-197` |
| PSE-OR-003 | `PSE-198` |
| PSE-OR-004 | `PSE-199` |
| PSE-OR-005 | `PSE-200` |
| PSE-OR-006 | `PSE-201` |
| PSE-OR-007 | `PSE-202` |
| PSE-OR-008 | `PSE-203` |
| PSE-OR-009 | `PSE-204` |
| PSE-OR-010 | `PSE-205` |
