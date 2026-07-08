---
date: 2026-07-08
status: accepted
---
# Visible entrance and exit openings on rendered mazes

**Context:** Bug report: the rendered maze PDF has no visible entrance or exit — the boundary is drawn as a fully closed rectangle, since `generateMaze` never removes boundary-facing walls (there is no neighbor cell outside the grid to carve into) and the renderer draws every boundary wall unconditionally.

**Decision:** When rendering a maze to PDF, skip drawing the entrance cell's north wall and the exit cell's south wall, leaving a plain gap — no arrows, no labels (confirmed with the user). Entrance opens at the top of the page, exit at the bottom, matching the natural top-to-bottom reading of a portrait page.

**Reason:** A printed maze needs a way in and a way out to be usable as a puzzle; this was missing entirely. A plain gap is the simplest fix that matches the classic maze convention, per the user's preference over adding arrows/labels.

**Rejected alternatives:** Opening the west/east walls instead of north/south — rejected in favor of a top-to-bottom reading, more natural for a portrait-oriented page. Adding arrows or "IN"/"OUT" labels — rejected per user preference for a plain opening.
