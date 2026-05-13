# Browser Capture Module

Owns the local-only browser capture payload contract and conversion of captured pages into Inbox links or tasks.

Implemented scope:

- Capture payload normalization and URL protocol guardrails.
- Inbox link creation through `LinkService`.
- Inbox task creation through `TaskService`.
- Optional target container/tab capture for the current workspace.
- Disabled-by-default desktop bridge integration for native messaging or localhost experiments.

Does not own:

- Browser extension publishing.
- Cloud capture or hosted preview services.
- Direct database or filesystem access from renderer/browser code.
