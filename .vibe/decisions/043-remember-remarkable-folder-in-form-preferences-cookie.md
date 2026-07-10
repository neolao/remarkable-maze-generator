---
date: 2026-07-10
status: accepted
---
# Remember the reMarkable target folder in the form preferences cookie

**Context:** ADR 042 introduced a single `maze-form-preferences` cookie remembering seven form fields (width, height, difficulty, maze type, algorithm, solution mode, show-solution), deliberately excluding the "reMarkable folder" field alongside credentials. Users reported this as unexpected: they have to retype the target folder on every visit even though every other setting is preserved.

**Decision:** Add the reMarkable folder as an eighth field to the same cookie (`MazeFormPreferences.folder: string`), using the same strict-shape parsing rule as the other seven fields — a cookie written before this field existed (missing `folder`) is treated as invalid and falls back entirely to defaults, consistent with ADR 042's no-partial-merge rule. The cookie is now written both on form submission and when clicking "Send to reMarkable", via a shared `persistFormPreferences()` helper in `app.js`, since the folder field only becomes relevant (and is typically filled in) after a preview has already been generated — capturing it only on the generation form's submit would miss the common case of typing a folder and sending without regenerating.

**Reason:** The folder is a plain, non-sensitive convenience value (a target path, not a credential) that behaves exactly like the other form fields from a user's perspective — there was no security or privacy reason to exclude it, only an initial oversight.

**Rejected alternatives:** A separate cookie just for the folder — rejected for the same reason ADR 042 chose a single cookie: keeps the read/write surface and pre-fill logic atomic.
