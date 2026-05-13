# ADR-0004: Optional Local Workspace Encryption Spike

- Status: Proposed
- Date: 2026-05-14
- Owners: Local Work OS maintainers

## Context

Local Work OS stores user projects, contacts, notes, tasks, search projections,
imports, backups, exports, and attachments in a local workspace folder. The
current production format relies on operating-system account and filesystem
controls; it does not claim application-level encryption at rest.

Optional workspace encryption is attractive for local privacy, but it changes
the durability, recovery, packaging, and support model. A local-only app has no
hosted account or server-side recovery path, and encryption mistakes can
permanently lock users out of their workspace.

Research notes from primary references:

- Standard SQLite does not encrypt database files by default; encrypted SQLite
  requires a modified/native SQLite library such as SQLCipher, SQLiteCrypt, or
  wxSQLite3. See Microsoft SQLite encryption guidance:
  https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/encryption
- SQLCipher is the most plausible open-source candidate because it provides a
  SQLite-compatible encrypted database library, uses `PRAGMA key`/`sqlite3_key`
  during connection setup, and supports converting plaintext databases through
  SQLCipher-specific export paths. See:
  https://www.zetetic.net/sqlcipher/sqlcipher-api/ and
  https://github.com/sqlcipher/sqlcipher
- Electron `safeStorage` can protect small secrets with OS-provided
  cryptography from the main process, but its security semantics vary by
  platform; Linux can fall back to `basic_text` when no secret store is
  available. See: https://www.electronjs.org/docs/latest/api/safe-storage

## Decision

Do not change the production workspace format in this ticket.

Adopt the following recommendation for future implementation planning:

1. Treat optional workspace encryption as a gated, explicit opt-in capability.
2. Prototype database encryption with a SQLCipher-compatible native adapter,
   never with homegrown database crypto.
3. Keep passphrase entry and key derivation in Electron main-process controlled
   code. Renderer flows may request unlock through typed preload IPC, but raw
   passphrases, derived keys, and wrapped workspace keys must not become
   renderer state.
4. Use a passphrase-derived workspace key as the portable recovery baseline.
   OS secret storage may later provide a convenience unlock wrapper only when
   platform support is verified and a recovery passphrase remains available.
5. Encrypt attachment bytes with a separate per-workspace/per-file envelope;
   database encryption alone does not protect files under `attachments/`.
6. Define backup, restore, export, search, and preview behavior before any
   migration. Encrypted workspaces must not silently create plaintext copies in
   `backups/`, `exports/`, temp folders, search caches, or package-smoke
   artifacts.

A small pure TypeScript prototype contract now lives in
`packages/core/src/services/workspaceEncryption.ts`. It captures the required
implementation gates and classifies proposed shapes as disabled, prototype-only,
or candidate-for-implementation. This is intentionally not cryptographic code
and does not read or write workspace files.

## Required Gates Before Production Implementation

- Prove a SQLCipher-compatible native SQLite adapter works with Electron,
  Drizzle, migrations, packaged builds, and cross-platform distribution.
- Keep unlock and key material behind main/preload IPC; renderer code must
  never receive raw keys.
- Add attachment encryption envelopes and migration/rekey behavior.
- Define encrypted backup, restore, export, and import policies.
- Define forgotten-passphrase, recovery-key, key rotation, and rekey UX.
- Audit search indexes, note previews, imported mail/task bodies, file
  metadata, temp files, logs, crash artifacts, and package-smoke outputs for
  plaintext leakage.
- Benchmark startup, query/search, backup, export, and large-attachment
  workflows.
- Verify Windows DPAPI, macOS Keychain, and Linux secret-store behavior,
  including explicit handling for unavailable or weak Linux backends.

## Consequences

- Current workspaces remain readable by the existing app; no migration risk is
  introduced by this spike.
- The recommended path preserves Local Work OS local-only scope and avoids any
  hosted recovery, account, telemetry, or remote-storage dependency.
- A real implementation will be larger than a single schema flag because it
  affects native packaging, workspace open/unlock, attachment storage, backup,
  export/import, search, maintenance, package smoke tests, and user recovery.
- Lost passphrases must be treated as unrecoverable unless a user-controlled
  recovery key has been configured.

## Alternatives Considered

- **Filesystem-only encryption guidance:** Rejected as the sole app-level plan.
  It is useful user guidance but does not provide portable workspace behavior
  controlled by Local Work OS.
- **Encrypt selected sensitive fields only:** Rejected for the first production
  direction because search indexes, relationship graphs, activity logs, and
  mixed content would still reveal substantial plaintext metadata.
- **Homegrown encryption around SQLite pages or repository payloads:** Rejected
  because it is high-risk cryptography and would bypass mature SQLite-encryption
  migration and integrity behavior.
- **OS-keychain-only unlock with no user passphrase:** Rejected because it harms
  portability and recovery, and Electron safe-storage behavior differs across
  platforms.

## Follow-up Tickets

- SQLCipher native adapter packaging spike for Electron, Drizzle, and packaged
  builds.
- Workspace unlock UX and IPC contract with no renderer key material.
- Attachment envelope encryption prototype and migration plan.
- Encrypted backup/export/import policy and fixture tests.
- Recovery, rekey, and performance benchmark plan.

## Related Documents

- `docs/SECURITY.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_REGISTRY.md`
- `docs/tickets/M9_M14_TICKET_PACK.md`
- Linear: `PSE-176`
