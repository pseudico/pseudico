# PSE-275 installer-grade beta package evidence

Status: final local evidence generated from clean committed package source for PR handoff.

## Source reconciliation

- Worktree: C:\tmp\Pseudico-pse-275-installer-beta
- Branch: codex/pse-275-installer-beta
- Base source commit: bcec3a174b359ea0aaa259c2488f585540bbce23 (origin/main, docs: sync beta handoff after workflow loop)
- Package source commit: aa6c452826472ef39c6e758801289c65091789b2 (clean codex/pse-275-installer-beta).
- Current dirty/stale checkout at C:\Users\AlastairLacey\Pseudico was not used as package source.
- GitHub open PRs at start: none.
- Related beta/workflow/package branches were audited; all relevant PRs were already merged/closed, and stale branch differences were not used as release input.

## Package targets

- Windows NSIS installer: apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.exe
- Windows zip archive: apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.zip
- Existing smoke target retained: apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe
- Version: 0.1.0-beta.1
- Signing: unsigned beta; Authenticode status NotSigned; Windows SmartScreen / unknown-publisher prompts are expected.
- Auto-update: disabled (publish: null); no update feed, telemetry, hosted account, cloud sync, billing, or remote storage was added.

## Current artifact hashes

- executable: 5c94145de4971d8db337fd91fc073a2b73d8b9ec340a949bc2cc2a1ae9eebea4 (222973952 bytes)
- app.asar: e843990066cc9795e34d11c250043536df80b325f442fa015b7ea2565d7276d1 (36259433 bytes)
- windows-nsis-installer: 64987cd15f4007bb5d95a9f646e529127151f62c9505e1c9f8047568771af310 (113358526 bytes)
- windows-zip-archive: 0dcd7f78069cf69754139569fa819567a62e8ba5c762dbf6e64ab16c98f561ee (156104337 bytes)

See docs/release/package-artifact-check.json for generated paths, sizes, and SHA-256 hashes from package source commit aa6c452826472ef39c6e758801289c65091789b2.

## Commands run

- git fetch --all --prune — pass.
- gh pr list --repo pseudico/pseudico --state open --limit 100 — no open PRs.
- pnpm install --frozen-lockfile — pass.
- pnpm lint — pass.
- pnpm typecheck — pass.
- pnpm test — pass, 239 files / 929 tests.
- pnpm build — pass.
- pnpm package — pass from clean package source; produced win-unpacked, NSIS installer, and zip archive.
- pnpm package:smoke — pass against win-unpacked.
- pnpm release:package-check — pass against installer/archive/unpacked artifacts.
- pnpm audit:dependencies — pass with existing documented simple-get warning.
- pnpm coverage:map — pass.
- pnpm qa:parity — pass.

## Manual installer/archive smoke

- Installed final NSIS artifact silently into C:\tmp\Pseudico-pse275-installed-beta with pre-created target directory: pass.
- Created a persistent workspace from the installed app at C:\tmp\Pseudico-pse275-persistent-workspace-final: pass.
- Created representative data through packaged IPC: project, contact, task, note, list, local search, Today view model, Dashboard default, and manual backup: pass.
- Quit/reopened installed app and reopened the same workspace: pass; token-pse275-final search returned 3 results.
- Uninstalled NSIS app: pass; install folder removed and persistent workspace/database remained.
- Reinstalled NSIS app and reopened same workspace: pass; token-pse275-final search returned 3 results.
- Extracted final zip archive and ran package-smoke mode from extracted Local Work OS.exe: pass.
- Evidence JSON: docs/manual-qa/PSE-275-installer-manual-smoke.json.

## Caveats / owner decisions

- This is a controlled nontechnical beta candidate, not public GA.
- Unsigned installer/archive requires owner acceptance before sharing; SmartScreen warnings are expected.
- NSIS silent install smoke required the custom /D= target directory to be pre-created during local automation. Normal interactive install remains the intended nontechnical path.
- No OS-level no-unexpected-network monitor has been rerun for this installer yet; dependency audit and static local-only guardrails remain in scope.
- No P0/P1 deploy blocker remains from local validation; owner still must accept unsigned/manual-distribution caveats before sending.
