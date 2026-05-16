# Distribution, Licensing, Privacy, and Update Checklist

Status: PSE-188 research recommendation
Last reviewed: 2026-05-14
Scope: local-only desktop distribution planning; no billing or update code

## Purpose

This checklist records the recommended release path for distributing Local Work
OS while preserving the project scope: desktop-only, local-only, single-user,
no hosted accounts, no telemetry, no cloud sync, no team collaboration, and no
remote storage.

It is a research/proposal artifact. It does not implement licensing, billing,
auto-update, network services, installers, or certificate automation.

## Recommendation

Use a staged distribution path:

1. **Internal/dev distribution:** keep the current unpacked `electron-builder`
   `dir` package and `pnpm package:smoke` for local verification.
2. **Release-candidate distribution:** produce signed platform artifacts, but
   keep auto-update disabled until signing, release metadata, and rollback
   procedures are proven.
3. **Public direct distribution:** require macOS Developer ID signing plus
   notarization, Windows trusted code signing, Linux package checksums, a local
   privacy notice, dependency license notices, and a manual update download path.
4. **Optional future auto-update:** add only after a separate scoped ticket
   selects a feed host, verifies signed update metadata, documents rollback,
   and keeps update checks explicit/disableable.

Do not add license activation, hosted accounts, telemetry, or cloud services as
part of distribution readiness.

## Platform distribution checklist

| Area | Release gate | Recommendation | Evidence / owner |
|---|---|---|---|
| macOS signing | Required before external direct distribution | Sign with Apple Developer ID and notarize before publishing any `.dmg` or `.zip` artifact. Notarization should use current Apple tooling (`notarytool` or Xcode 14+), not deprecated `altool`. | Apple Developer / release owner |
| macOS hardened runtime | Required before notarization | Keep Electron entitlements minimal; enable hardened runtime for distributed builds; document any entitlement additions in `docs/SECURITY.md`. | release owner |
| Windows signing | Required before broad Windows distribution | Use a trusted code-signing path such as Azure Artifact Signing / Trusted Signing or another trusted CA-backed signing process before publishing installer artifacts. | release owner |
| Windows SmartScreen/reputation | Required risk review | Expect reputation warm-up even after signing; publish checksums and consistent publisher identity. | release owner |
| Linux artifacts | Required before Linux release | Publish checksums and package format notes; signing strategy can start with detached checksum/signature until a package repository exists. | release owner |
| Checksums | Required for every artifact | Publish SHA-256 checksums next to release downloads and include verification instructions in release notes. | release owner |
| Reproducibility | Recommended | Keep package commands deterministic enough for CI/release comparison, but do not claim reproducible builds until a dedicated ticket proves it. | future release-hardening ticket |

## Licensing checklist

| Area | Decision | Local-only guardrail |
|---|---|---|
| App license | Owner must choose before public release. | The repo currently has no billing/licensing system; do not add one in release-hardening tickets without approval. |
| License enforcement | Do not implement for MVP/release-candidate builds. | Avoid activation servers, hosted accounts, online entitlement checks, or telemetry-backed license checks. |
| Optional future local license | If commercial licensing is approved later, prefer an offline signed license file imported by the user. | License validation must run locally and must not block access to user workspace data. |
| Third-party notices | Generate and review dependency license notices before release. | Include Electron/React/Vite/TypeScript/runtime notices and keep proprietary assets out of the app bundle. |
| Asset rights | Use only original, permissively licensed, or project-owned assets. | Do not copy proprietary branding, screenshots, icons, wording, or UI layouts from reference products. |

## Dependency and license audit gate

Run the local dependency/license/privacy audit before a release candidate:

```bash
pnpm audit:dependencies
```

The command writes:

- `docs/release/dependency-license-audit.json` — machine-readable dependency
  inventory, failures, and warnings.
- `docs/release/THIRD_PARTY_NOTICES.md` — human-readable package notice
  inventory for runtime and release-tooling dependencies.

The audit fails on review-blocking license families and packages that match the
telemetry/cloud/auto-update/licensing denylist. It warns on packages that are
network-capable or missing license metadata so the release owner can document a
decision. The audit is local-only: it reads package metadata from the checked-out
workspace and installed dependencies and does not call remote registries.

Current PSE-200 baseline evidence:

- Runtime dependencies reviewed by the generated audit: 47.
- Release-tooling dependencies reviewed by the generated audit: 14.
- Review-blocking failures: 0.
- Warnings: 1 — `simple-get@4.0.1`, a transitive dependency of native package
  install tooling, is network-capable by package purpose and must remain unused
  by normal local-only app workflows. PSE-201 owns end-to-end network behavior
  verification.
- No telemetry SDK, hosted account, billing/license activation, cloud sync,
  remote storage, or auto-update dependency is approved by this evidence.

## Privacy checklist

| Area | Requirement | Release gate |
|---|---|---|
| Privacy notice | Publish a clear local-only privacy notice before public distribution. | Must state that workspace content, attachments, backups, exports, logs, and search indexes are local files. |
| Telemetry | No telemetry by default. | Any future diagnostics upload requires explicit owner approval and a separate scoped ticket. |
| Network access | No required network service for normal app use. | Update checks, browser capture, IMAP, metadata fetching, or documentation links must remain optional and documented. |
| Updates | Manual updates first; optional automatic updates later. | Users must be able to run the app without an account or remote service. |
| User data ownership | User workspace data remains under the selected workspace folder. | Release notes must warn users to back up workspace folders before upgrades. |
| Logs | Logs must not include secrets, full attachment contents, or unnecessary personal data. | Keep logs local and document where they live. |
| Uninstall | App removal must not delete user workspace folders by default. | Document manual workspace deletion separately. |

## Auto-update path

Auto-update is not part of the current release gate. If it is approved later,
use a separate ticket with these requirements:

- signing and notarization must already be working for the target platform;
- update metadata must be signed or backed by platform-supported signature
  validation;
- update checks must be user-visible and disableable;
- no account, telemetry, or cloud workspace service can be introduced;
- rollback/manual download instructions must exist before enabling automatic
  installs; and
- CI must test update metadata generation without publishing to production.

Electron's built-in `autoUpdater` and `electron-updater` both assume platform
packaging constraints. For this app, the safer recommendation is to ship manual
updates first and revisit auto-update only after signing and release operations
are stable.

## Release readiness checklist

Before a public release candidate, verify:

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`,
      `pnpm package:smoke`, and `pnpm release:package-check` pass on the
      release machine/CI.
- [ ] `pnpm audit:dependencies` passes and generated notices are reviewed.
- [ ] macOS artifacts are signed and notarized, if macOS is in scope.
- [ ] Windows artifacts are signed, if Windows is in scope.
- [ ] Linux artifacts include checksums and package notes, if Linux is in scope.
- [ ] Dependency license notices are generated and reviewed.
- [ ] Privacy notice and release notes match the local-only implementation.
- [ ] Workspace data, attachments, backups, exports, and logs are created
      outside the app bundle.
- [ ] Manual update and backup-before-upgrade instructions are documented.
- [ ] `docs/release/package-artifact-check.json` contains current artifact
      checksums and no package data-boundary failures.
- [ ] No telemetry, hosted account, cloud sync, or remote storage dependency is
      introduced.

## Open decisions

| Decision | Default recommendation | Needed before |
|---|---|---|
| Public license for app source/binaries | Owner decision pending. | Public release. |
| Windows signing provider | Prefer Azure Artifact Signing / Trusted Signing or comparable trusted CA-backed path. | Windows public release. |
| macOS distribution channel | Direct distribution with Developer ID and notarization; App Store is out of scope unless approved. | macOS public release. |
| Auto-update provider/feed | Defer; manual downloads first. | Any automatic update implementation. |
| Paid licensing | Defer; no billing/license enforcement. | Any commercial release decision. |

## Sources reviewed

- Apple Developer Documentation: Notarizing macOS software before distribution — https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Apple Platform Security: app code signing process in macOS — https://support.apple.com/guide/security/app-code-signing-process-sec3ad8e6e53/web
- Electron documentation: Code Signing — https://www.electronjs.org/docs/latest/tutorial/code-signing
- Electron documentation: `autoUpdater` — https://www.electronjs.org/docs/latest/api/auto-updater
- electron-builder documentation: Auto Update — https://www.electron.build/auto-update.html
- Microsoft Learn: Code signing options for Windows app developers — https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options
- Microsoft Learn: Azure Artifact Signing quickstart — https://learn.microsoft.com/azure/trusted-signing/quickstart
