# GitHub Workflow — Local Work OS

GitHub is the source of truth for code.

## Branches

```text
main
LWO-__/short-slug
```

## Pull requests

Every implementation PR must:

```text
include Linear issue key
use PR template
link relevant docs
state scope and out-of-scope
include tests or explain why not
pass CI
receive Codex review
receive human review
```

## Merge policy

```text
Squash merge.
No direct pushes to main.
No merge until CI passes.
No merge until human review.
```

## Review comment

```text
@codex review this PR against AGENTS.md, .github/codex/review-guidelines.md, docs/PRODUCT_SPEC.md, docs/OPERATING_PLAN.md, and the linked Linear issue.
```
