---
status: in_progress
---
# Progressive Form Field Disclosure

## Description
The web maze configuration form (`packages/web/public/index.html`) currently displays all fields at once, even though some fields only make sense once a prior choice narrows the possibilities — for example, `path-length` and `path-length-candidates` only matter for certain maze type/algorithm combinations, and `remarkable-folder` only becomes relevant once "send to reMarkable" is chosen. This item improves the form so that fields are revealed progressively, in dependency order, so the user is never shown an option that isn't yet actionable given their current selections.

## Acceptance Criteria
- [ ] On initial load, only the fields with no unmet dependency (e.g. width, height, difficulty, maze type) are visible; dependent fields are hidden until their prerequisite field has a value/selection.
- [ ] When a field's dependency is satisfied (e.g. an algorithm is picked that supports path-length targeting), the dependent field(s) appear without a full page reload.
- [ ] When a field's dependency becomes unmet again (e.g. the user switches back to an algorithm/maze type that doesn't support a dependent field), that dependent field is hidden again and its value is not submitted with the generation request.
- [ ] Existing behavior — last-used values remembered via cookie and pre-filled on next visit (see `form-preferences.ts`) — keeps working: pre-filled values that are valid for the restored dependency chain are shown; pre-filled values for fields whose dependency is not met stay hidden.

## Notes
Related existing modules: `packages/web/src/form-preferences.ts` (cookie-based field memory), `packages/web/src/maze-form-validation.ts` (shared validation rules), `packages/web/public/index.html` (form markup). The exact dependency graph between maze type, algorithm, solution mode, and path-length options should be derived from what `core` actually supports for each combination (see `.vibe/modules/core.md`) rather than hardcoded ad hoc in the frontend, to avoid the form drifting out of sync with backend capabilities.
