# GitHub CI Setup — Local Work OS

This project should use GitHub Actions for CI.

GitHub Actions workflows are YAML files under `.github/workflows/`. A workflow is a configurable automated process made up of one or more jobs.

---

# Initial workflow

Use `.github/workflows/ci.yml` from this bundle.

It should run on:

```text
pull_request
push to main
```

Initial jobs:

```text
lint
typecheck
unit-tests
build
```

---

# Required root commands

The repo should eventually support:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package
```

The CI workflow can be added before all packages exist, but the scaffold tickets should make these commands work quickly.

---

# CI expansion phases

## M0/M1

```text
lint
typecheck
unit tests
build
```

## M2–M6

```text
database tests
migration tests
Playwright smoke test
```

## M7–M14

```text
performance smoke test
package smoke test
security/dependency checks
full regression suite
```

---

# CI failure policy

If CI fails:

```text
1. Do not merge.
2. Ask Codex to inspect the failure.
3. Keep the fix scoped to the failing PR.
4. Do not use the CI failure as an excuse to add unrelated work.
```

Prompt:

```text
@Codex inspect the CI failure on this PR. Fix only the failing checks. Do not add unrelated features. Preserve the scope of the linked Linear issue.
```
