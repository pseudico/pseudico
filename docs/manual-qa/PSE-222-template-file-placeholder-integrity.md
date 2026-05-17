# PSE-222 template file placeholder integrity evidence

Date/time: 2026-05-17 (Australia/Sydney)
Issue: PSE-222 — Fix project-template file placeholder integrity gap
Branch: `codex/pse-222-template-file-integrity`
Base commit: `5d2b69fd3751c2ef2d85fb2aaeaa05a5aaafb9e5`
Environment: Windows NT 10.0.26200.0, Node v22.21.1, pnpm 10.25.0
App mode reviewed: source/service regression. Original packaged-app reproduction came from clean-main review evidence.

## Original reproduction evidence

Clean-main packaged evidence at `C:\tmp\Pseudico-main-review\.review-evidence\review-app-evidence.json` records a project template containing a file placeholder. After applying the template and running diagnostics, both `integrityStatus` and `integrityAfterStatus` were `degraded` with one `file_details_missing` issue:

- target item: `item_mp9b2c64_0hd5axnzqwk`
- code: `file_details_missing`
- screenshot for template surface: `C:\tmp\Pseudico-main-review\.review-evidence\screenshots\15-templates.png`
- review workspace: `C:\tmp\Pseudico-main-review\.review-evidence\Review Workspace`

## Implemented behavior

Template application no longer creates a `file` item for file placeholders unless real binary-copy support is added through the normal file service path. Instead, each placeholder is materialized as a note titled `File placeholder: <name>`.

The note body states that template application does not copy binary attachment files yet, includes original attachment metadata when present, and tells the operator to reattach the source file from local storage before relying on it as an available attachment.

Template validation now rejects placeholder attachment paths that are absolute or that leave the workspace `attachments/` boundary.

## Evidence after fix

Targeted regression command:

- `./node_modules/.bin/vitest.CMD run packages/features/tests/containerTemplateService.test.ts` — Pass, 2 tests.
- `pnpm lint` — Pass.
- `pnpm typecheck` — Pass.
- `pnpm test` — Pass, 230 files / 887 tests.
- `pnpm build` — Pass.
- `pnpm package` — Pass; output `C:\tmp\Pseudico-pse-222\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`.
- `pnpm package:smoke` — Pass; packaged smoke created/opened a disposable workspace and local attachment under the OS temp folder.
- `pnpm release:package-check` — Pass; wrote `docs/release/package-artifact-check.json`.

Regression coverage verifies:

| Check | Result |
|---|---|
| Saving a project template preserves file placeholder metadata | Pass |
| Applying the template creates `File placeholder: brief.pdf` note instead of an orphan `file` item | Pass |
| Created placeholder note is indexed for local search | Pass |
| Note creation and template application produce activity entries | Pass |
| Workspace integrity has no `file_details_missing` issue and reports healthy in the seeded test workspace | Pass |
| Unsafe placeholder path `../outside/Unsafe.pdf` is rejected before apply | Pass |

## Backup/restore and attachment semantics

Because no fake attachment row or missing workspace file is created for a placeholder, backup/restore carries the placeholder note as normal searchable workspace content. Existing real attachments remain under the workspace `attachments/` tree and continue through the established backup/manifest path.

## Caveats

- Binary attachment copying from templates remains intentionally unsupported in this fix.
- Packaged UI screenshots were not regenerated because no renderer UI changed; the existing clean-main template screenshot remains the before evidence, and the source/service regression is the after evidence.
