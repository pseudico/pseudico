# Local-Only Security Review

Status: PSE-201 evidence baseline.
Scope: normal operator workflows, optional network-capable feature defaults, Electron boundary hardening, external URL opening, and dependency warning disposition.
Verdict: **No required network service found for normal operator workflows.** Optional network-capable features remain explicit and off by default.

## Evidence summary

| Area | Evidence | Result |
|---|---|---|
| Normal operator smoke | `apps/desktop/tests/smoke/operator-readiness-flow.test.ts` installs a failing `globalThis.fetch` spy and verifies the fresh-workspace operator journey makes no fetch calls. | Pass |
| Optional network defaults | `packages/features/tests/privacySettingsService.test.ts` verifies metadata fetch, web widgets, ICS URL import, IMAP import, and browser capture default off and require explicit enablement. | Pass |
| Renderer boundary | `apps/desktop/tests/security/renderer-boundary.test.ts` blocks renderer imports of Electron, raw IPC, and Node filesystem APIs. | Pass |
| Network sink inventory | `apps/desktop/tests/security/localOnlyNetwork.test.ts` fails if new network sinks appear outside the explicit optional-network allowlist. | Pass |
| External opener | `apps/desktop/tests/main/electronSecurity.test.ts`, link tests, and IPC tests verify allowed protocols and block unsafe protocols/credentials. | Pass |
| BrowserWindow hardening | `apps/desktop/tests/main/workspaceWindowSecurity.test.ts` verifies sandbox, context isolation, disabled Node integration, web security, and disabled webviews. | Pass |
| Dependency warning | `docs/release/dependency-license-audit.json` reports `simple-get@4.0.1` as network-capable. Static source tests confirm it is not imported by app source. | Accepted for pilot; review again before public release. |

## Optional network-capable features

These features are intentionally not part of normal local-only operation:

- Link metadata fetch.
- Web widgets.
- ICS URL import.
- IMAP import.
- Browser capture.

The privacy settings service stores all five as disabled by default. Disabled
features raise operator-facing messages such as "Link metadata fetching is
disabled in Privacy & Network settings." Enabling any of them must be explicit,
local-only where applicable, and covered by feature-specific tests and docs.
The static network allowlist includes browser capture's `CaptureBridge` because
it owns the disabled-by-default localhost intake bridge; it must not become a
cloud or remote capture service.

## External URL policy

External opens must route through validated main-process behavior.

- `http:`, `https:`, and `mailto:` are the only shared external opener
  protocols.
- HTTP(S) URLs with credentials are blocked.
- `file:`, `javascript:`, `data:`, `blob:`, `chrome:`, `devtools:`, and custom
  app schemes are blocked.
- Link records are HTTP(S)-only and reject embedded credentials before creation
  or update.
- The workspace window denies new windows and untrusted navigation, then only
  opens safe external URLs through the shared validator.

## Electron boundary

The workspace window keeps:

- `sandbox: true`
- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- `webviewTag: false`

Renderer code must continue to use the typed preload API and must not import
Electron, raw IPC, Node filesystem APIs, SQLite, or arbitrary network clients.

## Manual no-unexpected-network QA

Automated evidence proves the service-level operator smoke does not call
`fetch`, and static tests identify network-capable source paths. For internal
pilot, the owner accepts this automated/static evidence as an explicit caveat.
Before claiming nontechnical-operator-ready or public-release status, run a
packaged-app manual check on the target OS:

1. Disconnect network or use an OS firewall/network monitor.
2. Launch the packaged app.
3. Create/open a temporary local workspace.
4. Run the operator smoke steps from `docs/QA_SCRIPTS.md` without enabling
   optional network features.
5. Confirm the workflow succeeds without network access or prompts.
6. Confirm no unexpected outbound connections appear in the monitor.
7. Enable no optional network feature unless the test explicitly calls for it.

Record the tool, date, package build, and result in the final
operator-readiness report. Until then, describe OR-R3 as accepted for internal
pilot only, not fully proven by packaged OS-level monitoring.

## Open risks and follow-ups

- This is not a penetration test.
- Packaged-app packet-capture evidence is still manual and belongs in the final
  operator-readiness report before stronger handoff claims. It is owner-accepted
  as an internal-pilot caveat only.
- Any future browser capture, web widget, IMAP, ICS URL import, metadata fetch,
  auto-update, remote diagnostics, or licensing work must open a separate
  ticket and preserve the local-only product promise.
