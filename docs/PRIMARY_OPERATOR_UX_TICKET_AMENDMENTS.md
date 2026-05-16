# Primary Operator UX Ticket Set: Self-Critique and Amendments

Date: 2026-05-16

## Critical assessment

The Linear tickets PSE-213 through PSE-219 are **Spec Ready**, but the initial set was not sufficient as a complete primary-operator UX program.

They were stronger than vague polish tickets because each named a real screen/workflow, evidence sources, acceptance criteria, and screenshot requirements. However, they were still incomplete in three ways:

1. **No explicit program-level standard**
   Each ticket had local acceptance criteria, but the set did not clearly define the shared standard for the entire phase: support the `docs/PRODUCT_SPEC.md` Local Work OS loop as experienced by the primary working operator.

2. **No explicit full processing order**
   I gave a "fastest meaningful path" that omitted PSE-213, PSE-217, and PSE-219. That was misleading because those are not optional if the goal is a complete product-fit pass. They are only skippable for a short-term subset.

3. **No final acceptance/regression gate**
   There was no closing ticket to verify that the collection of changes actually improves the whole visible workflow. Without a final gate, individual screen improvements can still fail as a product.

## Correct standard

The tickets should be judged against the primary operator work loop:

```text
Capture quickly
  -> organise by project/contact/inbox
  -> connect related things
  -> plan the day
  -> review timelines/dashboards
  -> find anything instantly
  -> keep files and notes beside the work they belong to
  -> recover local data safely
```

A ticket is not done just because the UI still exposes the underlying feature. It is done when the operator can see what matters, understand the safe next action, and complete the work without admin/developer concepts dominating the screen.

## Correct full execution order

1. **PSE-213** — Primary operator workflow audit and visual baseline.
   Establish the scoring rubric and screenshot baseline. This prevents later tickets from optimizing for API/button existence.

2. **PSE-214** — Settings IA split.
   First implementation priority because Settings currently most clearly violates work-first hierarchy by elevating import/export/maintenance/admin tools.

3. **PSE-215** — Readability and control sizing.
   Must come early because all later visual work depends on comfortable input/result/card scale.

4. **PSE-216** — Project detail work-first redesign.
   Project pages are the central product surface; they must lead with work, not configuration.

5. **PSE-218** — Guided backup/restore.
   Recovery is local-only trust infrastructure and should be operator-safe.

6. **PSE-217** — Search visual trust.
   Search is core to the product promise and must be visually provable, not only API-proven.

7. **PSE-219** — Feedback/toast/navigation orientation.
   This should happen after main surfaces shift so feedback is polished against the new layout.

8. **PSE-220 recommended** — Primary operator UX acceptance and regression review.
   Final gate that reviews the whole work loop with screenshots and determines whether the HUX pass succeeded.

## Why the earlier abbreviated order was wrong

The earlier path:

```text
PSE-214 -> PSE-215 -> PSE-216 -> PSE-218
```

was only the fastest improvement subset. I failed to label it clearly as a subset and not the full program. It omitted:

- **PSE-213**, which is needed to prevent subjective/vague UX work.
- **PSE-217**, which is required because search is one of the product's central promises.
- **PSE-219**, which is required because orientation/feedback problems can undermine every screen.

Correct wording should have been:

> Fastest partial improvement path: PSE-214, PSE-215, PSE-216, PSE-218.
> Complete primary-operator UX path: PSE-213 through PSE-220 in the sequence above.

## Amendment to add to each Linear ticket

Add this shared note to PSE-213 through PSE-219:

> This ticket is part of the Primary Operator UX pass. It must be evaluated against the PRODUCT_SPEC work loop, not only local component acceptance. The ticket requires screenshot/manual evidence because API or route success is insufficient for visual/product-fit claims. The full HUX sequence is PSE-213 -> PSE-214 -> PSE-215 -> PSE-216 -> PSE-218 -> PSE-217 -> PSE-219 -> final acceptance/regression review.

## PSE-220 recommended ticket

Title: `PSE-HUX-008: Primary operator UX acceptance and regression review`

Purpose:

- Verify all PSE-HUX work as a complete product workflow.
- Produce `docs/PRIMARY_OPERATOR_UX_ACCEPTANCE_REVIEW.md`.
- Review final screenshots for Welcome, Project, Contact, Today, Dashboard, Search, Settings, Backup/Restore.
- Decide whether the visible app now supports the primary operator loop.

Acceptance:

- All PSE-213 through PSE-219 results reviewed.
- No P1 primary-work-loop blocker remains unaccepted.
- Review includes actual screenshots.
- Verdict is one of: not primary-operator ready, primary-operator pilot ready, primary-operator ready with caveats.

## Linear update status

Attempted to create/update Linear amendments after this critique, but the Linear connector began returning a transport deserialize error after the original PSE-213..PSE-219 creation. These amendments should be applied to Linear once the connector is healthy again.
