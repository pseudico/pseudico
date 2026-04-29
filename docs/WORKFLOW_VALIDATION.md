# Workflow Validation

Validation issue: `PSE-6`

This file confirms the repository has the minimum workflow scaffolding needed
for supervised Codex development:

- `AGENTS.md` exists at the repository root.
- `.github/pull_request_template.md` exists.
- `.github/workflows/ci.yml` exists.
- `.github/codex/review-guidelines.md` exists.
- Product and operating docs exist under `docs/`.
- Ticket packs exist under `docs/tickets/`.

This validation change is intentionally docs-only. It does not add app code,
package dependencies, Electron scaffolding, or database work.

## Expected Result

Opening this change as a pull request should prove that GitHub, Linear, and
Codex can track a small scoped issue through the normal branch/PR workflow.

CI may not pass until `PSE-7` creates the pnpm monorepo scaffold expected by the
workflow file.
