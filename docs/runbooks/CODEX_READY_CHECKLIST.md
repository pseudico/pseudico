# Codex Ready Checklist

An issue may be assigned to Codex only if it passes this checklist.

---

# 1. Product readiness

- [ ] The goal is clear.
- [ ] The user/product value is stated.
- [ ] The relevant spec sections are linked.
- [ ] The ticket belongs to a known milestone/module.
- [ ] Out-of-scope items are explicit.
- [ ] No unresolved product decision remains.

---

# 2. Technical readiness

- [ ] Expected files or modules are listed.
- [ ] Data model impact is stated.
- [ ] Activity log impact is stated.
- [ ] Search index impact is stated.
- [ ] IPC/filesystem impact is stated where relevant.
- [ ] Migration requirements are stated where relevant.

---

# 3. Size readiness

- [ ] Estimate is 1, 2, or 3.
- [ ] If estimate is 5, a plan has been reviewed first.
- [ ] If estimate is 8, it has been split.
- [ ] The ticket should fit in one PR.

---

# 4. Test readiness

- [ ] Required tests are listed.
- [ ] Manual QA is listed if UI/file/database behaviour changes.
- [ ] Expected commands are listed.

---

# 5. Guardrail readiness

- [ ] No cloud dependency.
- [ ] No mobile scope.
- [ ] No team/public-sharing scope.
- [ ] No direct DB-from-React pattern.
- [ ] No direct filesystem-from-renderer pattern.
- [ ] No destructive delete.
- [ ] No proprietary branding/assets/UI-copy requirement.

---

# 6. Delegation comment

Use this when assigning:

```text
@Codex this issue is Codex Ready.

Please first produce a plan with:
1. understanding of the task
2. files likely to change
3. implementation steps
4. test plan
5. risks/assumptions

Then implement only the scoped work and open a PR using the template.
```
