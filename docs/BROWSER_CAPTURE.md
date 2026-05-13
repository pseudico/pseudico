# Browser Capture Setup

Local Work OS includes a local-only browser capture bridge for saving the
current page as an Inbox link or follow-up task. It does not use cloud sync,
hosted accounts, telemetry, or remote storage.

## Security model

- The desktop bridge is disabled by default.
- Localhost mode binds only to `127.0.0.1` / loopback.
- Every request must include a long pairing token.
- Browser-originated data is validated by the main-process bridge, then written
  through `CaptureService`, `LinkService`, or `TaskService` so activity-log and
  search-index writes remain intact.
- Renderer code does not get filesystem or database access.

## Extension scaffold

The unpacked Chromium-compatible extension lives in:

```text
extension/browser-capture/
```

For development:

1. Open the browser extensions page.
2. Enable developer mode.
3. Load `extension/browser-capture/` as an unpacked extension.
4. Put the local pairing token into the popup settings.
5. Choose either native messaging or localhost development bridge.

## Localhost development bridge

Start the desktop app with:

```text
LOCAL_WORK_OS_CAPTURE_BRIDGE=localhost
LOCAL_WORK_OS_CAPTURE_TOKEN=<unguessable-token-at-least-24-chars>
LOCAL_WORK_OS_CAPTURE_PORT=<port>
```

If `LOCAL_WORK_OS_CAPTURE_PORT` is omitted or `0`, the app chooses a free local
port and logs/status inspection should be used to copy the active URL into the
extension popup. Requests go to:

```text
POST http://127.0.0.1:<port>/capture
Authorization: Bearer <token>
```

Body:

```json
{
  "format": "link",
  "payload": {
    "sourceUrl": "https://example.com/page",
    "title": "Example page",
    "selectionText": "Optional selected text"
  },
  "target": {
    "containerId": null,
    "containerTabId": null
  }
}
```

Use `"format": "task"` to create a task. If no target container is supplied,
capture falls back to the current workspace Inbox.

## Native messaging scaffold

The native messaging host manifest template lives in:

```text
extension/native-host/com.localworkos.capture.template.json
```

The app-side `NativeMessagingService` validates the same token-protected capture
message contract and forwards accepted messages into the same capture intake
path. Packaging-specific native-host registration is intentionally kept as a
setup step so no browser integration is installed without explicit user action.

## Manual QA

1. Open a Local Work OS workspace.
2. Start the desktop app with localhost bridge variables and a long token.
3. Load the unpacked extension and save the same token plus bridge URL.
4. Open a webpage, select text, and choose **Capture page as Local Work OS link**.
5. Confirm the new link appears in Inbox with URL, title, and selected text.
6. Repeat with **Capture page as Local Work OS task** and confirm an Inbox task
   is created with the source URL in the body.
