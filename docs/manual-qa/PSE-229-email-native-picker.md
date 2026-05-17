# PSE-229 Windows email native picker QA

Date: 2026-05-18 09:06 Australia/Sydney
Linear: PSE-229 - Review Windows email import native picker coverage
Branch: `codex/pse-229-email-picker`
Base commit: `208d8e85dbd468c437d21c206252fd6bad52d288`
Package: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`
OS/runtime: Windows packaged app, Node `v22.21.1`, pnpm `10.25.0`

## Scope

PSE-229 closes the PSE-228 caveat where the email import picker used one mixed
file/folder dialog. On Windows that mixed picker behaved like a folder picker,
so an operator could not confidently select a single `.eml` file through native
dialog QA.

The fix separates the operator actions:

- **Import EML file to Inbox** opens a file-only native dialog filtered to
  `.eml`.
- **Import email folder to Inbox** opens a directory-only native dialog for
  Maildir/email folders.

No mail account sync, IMAP adapter, cloud mail, hosted account, telemetry, or
remote storage behavior was added.

Machine-readable run summary:
`docs/manual-qa/PSE-229-email-picker-summary.json`.

Screenshot folder:
`docs/manual-qa/screenshots/PSE-229-2026-05-18T09-05-00/`.

## Command evidence

- `pnpm install --frozen-lockfile` - pass in fresh PSE-229 worktree.
- `pnpm test -- apps/desktop/tests/main/importHandlers.test.ts` - initial
  sandbox run hit Vitest `spawn EPERM`; rerun outside sandbox passed, 1 file /
  8 tests.
- `pnpm typecheck` - pass.
- `pnpm lint` - pass.
- `pnpm test` - pass, 230 files / 890 tests.
- `pnpm package` - pass; output:
  `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- `pnpm package:smoke` - pass.
- `pnpm release:package-check` - pass.
- Packaged Windows email picker QA - pass; launched the packaged executable,
  exercised the real native EML file picker cancel/select path, verified missing
  path handling, and captured actual app screenshots.

## Operator-facing result

| Flow | Result | Evidence |
| --- | --- | --- |
| Settings email import actions | Pass | UI now shows separate `Import EML file to Inbox` and `Import email folder to Inbox` actions. |
| EML file picker cancel | Pass | Real Windows file dialog cancelled and returned `null`; no task was created. |
| EML file picker select | Pass | Real Windows file dialog selected `native-picker-follow-up.eml`; one Inbox task was created with original email attached. |
| Missing EML path | Pass | Direct invalid path returned a safe `WORKSPACE_ERROR`; no partial import was reported. |
| Maildir/email folder action | Scoped code path | Directory action now routes through a directory-only chooser; PSE-229 package QA focused on the previously unproven `.eml` native file picker. |

## Visual evidence

| Screenshot | Operator question answered | Result |
| --- | --- | --- |
| `01-packaged-welcome.png` | Does the packaged app start from the normal local workspace entry point? | Pass. |
| `02-settings-email-import-buttons.png` | Can the operator tell whether they are importing one `.eml` file or a folder in a real local workspace? | Pass. |
| `03-inbox-after-native-eml-picker.png` | Does selected email become visible work in Inbox? | Pass. |
| `04-settings-after-email-import.png` | Does Settings remain understandable after import? | Pass. |

## Acceptance status

- Packaged Windows app can select an `.eml` file through the UI picker:
  **Pass**.
- Cancel path is safe: **Pass**.
- Invalid/missing path is safe: **Pass**.
- Created data is visible in Inbox: **Pass**.
- Original email attachment is created through the existing local attachment
  write path: **Pass** in targeted IPC test and package smoke/import summary.
- Activity/search behavior for imported email task is covered by targeted IPC
  test: **Pass**.
- Duplicate/conflict behavior remains the existing email import service behavior
  from PSE-223/package smoke; PSE-229 did not broaden importer semantics.

## Risk classification

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Native picker corrupts or loses local workspace data. | Not observed. |
| P1 | Operator cannot select a single `.eml` file through the native Windows picker. | Fixed by file-only picker action and packaged QA. |
| P2 | Maildir folder import still needs separate hands-on folder-selection evidence before stronger nontechnical claims. | Directory-only chooser is implemented; PSE-229 focused on the `.eml` gap. |
| P3 | Native-dialog QA remains manual/packaged evidence, not stable CI automation. | Documented. |

## Architecture and local-only safety

- Renderer still calls the preload API; it does not access Node filesystem APIs.
- Native file/folder paths are selected in Electron main process and passed
  through existing validated IPC import handlers.
- Email import still writes through repository/service-backed task, attachment,
  activity, and search paths.
- The package remains unsigned/unpacked/internal-pilot only.
