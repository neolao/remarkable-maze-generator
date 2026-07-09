---
date: 2026-07-09
status: accepted
---
# Bridge crossing maze type: thick rounded-path rendering, not thin walls

**Context:** After the initial `rectangle-crossing` implementation (ADR 022) rendered crossings as small perpendicular ticks over thin wall lines, the user compared it against the visual style of David Bau's "Printable Mazes" (the original inspiration) and found it unconvincing — the reference style draws mazes as thick, rounded-cap corridor paths ("tubes"), not thin wall boundaries, which reads far more clearly for a crossing (a tube visibly passing over/under another).

**Decision:** For `type: "rectangle-crossing"` only, replace wall-based rendering with corridor-centerline rendering: a thick stroke (40% of the cell size), round line caps/joins, following the path graph (`computeWallSegments` → `computePathSegments`, `computeCrossingSegments` → `computeCrossingBridgeSegments`). The centerline connects open-passage cell centers, plus a stub from the entrance/exit cell center to the boundary. At a crossing cell, the real ("over") passage is drawn as an uninterrupted thick segment; the decorative ("under") passage keeps its gap, but now sized and styled the same as the main path so it reads as a tube dipping underneath. The `rectangle` type is untouched — still thin wall lines, unaffected by this change (confirmed by its unmodified regression tests continuing to pass).

**Reason:** A crossing is only legible as "one path going over another" when both are drawn as visibly thick, continuous paths; thin decorative ticks on top of wall lines did not read as a bridge. Restricting the change to `rectangle-crossing` avoids altering the appearance of every existing maze and keeps the two types visually distinct, matching the user's explicit choice to scope the redesign.

**Rejected alternatives:**
- Applying the thick rounded-path style to both maze types — rejected: would change the appearance of the already-shipped classic maze type for users who did not ask for it.
- A closer byte-for-byte replica of David Bau's renderer (e.g. bezier-curved corridors, halo/outline trick to fake depth at crossings) — rejected as disproportionate; straight centerline segments with round caps/joins already produce a convincingly curvy, clearly-legible tube look with the existing line-drawing primitives (pdf-lib `drawLine` with `LineCapStyle.Round`, SVG `stroke-linecap="round"`), no new geometry primitives (arcs/beziers) needed.
