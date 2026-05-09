# Browser Capture Module

Owns the local-only browser capture payload contract and conversion of captured pages into Inbox links or tasks.

Current PSE-82 scope:

- Capture payload normalization and URL protocol guardrails.
- Inbox link creation through `LinkService`.
- Inbox task creation through `TaskService`.
- Disabled-by-default desktop bridge stub for future native messaging or localhost experiments.

Does not own:

- Browser extension publishing.
- Cloud capture or hosted preview services.
- Direct database or filesystem access from renderer/browser code.
