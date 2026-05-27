# 2026-05-27 PSE-275 installer-grade beta addendum

Verdict pending final clean validation: PSE-275 adds a Windows unsigned NSIS installer and zip archive for controlled nontechnical beta distribution, while retaining the `win-unpacked` package-smoke target.

Candidate artifacts:

- `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.exe`
- `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.zip`
- `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`

Owner caveats remain: unsigned Windows artifacts, expected SmartScreen/unknown-publisher prompts, no auto-update, manual backup-before-upgrade, local/manual distribution only, no public GA claim, and no cloud/telemetry/hosted account behavior.

Evidence files: `docs/release/package-artifact-check.json`, `docs/manual-qa/PSE-275-installer-beta-evidence.md`, and `docs/manual-qa/PSE-275-installer-manual-smoke.json`.

---
# 2026-05-24 Beta handoff addendum

**Updated targeted verdict:** controlled nontechnical internal beta is now **Go with caveats** after PSE-268 was fixed and rerun. This addendum supersedes the older nontechnical-readiness verdict below only for the 2026-05-24 internal beta candidate; public release remains **No**.

Evidence: `docs/BETA_HANDOFF_STATUS_2026-05-24.md`, `docs/manual-qa/PSE-264-complete-functionality-beta-pass.md`, `docs/manual-qa/PSE-266-final-beta-go-decision.md`, and final screenshots under `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/`.

Owner caveats still required for beta: unsigned/unpacked Windows package, no installer/auto-update, manual backup-before-upgrade/import/workflow runs, workspace data outside the app folder, Workflows limited to predefined guided beta templates, and no packaged OS-level firewall/no-network monitor in this pass.
# Operator Readiness Report

Date: 2026-05-18
Program: PSE-195 operator-readiness review
Scope: reconciled through latest merged main evidence after PSE-207, PSE-209, PSE-218, PSE-220, PSE-221, PSE-222, PSE-223, PSE-224, PSE-226, PSE-227, PSE-228, and PSE-229.
Reviewed base for this reconciliation: `b2bee031700465a4adb9adb296319be15be6412c`.

## Verdict

**Internal pilot ready with documented caveats - not yet nontechnical-operator ready and not public-release ready.**

A technical/internal pilot operator can use Pseudico with the runbook, manual
backup discipline, and explicit caveats below. Since the earlier PSE-206 report,
additional packaged/manual evidence closed or narrowed several gates:

- PSE-207 proved packaged manual backup restore into a fresh workspace, with
  caveats for JSON-export restore and some visual-search screenshots.
- PSE-209 proved 1k/10k packaged UI responsiveness, and PSE-226 bounded
  the 10k Today initial render memory behavior.
- PSE-218 made backup/restore guided, previewed, and non-destructive in the UI.
- PSE-220 completed the primary-operator UX acceptance gate with screenshots and
  no remaining P0/P1 primary-work-loop blockers.
- PSE-221 restored package-production confidence after the `.tsbuildinfo` /
  pnpm-linked-worktree packaging failure.
- PSE-222 fixed template file-placeholder integrity overclaims by converting
  unsupported binary placeholders into searchable note reminders instead of
  invalid file rows.
- PSE-223 added packaged importer evidence for implemented local import paths
  and clearly marks third-party/service foundations as not pilot UI importers.
- PSE-224 initially demoted workflows to Workflow Lab / scaffold-only to avoid
  overclaiming automation. PSE-269 through PSE-274 then added and evidenced a
  narrow guided Workflow beta loop with predefined local household templates,
  preview, explicit confirmation, result summary, Search retrieval, and durable
  run history.
- PSE-228 proved the packaged Windows native picker paths that exist today for
  attachment selection, Markdown folder import, and backup-restore target
  selection, while explicitly marking typed-path and workspace-relative flows as
  not native dialog surfaces.
- PSE-229 split the email import picker into EML-file and folder actions, then
  proved the packaged Windows native `.eml` file picker cancel/select path.

The remaining blockers for a broader nontechnical handoff are not broad unknowns.
OR-R3 is now **owner-accepted for internal pilot** on automated/static evidence,
but the packaged OS-level no-network monitor still has not been run and should
be completed before claiming nontechnical-operator or public-release readiness.
The other remaining items are explicit P2/P3 caveats and focused follow-up
tickets. Public release remains out of scope because signing, installers,
notarization, auto-update, legal/support policy, and public distribution are not
complete.

## Evidence classification rules

Use these labels when reading this report:

| Evidence type | Meaning |
| --- | --- |
| Automated source/service | Vitest, benchmark, repository/service, static/security, or source renderer checks. Useful but not sufficient for manual UI claims. |
| Packaged automated | Actual packaged executable exercised by a smoke/CDP harness or smoke mode. Useful for runtime/package confidence; OS-native dialogs may still be unreviewed. |
| Packaged manual / visual | Human- or actual-app screenshots and manual QA artifacts under `docs/manual-qa/`. Needed for operator-facing claims. |
| Historical | Evidence from an earlier branch/commit that remains useful context but may have been superseded. |
| Not reviewed | No direct evidence exists yet; do not claim passed. |

## Confidence summary

| Area | Confidence | Reason |
| --- | --- | --- |
| Core local data model and service workflows | High | Full test/build/package command sets have passed in recent issue evidence; repositories/services cover core mutations with activity/search behavior. |
| Backup/restore as a recovery path | High with caveats | PSE-197 automated golden path plus PSE-207 packaged backup restore and PSE-218 guided restore UI prove the primary backup-restore path into a new workspace. JSON-export restore through UI remains a caveat. |
| Local-only architecture intent | Medium-high | Static/security tests, defaults, URL allowlist, and dependency audit pass. OR-R3 packaged OS-level monitoring is owner-accepted for internal pilot, but remains unrun before stronger handoff claims. |
| Activity/search/data integrity | High for covered core mutations | Reconciliation tests and later fixes cover core paths; PSE-222 confirms template file placeholders no longer create invalid file rows. |
| Large-workspace scale | Medium-high for 1k/10k internal pilot | PSE-203 service benchmark, PSE-209 packaged UI run, and PSE-226 bounded Today packaged rerun passed without P0/P1 freeze/crash. 10k Today now starts capped at 50 tasks/lane with visible totals and load-more copy. |
| Packaged internal pilot handoff | Medium-high | PSE-221 `pnpm package`, `package:smoke`, `release:package-check`, and packaged UI evidence pass. Artifact remains unsigned/unpacked/internal-only. |
| Primary-operator UX | Medium-high for internal pilot | PSE-220 screenshots/review found no remaining P0/P1 primary-work-loop blocker after targeted fixes. OS-native dialogs and accessibility/performance remain separate caveats. |
| Importer readiness | Medium for implemented local paths | PSE-223 packaged smoke covers CSV/TSV, Markdown folder, Markdown note IPC, EML, and ICS. Third-party foundations and IMAP are not pilot-ready UI importers. |
| Workflow readiness | Medium for predefined guided beta templates | PSE-269 through PSE-274 prove a narrow guided local loop: template selection, simple inputs, read-only preview, explicit confirmation, execution, result summary, Search retrieval, and run history. Broad builder/scheduling/background automation remains future. |
| Nontechnical operator handoff | Medium-low | Core journeys are much better evidenced, but the packaged no-network monitor is still unrun for nontechnical handoff and the report still carries P2/P3 caveats. |
| Public release readiness | Low | Signing, notarization, installers, public checksum publishing, legal/support process, and update channel are not complete. |

## Readiness level definitions

| Level | Meaning | Current result |
| --- | --- | --- |
| Not ready | Major blockers prevent safe internal real use. | No - core internal-pilot evidence exists. |
| Internal pilot ready | Usable by a technical/internal operator with known caveats and runbook. | **Yes.** |
| Nontechnical operator ready | Usable by a nontechnical operator without developer interpretation. | **Not yet.** OR-R3 is accepted only for internal pilot; P2/P3 caveats must be accepted or closed for the target handoff. |
| Public release ready | Signed, documented, supportable, packaged, legally reviewed, and update/support policy complete. | **No.** Public distribution work remains. |

## Feature truth matrix

| Feature | Present/partial/missing | Evidence | Operator-facing caveat |
| --- | --- | --- | --- |
| Workspaces / Inbox | Present | Fresh workspace smoke, package smoke, PSE-206 packaged rerun, PSE-221 package smoke, PSE-228 packaged dialog QA | Workspace create/open works in packaged evidence; current UI uses typed local paths/recent workspace buttons rather than OS-native workspace pickers. |
| Projects | Present | Service tests, PSE-206/PSE-220 visual evidence, PSE-216 project work-loop QA | PSE-220 fixed prior project/contact layout regressions; advanced project customization remains future. |
| Contacts | Present/partial | Contact service/UI tests, PSE-220 visual evidence | Deeper CRM workflows remain future; current contact containers are pilot-usable. |
| Tasks / Today | Present | Today planning tests, PSE-206/PSE-209/PSE-220 evidence | PSE-226 caps initial 10k Today lanes at 50 tasks/lane with visible totals/load-more copy; do not claim 100k or every-hardware readiness. |
| Lists | Present | List service tests, virtualized UI tests, PSE-206/PSE-220 evidence | Advanced pipeline/list conversion UX remains feature QA. |
| Notes | Present | Note service tests, search/reconciliation tests, PSE-206 evidence | Markdown-first model; advanced rich text remains future. |
| Files / attachments | Present | Backup/restore golden, package smoke attach/open/reveal, PSE-207 restore evidence, PSE-222 template integrity, PSE-228 native picker QA | Native attach-file picker passed for cancel and select; template file placeholders are note reminders, not copied binary files. |
| Links | Present | URL validation/security tests and operator smoke | Metadata fetch/web widgets remain optional/off by default. |
| Tags / categories | Present | Metadata tests, reconciliation tests, PSE-206/PSE-220 evidence | Advanced metadata browser UX remains future. |
| Relationships | Present | Service tests, PSE-220 evidence | PSE-206 relationship screenshot/API mismatch remains historical P2/P3 caveat; PSE-220 did not find a P0/P1 primary-loop blocker. |
| Search | Present | Reconciliation health/rebuild, maintenance tests, PSE-217/PSE-220 visual evidence | Advanced relevance/query-builder UX remains future; duplicate file result edge is P3. |
| Saved views / collections | Present/partial | Collection pagination, saved-view tests, PSE-206 evidence | Advanced builder UX remains future. |
| Dashboards | Present/partial | Widget tests, PSE-206/PSE-209/PSE-220 evidence | Custom dashboard editing remains future. |
| Timeline/calendar | Partial-present | Timeline/calendar services, PSE-206/PSE-209 evidence | External/live calendar sync is out of scope. |
| Templates | Present with limitations | Template service tests and PSE-222 template file-placeholder evidence | Binary file placeholders become notes with reattachment guidance; real binary-copy template support is future. |
| Workflows | Guided beta templates with limitations | PSE-269 through PSE-274; `docs/manual-qa/workflow-beta-evidence-2026-05-24.md`; `docs/manual-qa/WF-006-guided-workflows-beta.md` | Only predefined guided local household-renovation workflows are beta-supported. No arbitrary scripting, background runs, scheduling, webhooks, cloud services, or general builder. |
| Backup/export/import/restore | Present/partial | PSE-207, PSE-218, PSE-223, PSE-228, PSE-229, package smoke, failure matrix | Backup restore target picker, Markdown folder picker, and EML file picker passed packaged dialog QA. Export, backup create/list, CSV import, and workspace create/open are typed-path or workspace-relative flows today, not native destination/source dialogs. |
| Maintenance tools | Present/partial | Failure matrix, maintenance tests, activity/search rebuild evidence, PSE-209 search rebuild | Long-running packaged-app feedback has smoke/QA evidence for search rebuild but broad hands-on maintenance coverage remains limited. |

## Evidence pack

| Evidence area | Artifact / command | Evidence type | Result |
| --- | --- | --- | --- |
| Clean-main review context | `C:	mp\Pseudico-main-review\.review-evidence
eview-app-evidence.json`, screenshots folder | Historical packaged automated/visual | Identified follow-ups including template placeholder integrity, importer coverage, and workflow overclaim risks. |
| Fresh packaged operator journey | `docs/manual-qa/PSE-206-packaged-operator-journey.md` | Packaged automated/visual | Pass with caveats after PSE-212; proves restart/persistence and core loop with P2/P3 caveats. |
| Packaged backup restore | `docs/manual-qa/PSE-207-packaged-backup-restore.md` | Packaged automated/visual | Pass with caveats; primary backup restore into clean workspace works. |
| Local-only security | `docs/LOCAL_ONLY_SECURITY_REVIEW.md` | Automated source/static | Normal workflows require no network; packaged network monitor is not reviewed and is owner-accepted for internal pilot only. |
| Packaged UI performance | `docs/manual-qa/PSE-209-packaged-ui-performance.md`, `docs/manual-qa/PSE-209-run-summary.json`, `docs/manual-qa/PSE-226-packaged-today-memory.md` | Packaged automated/visual | Pass with caveats for 1k/10k; PSE-226 reduced 10k Today packaged working set to 994.38 MB with visible lane caps. |
| Primary-operator UX gate | `docs/PRIMARY_OPERATOR_UX_ACCEPTANCE_REVIEW.md`, screenshots under `docs/manual-qa/screenshots/PSE-220-*` | Packaged/source visual | Pass for primary-operator pilot UX with documented P2/P3 caveats. |
| Package hardening | `docs/manual-qa/PSE-221-packaged-release-qa.md`, `docs/manual-qa/PSE-221-package-contents-check.json`, `docs/release/package-artifact-check.json` | Automated/package plus visual | `pnpm package`, smoke, and package checks passed; `.tsbuildinfo` absent from packaged output. |
| Template placeholder integrity | `docs/manual-qa/PSE-222-template-file-placeholder-integrity.md` | Source/service regression plus historical packaged repro | Template file placeholders no longer create invalid file items. |
| Packaged importer QA | `docs/manual-qa/PSE-223-packaged-importer-qa.md`, summary JSON | Packaged automated | Implemented local importers passed smoke/integrity checks; service-only importers are caveated. |
| Guided Workflow beta loop | `docs/WORKFLOWS_BETA_CONTRACT.md`, `docs/manual-qa/workflow-beta-evidence-2026-05-24.md`, `docs/manual-qa/WF-006-guided-workflows-beta.md`, screenshots under `docs/manual-qa/screenshots/WF-006-guided-workflows-beta-2026-05-24T08-10-32-915Z/` | Packaged visual plus automated service/renderer | Predefined local workflow templates are beta-supported with caveats; broad automation remains excluded. |
| Packaged OS-native dialog QA | `docs/manual-qa/PSE-228-packaged-os-dialog-qa.md`, `docs/manual-qa/PSE-228-packaged-dialog-qa-summary.json`, screenshots under `docs/manual-qa/screenshots/PSE-228-2026-05-18T08-15-00/` | Packaged manual / visual | File attach picker, Markdown folder picker, and restore target picker passed; typed-path/workspace-relative flows and email native picker are caveated. |
| Packaged email native picker QA | `docs/manual-qa/PSE-229-email-native-picker.md`, `docs/manual-qa/PSE-229-email-picker-summary.json`, screenshots under `docs/manual-qa/screenshots/PSE-229-2026-05-18T09-05-00/` | Packaged manual / visual | EML file picker cancel/select passed after splitting email file and folder actions. |
| Release packaging docs | `docs/RELEASE_CANDIDATE_PACKAGING.md` | Documentation | Current artifact is unsigned/unpacked internal-pilot package; no installer/signing/auto-update. |
| Runbook | `docs/OPERATOR_RUNBOOK.md`, `docs/help/operator-runbook.md` | Documentation | Operator guidance exists, but final nontechnical handoff still requires unresolved caveats to be accepted/closed. |

## Recent validation command sets

These are evidence references, not commands rerun by this reconciliation unless
listed in the PSE-225 PR/check summary.

| Source | Commands/results |
| --- | --- |
| PSE-221 | `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`, `pnpm package:smoke`, and `pnpm release:package-check` passed from a clean worktree. |
| PSE-222 | Targeted template tests plus `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`, `pnpm package:smoke`, and `pnpm release:package-check` passed. |
| PSE-223 | Packaged importer smoke evidence passed; docs distinguish packaged importers from service-only foundations. |
| PSE-224 | Workflow scaffold boundary was made explicit to prevent overclaiming before beta Workflow work. |
| PSE-269 through PSE-274 | Guided Workflow beta contract, typed templates, preview, confirmed execution, UI, packaged evidence, and caveat-removal decision completed via PR #235. |
| PSE-228 | `pnpm install --frozen-lockfile`, `pnpm package`, `pnpm package:smoke`, and packaged native dialog QA passed. |
| PSE-229 | Targeted email picker IPC tests, `pnpm lint`, `pnpm typecheck`, `pnpm package`, `pnpm package:smoke`, and packaged Windows EML picker QA passed. |

## Risk register

| ID | Severity | Risk | Current disposition | Required action |
| --- | --- | --- | --- | --- |
| OR-R1 | P1 historical, now closed with caveats | Full packaged operator journey needed real-app evidence. | Closed with caveats by PSE-206/PSE-220; no current P0/P1 primary-work-loop blocker in latest UX review. | Keep P2/P3 caveats visible; do not treat them as public-release proof. |
| OR-R2 | P0 historical, now closed with caveats | Manual packaged backup/restore recovery needed proof. | Closed with caveats by PSE-207 and improved by PSE-218. | Keep backup restore as the normal recovery path; JSON-export restore UI remains caveated. |
| OR-R3 | P2 accepted for internal pilot / P1 before stronger handoff | No unexpected network behavior has automated/static evidence, but no packaged OS/firewall monitor artifact exists. | Owner accepts automated/static evidence for internal pilot; not fully closed for nontechnical or public-release claims. | Run manual packaged no-network monitor from `docs/LOCAL_ONLY_SECURITY_REVIEW.md` before nontechnical handoff unless the owner explicitly accepts that boundary for the target recipient. |
| OR-R4 | Closed with P2 scale caveats | 1k/10k packaged UI responsiveness needed proof. | Closed for P0/P1 freeze/crash by PSE-209; PSE-226 bounded 10k Today initial render to 50 tasks/lane and remeasured Today at 994.38 MB working set. | Keep 100k/every-hardware performance out of pilot claims; use Search/load-more for very large Today lanes. |
| OR-R5 | P1 for public release | Unsigned/unpacked package; installer/signing/notarization absent. | Known limitation; acceptable for internal pilot only. | PSE-227/package release work before broader distribution; owner decides signing/installer path. |
| OR-R6 | P1 for public release | Auto-update is absent and manual upgrade mistakes could affect users. | Documented limitation. | Use backup-before-upgrade runbook; add auto-update only via future scoped ticket. |
| OR-R7 | P2 | Advanced UX/product gaps remain: rich text, custom dashboard editing, advanced saved-view builder, scheduling, live calendar sync. | Documented limitation. | Keep out of current handoff claim; create feature tickets as needed. |
| OR-R8 | P2 | Dependency audit warning: `simple-get` transitive release-tooling dependency is network-capable by purpose. | Tested acceptable for app workflows; documented. | Keep out of normal runtime; revisit on dependency changes. |
| OR-R9 | P2 | Importer readiness could be overclaimed from service tests/docs without packaged runtime evidence. | Improved by PSE-223, PSE-228, and PSE-229. Implemented local paths have packaged evidence; native Markdown folder and EML file pickers passed; third-party foundations are explicitly service-only/partial. | Do not mark service-only importers as pilot UI-ready. |
| OR-R10 | P2 reduced to scoped caveat | Workflows could be overclaimed as broad automation. | PSE-269 through PSE-274 prove only predefined guided local beta templates. | Do not claim arbitrary workflow builder, scheduling, background runs, scripting, webhooks, or cloud automation. |
| OR-R11 | P2 | Project-template file placeholders previously created invalid file rows. | Fixed by PSE-222; placeholders become notes with metadata and reattachment guidance. | Do not claim binary file template copying until implemented. |
| OR-R12 | P3 for non-dialog surfaces | OS-native dialogs for file/import/export/backup flows needed direct packaged proof. | PSE-228 proved native attach, Markdown folder, and restore target pickers; PSE-229 proved native EML file picker. Workspace create/open, CSV import, export, and backup create/list are not native dialog flows today. | Do not claim native dialog coverage for typed-path/workspace-relative flows. |

## Owner-accepted limitations for internal pilot

These limitations are acceptable for **internal pilot** only if communicated to the operator:

- The current artifact is an unpacked unsigned development package.
- No public installer, auto-update channel, notarization, or code-signing promise exists yet.
- Optional network-facing features must remain disabled unless specifically tested.
- Manual backups are required before important imports, maintenance, restore tests, and app upgrades.
- Very large Today lanes initially show the earliest 50 tasks per lane with full counts and load-more controls; use Search/backlog tuning instead of loading every task card at once.
- Workflows are limited to predefined guided beta templates; they require preview and confirmation and must not be treated as broad automation.
- Third-party importer foundations are not pilot UI importers unless PSE-223 marks the family packaged-proven.
- OS-native dialog behavior is proven only for the PSE-228-covered picker
  surfaces: file attach, Markdown folder import, EML file import, and restore target selection.
  Other local file flows are typed-path/workspace-relative or Not reviewed as
  documented in `docs/manual-qa/PSE-228-packaged-os-dialog-qa.md`.
- Public release support boundaries, legal review, and signing decisions remain future work.

## Final handoff checklist

### Internal technical pilot handoff may proceed when

- [x] Current build can be produced with `pnpm package`.
- [x] `pnpm package:smoke` passes on the handoff OS.
- [x] `pnpm release:package-check` passes and checksum/data-boundary report is included.
- [x] `docs/OPERATOR_RUNBOOK.md` is included.
- [x] Known limitations above are included.
- [x] Backup-before-upgrade instructions are included.
- [x] Owner accepts OR-R3 automated/static-only local-only evidence for internal pilot.
- [ ] Owner confirms the recipient and accepts the rest of the listed internal-pilot caveats.

### Nontechnical operator handoff may proceed only when

- [x] Manual packaged-app fresh workspace journey is completed and recorded in `docs/manual-qa/PSE-206-packaged-operator-journey.md` (Pass with caveats).
- [x] Manual packaged backup/restore into a fresh workspace is completed and recorded in `docs/manual-qa/PSE-207-packaged-backup-restore.md` (Pass with caveats).
- [ ] Manual packaged no-network monitor check is completed and recorded, or owner explicitly accepts the automated/static evidence boundary for that nontechnical recipient.
- [x] Manual/packaged 1k/10k UI performance check is completed and recorded in `docs/manual-qa/PSE-209-packaged-ui-performance.md` (Pass with caveats).
- [x] PSE-226 Today memory caveat is fixed/documented with operator-visible lane caps and packaged evidence.
- [x] PSE-228 OS-native dialog QA is completed for implemented native picker surfaces, with non-dialog/Not-reviewed flows explicitly documented.
- [ ] Any discovered P0/P1 issue is fixed or explicitly accepted by the owner.
- [ ] The runbook is updated with any real manual QA caveats.

### Public release may proceed only when

- [ ] Platform signing/notarization decisions are complete.
- [ ] Installer/archive targets are selected and tested.
- [ ] Public checksums are published next to artifacts.
- [ ] Legal/license review is complete.
- [ ] Support and update policy is documented.
- [ ] Auto-update/update-channel policy is designed, tested, and explicitly approved, or public release explicitly ships without auto-update and documents that limitation.

## Recommended next actions

1. Run OR-R3 packaged no-network monitor before nontechnical/public-release handoff, unless the owner explicitly accepts the automated/static-only boundary for that recipient.
2. Decide whether Maildir/email folder selection needs separate nontechnical hands-on evidence before broader handoff.

## Final statement

Pseudico is now substantially evidenced as a local-only internal pilot
application. The handoff risk has shifted from broad unknown functionality to a
short list of named P2/P3 caveats and one remaining manual packaged security
confirmation gate. Do **not** claim nontechnical operator-ready or public-release
ready status until the relevant checklist items are closed or explicitly
accepted by the owner.
