# PSE-275 installer-grade beta package evidence

Status: preliminary local implementation evidence; final source commit and hashes must be regenerated from a clean committed branch before PR handoff.

## Source reconciliation

- Worktree: `C:\tmp\Pseudico-pse-275-installer-beta`
- Branch: `codex/pse-275-installer-beta`
- Base source commit: `bcec3a174b359ea0aaa259c2488f585540bbce23` (`origin/main`, `docs: sync beta handoff after workflow loop`)
- Current dirty/stale checkout at `C:\Users\AlastairLacey\Pseudico` was not used as package source.
- GitHub open PRs at start: none.
- Related beta/workflow/package branches were audited; all relevant PRs were already merged/closed, and stale branch differences were not used as release input.

## Package targets

- Windows NSIS installer: `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.exe`
- Windows zip archive: `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.zip`
- Existing smoke target retained: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`
- Version: `0.1.0-beta.1`
- Signing: unsigned beta; Authenticode status `NotSigned`; Windows SmartScreen / unknown-publisher prompts are expected.
- Auto-update: disabled (`publish: null`); no update feed, telemetry, hosted account, cloud sync, billing, or remote storage was added.

## Current artifact hashes

- executable: $(@{kind=executable; path=C:\tmp\Pseudico-pse-275-installer-beta\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe; sizeBytes=222973952; sha256=ccafd90574012c71b50cdd38953a5a3462166758186aaf50a930d58522fc33f8}.sha256) (222973952 bytes)
- app.asar: $(@{kind=app.asar; path=C:\tmp\Pseudico-pse-275-installer-beta\apps\desktop\dist-packaged\win-unpacked\resources\app.asar; sizeBytes=36259433; sha256=fbbb99a2e1da5cd763e8e04c92ace9623c6d83aea28bbb12c1aac00e4c2ce01a}.sha256) (36259433 bytes)
- windows-nsis-installer: $(@{kind=windows-nsis-installer; path=C:\tmp\Pseudico-pse-275-installer-beta\apps\desktop\dist-packaged\Local Work OS-0.1.0-beta.1-win-x64.exe; sizeBytes=113358168; sha256=27ec8e23779eac5861cf629c802463cce2406de1a9e85fac15b9e370485f15ae}.sha256) (113358168 bytes)
- windows-zip-archive: $(@{kind=windows-zip-archive; path=C:\tmp\Pseudico-pse-275-installer-beta\apps\desktop\dist-packaged\Local Work OS-0.1.0-beta.1-win-x64.zip; sizeBytes=156104229; sha256=07b0662e567b587b3f5b43fe46151a33072223a133b59d992a3d029b580cf8e8}.sha256) (156104229 bytes)

See docs/release/package-artifact-check.json for generated paths, sizes, and SHA-256 hashes. Regenerate after final clean-source package build.

## Commands run so far

- `git fetch --all --prune` — pass.
- `gh pr list --repo pseudico/pseudico --state open --limit 100` — no open PRs.
- `pnpm install --frozen-lockfile` — pass.
- `pnpm lint` — pass.
- `pnpm typecheck` — pass.
- `pnpm test` — pass, 239 files / 929 tests.
- `pnpm build` — pass.
- `pnpm package` — pass; produced `win-unpacked`, NSIS installer, and zip archive.
- `pnpm package:smoke` — pass against `win-unpacked`.
- `pnpm release:package-check` — pass against installer/archive/unpacked artifacts.
- `pnpm audit:dependencies` — pass with existing documented `simple-get` warning.
- `pnpm coverage:map` — pass.
- `pnpm qa:parity` — pass.

## Manual installer/archive smoke

- Installed NSIS artifact silently into `C:\tmp\Pseudico-pse275-installed-beta` with pre-created target directory: pass.
- Ran installed app package-smoke mode: pass; created project/task/attachment/import/backup evidence outside the install folder.
- Created a persistent workspace from the installed app at `C:\tmp\Pseudico-pse275-persistent-workspace`: pass.
- Created representative data through packaged IPC: project, contact, task, note, list, local search, Today view model, Dashboard default, and manual backup: pass.
- Quit/reopened installed app and reopened the same workspace: pass; `token-pse275` search returned 3 results.
- Uninstalled NSIS app: pass; install folder removed and persistent workspace/database remained.
- Reinstalled NSIS app and reopened same workspace: pass; `token-pse275` search returned 3 results.
- Extracted zip archive and ran package-smoke mode from extracted `Local Work OS.exe`: pass.
- Evidence JSON: `docs/manual-qa/PSE-275-installer-manual-smoke.json`.

## Caveats / owner decisions

- This is a controlled nontechnical beta candidate, not public GA.
- Unsigned installer/archive requires owner acceptance before sharing; SmartScreen warnings are expected.
- NSIS silent install smoke required the custom `/D=` target directory to be pre-created during local automation. Normal interactive install remains the intended nontechnical path.
- No OS-level no-unexpected-network monitor has been rerun for this installer yet; dependency audit and static local-only guardrails remain in scope until final validation.
- Final PR should not claim ready to distribute until the clean committed-source validation pass and final hashes are recorded.

