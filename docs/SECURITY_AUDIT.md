# Security Audit - Electron IPC, Widgets, and External Links

Ticket: PSE-175 / LWO-M14-001
Date: 2026-05-14

## Scope

This audit covers the current desktop security posture for the Electron window,
preload bridge, IPC inputs, external link handling, drag/drop file intake, and
embedded web/widget surfaces.

## Current posture

- `BrowserWindow` keeps `contextIsolation`, `sandbox`, and `webSecurity`
  enabled, disables `nodeIntegration`, and disallows insecure mixed content.
- The preload bridge exposes the typed `window.localWorkOs` API only. It does
  not expose raw `ipcRenderer`, Node filesystem APIs, or unrestricted Electron
  primitives.
- Renderer source is checked by `apps/desktop/tests/security` to prevent direct
  Electron, raw IPC, and Node filesystem imports.
- New windows and renderer navigations are denied by default. Safe external
  opens are limited to `https:`, `http:`, and `mailto:` URLs without embedded
  credentials.
- `file:`, `javascript:`, `data:`, `blob:`, `chrome:`, `devtools:`, custom app
  schemes, URL credentials, and malformed URLs are not opened externally.
- `<webview>` attachment is blocked. Web widgets remain out of scope until a
  later ticket defines a sandboxed, opt-in local-only design.
- Drag/drop and file-attachment IPC now reject URL-like payloads before service
  access. Accepted payloads must be local file paths; copied attachments remain
  stored inside the active workspace.

## Manual QA checklist

Run these checks against a development build or packaged smoke build:

1. Click or trigger a normal `https://example.com` link and confirm it opens in
   the OS browser rather than inside the app window.
2. Attempt `file:///...`, `javascript:...`, `data:...`, and a URL containing
   credentials such as `https://user:pass@example.com`; confirm none open.
3. Attempt to navigate the app window directly to an external URL and confirm
   the renderer stays on the trusted app surface.
4. Attempt to attach dropped payloads that resolve to URL strings rather than
   local file paths; confirm the app reports validation failure and does not
   copy/open the target.
5. Confirm normal local file attachment through the file picker and OS drag/drop
   still copies the file into workspace-relative `attachments/` storage.

## Follow-up watchlist

- Any future browser capture, web widget, or automation surface must stay
  disabled by default and must define its own sandbox, allowlist, and tests.
- Any new IPC endpoint must validate unknown input at the main/preload boundary
  before database or filesystem service access.
- Any new external opener must use the shared external URL validator.
