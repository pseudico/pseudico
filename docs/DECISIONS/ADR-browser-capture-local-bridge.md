# ADR: Local Browser Capture Bridge

## Status

Accepted for prototype, disabled by default.

## Context

Local Work OS should eventually let a user capture the current browser page into a local Inbox link or follow-up task. The feature is useful, but it creates a new boundary between a browser and the local desktop app. That boundary must not introduce cloud dependencies, remote file storage, telemetry, public sharing, renderer filesystem access, or direct database access from browser-originated code.

PSE-82 / LWO-M8-007 scopes this to a specification plus a safe prototype. Publishing a browser extension, enabling a background listener by default, or accepting arbitrary external writes is out of scope.

## Decision

Use a local-only capture contract in `CaptureService` and keep the desktop bridge disabled by default.

The preferred future bridge is browser native messaging because it is explicit, browser-mediated, and avoids opening a network port. A localhost HTTP endpoint remains a fallback only for development or browsers where native messaging is not practical. Any localhost bridge must bind to `127.0.0.1`, require an unguessable token, reject non-POST routes, and stay disabled unless the user explicitly opts in.

The prototype adds:

- `packages/features/src/capture/CaptureService.ts` for validating capture payloads and creating Inbox links/tasks through existing services.
- `apps/desktop/src/main/services/CaptureBridge.ts` as a disabled-by-default bridge stub.
- Tests proving capture writes use existing link/task service paths and that the bridge does not listen by default.

## Bridge options compared

| Option | Benefits | Risks | Decision |
| --- | --- | --- | --- |
| Native messaging | No open port, explicit browser/app registration, easier to keep local-only | Requires per-browser manifest/install work and later packaging decisions | Preferred future path |
| Localhost endpoint | Simple to prototype and browser-extension friendly | Opens a local attack surface; must handle auth, CORS, CSRF-like requests, lifecycle, port collisions | Fallback only, disabled by default |

## Capture payload

```ts
type BrowserCapturePayload = {
  workspaceId: string;
  sourceUrl: string;
  capturedAt?: string | null;
  pageTitle?: string | null;
  title?: string | null;
  description?: string | null;
  selectionText?: string | null;
  note?: string | null;
};
```

Rules:

- `sourceUrl` must normalize to HTTP or HTTPS.
- `file:`, `data:`, `javascript:`, and other non-web protocols are rejected.
- Text fields are trimmed and bounded before persistence.
- Link capture creates an Inbox link via `LinkService.createLink`.
- Task capture creates an Inbox task via `TaskService.createTask`.
- Existing services remain responsible for activity log and search index writes.

## Security guardrails

- Bridge remains disabled by default.
- No cloud service, account, telemetry, or remote storage is added.
- Browser-originated input never writes SQLite directly.
- Renderer code does not gain filesystem or database access.
- The prototype does not publish or install an extension.
- Future enablement requires explicit user opt-in and packaging/install review.

## Consequences

- PSE-82 delivers a concrete local capture contract and safe prototype without exposing a listener by default.
- A future extension/native messaging ticket can reuse the payload and service methods.
- Manual QA for real browser capture remains a follow-up because no extension is shipped here.
