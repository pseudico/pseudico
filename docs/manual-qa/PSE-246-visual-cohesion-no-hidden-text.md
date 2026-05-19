# PSE-246 Visual cohesion, typography, density, and no-hidden-text pass

## Summary

Added a production cohesion CSS pass that removes returning rounded/card-heavy treatment from operator surfaces, squares primary controls/panels, removes heavy shadows, and enforces wrapping for primary text on work surfaces. Primary work text, inputs, result rows, contact/project titles, timeline/calendar labels, and maintenance labels are not line-clamped or ellipsized by the new contract.

## Evidence

- Contact sheet: `docs/manual-qa/screenshots/PSE-246-visual-cohesion-no-hidden-text/contact-sheet.png`
- Representative route pairs: workspace home, contact detail, settings, templates, timeline, and search in `docs/manual-qa/screenshots/PSE-246-visual-cohesion-no-hidden-text/`.

## Rules applied

- Square/low-radius production panels and buttons.
- Primary text wraps on work surfaces; truncation remains only for explicitly secondary metadata/badges from existing components.
- Maintenance/admin surfaces are available but visually quieter than daily work routes.
- 1280x800 relies on stacking/scrolling rather than hidden primary content.

## Risks

- P0/P1/P2: none known.
- P3: micro-typography and badge shape can be revisited in a visual identity pass after this functional gate.
