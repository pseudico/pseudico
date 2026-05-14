# Localization Scaffold

Local Work OS is currently English-only, but shell/navigation copy now flows
through a small i18n scaffold so future translation tickets do not need to
invent a message boundary.

## Current scope

- Default locale: `en`.
- English message resources live in `packages/core/src/i18n/`.
- `t(key)` resolves English strings and falls back to the key for missing
  future translations.
- Locale-aware date/time and number formatting helpers wrap `Intl`.
- Settings shows a read-only language and locale placeholder; no locale
  preference is persisted yet.

## Guardrails

- Keep resources local in the repository; do not add hosted translation or
  telemetry services.
- Add translation keys before replacing user-facing shell strings.
- Missing keys should remain visible and deterministic during development.
- Persisted locale selection should be added only in a scoped future ticket.
