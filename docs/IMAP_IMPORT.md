# Optional local IMAP import

Local Work OS treats IMAP as an optional desktop-only import source, not a hosted
mail service. The importer foundation is deliberately adapter-based so the app
can test a mailbox connection and fetch messages only when the user explicitly
configures a local IMAP account.

## Packaged-app pilot status

PSE-223 classifies IMAP as scaffold/adapter-required for pilot packaging. The
packaged Settings UI should continue directing operators to EML/Maildir import
until a real OS-keychain IMAP adapter is implemented and reviewed.

## Boundary

- No hosted forwarding address, cloud mailbox mirror, telemetry, or background
  cloud worker is introduced.
- Non-secret account settings may be stored in workspace `app_settings` under
  `import.imap.settings.v1`.
- Passwords are never stored in SQLite. A platform adapter must use the OS
  keychain where available, or hold a session-only credential that disappears
  when the app closes.
- Import runs persist local `imap_import_jobs` history and
  `imap_imported_messages` duplicate markers.

## Import behavior

1. Validate IMAP host, port, username, mailbox, and filter.
2. Resolve credentials from the configured keychain/session adapter.
3. Test the local IMAP connection before importing.
4. Fetch bounded unread or labelled messages.
5. Skip messages already recorded for the same workspace/account/mailbox UID or
   Message-ID.
6. Convert imported messages through the existing local email-to-task flow so
   task activity/search behavior remains consistent.

## Current limitation

This ticket adds the service, schema, duplicate-prevention, mock-adapter tests,
and settings guidance. Production desktop builds still need an OS-keychain IMAP
client adapter before the UI can enable live mailbox import.
