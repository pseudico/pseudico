# LWO-1 — Validate Linear/Codex/GitHub workflow

## Goal

Prove the agentic development pipeline works before real implementation begins.

## Scope

- Codex reads repo instructions.
- Codex creates a branch.
- Codex adds one docs-only file.
- Codex opens a PR.
- CI runs or reports status.
- Codex posts PR link back to Linear.

## Out of scope

- No app code.
- No package installation.
- No Electron scaffold.
- No database work.
- No feature implementation.

## Acceptance criteria

- [ ] `docs/WORKFLOW_VALIDATION.md` exists.
- [ ] PR is opened using the PR template.
- [ ] Linear issue contains PR link.
- [ ] CI status is visible or explained.
- [ ] No unrelated files changed.

## Codex delegation comment

```text
@Codex please validate the Local Work OS GitHub/Linear workflow.

Goal:
Prove that Codex can read this repository, create a branch, make a tiny docs-only change, open a PR, and report back in Linear.

Context:
Read:
- AGENTS.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md if present
- docs/AGENTIC_DEVELOPMENT_PROTOCOL.md if present

Scope:
- Create docs/WORKFLOW_VALIDATION.md.
- Add a short note confirming the repo, Linear issue, PR template, and CI workflow were detected.
- Do not create app code.
- Do not install dependencies.
- Do not change product docs except this validation file.

Before coding:
1. Post a short plan in this Linear issue.
2. List the files you will create or modify.
3. State any setup problems you notice.

Done when:
- Branch created.
- PR opened using the GitHub template.
- This Linear issue has a PR link.
- Any CI status is reported.
```
