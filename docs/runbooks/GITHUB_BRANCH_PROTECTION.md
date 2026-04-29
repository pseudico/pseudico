# GitHub Branch Protection — Local Work OS

Protect `main` after the first CI workflow has run at least once.

GitHub branch protection can require pull request reviews, passing status checks, and other restrictions before merging into a protected branch.

---

# Recommended branch protection for `main`

Settings:

```text
Branch name pattern: main
Require a pull request before merging: yes
Require approvals: 1
Dismiss stale pull request approvals when new commits are pushed: yes
Require review from Code Owners: optional later
Require status checks to pass before merging: yes
Require branches to be up to date before merging: recommended once CI is stable
Require conversation resolution before merging: yes
Require linear history: yes if available in your plan/settings
Allow force pushes: no
Allow deletions: no
Restrict who can push: optional
```

---

# Required checks

Initial required checks:

```text
lint
typecheck
unit-tests
build
```

Later required checks:

```text
db-tests
migration-tests
playwright-smoke
package-smoke
```

Important: GitHub warns that required status-check job names should be unique across workflows to avoid ambiguous check results. Keep job names stable and unique.

---

# When not to require a check yet

Do not require a check before it exists and has successfully run on the target branch.

Suggested order:

```text
1. Add CI workflow.
2. Push to main.
3. Confirm check names.
4. Configure branch protection to require those exact checks.
```

---

# Emergency policy

If a PR is blocked because CI is broken due to infrastructure, create a Linear `Blocked` issue and fix CI first. Avoid bypassing branch protection except for true emergencies.
