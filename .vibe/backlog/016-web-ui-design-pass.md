---
status: in_progress
---
# Web UI Design Pass

## Description
The web configuration form (`packages/web/public/index.html`) is currently unstyled raw HTML with no dedicated CSS. Apply a visual design pass to give the maze generation page a coherent, polished look — layout, spacing, typography, and styling for the form, error message, preview image, and download link — without changing the existing functional behavior (validation, preview, download).

## Acceptance Criteria
- [ ] The maze configuration page has a dedicated stylesheet applied (layout, spacing, typography, colors)
- [ ] The form, error message, image preview, and download link are visually consistent and readable on both desktop and mobile viewport widths
- [ ] Existing behavior (client-side validation, preview rendering, PDF download) is unchanged — no regression in `maze-form-validation` or `maze-routes` tests

## Notes
Purely presentational — no new backend endpoints or business logic. Should stay a plain consumer of `core` per project constraints (no logic duplication).
