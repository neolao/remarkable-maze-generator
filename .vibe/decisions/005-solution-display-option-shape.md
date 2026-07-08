---
date: 2026-07-08
status: accepted
---
# Solution display option shape and extra-page content

**Context:** The PDF renderer needs an opt-in way to show the maze's solution, either as an extra page or as an overlay on the maze page, defaulting to no solution shown.

**Decision:**
- `renderMazeToPdf` takes an optional second parameter with a `solution` field accepting `"none"` (default), `"extra-page"`, or `"overlay"`.
- When `"extra-page"` is selected, the second page redraws the full maze (walls) with the solution path highlighted on top of it — not just the bare path — matching the classic "maze then solution" layout of puzzle books.
- The solution path is drawn as a distinct-colored line connecting the center of each cell on the path, layered on top of the wall drawing.

**Reason:** A string-literal option keeps the API simple and self-documenting, with a safe default that preserves the existing behavior (item 003) unchanged. Redrawing the maze on the solution page (confirmed with the user) gives a self-contained, readable solution page instead of a floating path with no context.

**Rejected alternatives:** A boolean `showSolution` flag — rejected because it can't express the "extra page vs overlay" choice required by the acceptance criteria. A solution-only second page (no maze redraw) — rejected per user preference for readability.
