---
date: 2026-07-09
status: superseded by 025
---
# Bridge crossing maze type: hollow rounded-cap tube rendering, not thin walls

**Context:** After the initial `rectangle-crossing` implementation (ADR 022) rendered crossings as small perpendicular ticks over thin wall lines, the user compared it against the visual style of David Bau's "Printable Mazes" (the original inspiration) and found it unconvincing. Getting the real style right took three iterations, each grounded in progressively more concrete evidence:

1. A first path-based rewrite used a *solid* thick stroke (40% of cell size, guessed without any reference) — it read as thick black blobs with no visible crossing effect.
2. The user linked David Bau's original Python source (`pypdfmaze`, https://github.com/akaihola/pypdfmaze/blob/master/pymaze.py), which exposes real ratios (`wall=0.3` of the half-cell = 0.15 of the full cell for line width). Adopting 0.15 made the *solid*-stroke maze legible, but the user then linked the actual reference screenshot (davidbau.com/images/art/mazeshot.png), which showed the corridors are **hollow outlined tubes** (a thin black border with a white interior), not solid filled lines at all — a rendering technique the source code's `canvas.setLineWidth`/`drawPath` calls don't make obvious from reading the script alone.

**Decision:** For `type: "rectangle-crossing"` only, replace wall-based rendering with a hollow-tube corridor rendering:
- Corridor centerlines (`computePathSegments`) and crossing stubs (`computeCrossingBridgeSegments`, one continuous segment spanning the crossing cell, perpendicular to the real passage) are each drawn **twice**: a thick black "outer" stroke (`TUBE_OUTER_WIDTH_RATIO` = 0.55 of cell size), then a thinner white "inner" stroke on the exact same path (`TUBE_INNER_WIDTH_RATIO` = 0.32), both with round caps/joins — leaving only a border visible, i.e. a hollow tube.
- Draw order is: crossing stub (black outer, white inner) completely, *then* the real path (black outer, white inner) completely. Because the real "over" tube is painted last and is fully opaque (border + white interior), it naturally paints over and cleanly cuts the "under" stub's outline at the crossing point — no manual gap geometry needed; the crossing effect falls out of z-order alone.
- The `rectangle` type is untouched — still thin wall lines, unaffected by this change (confirmed by its unmodified regression tests continuing to pass).

**Reason:** The reference maze's defining visual trait is the hollow/outlined tube, not stroke thickness — no amount of solid-stroke thickness tuning could reproduce it, only drawing an outer+inner stroke pair can. Restricting the change to `rectangle-crossing` avoids altering the appearance of every existing maze and keeps the two types visually distinct, matching the user's explicit choice to scope the redesign. See [[feedback_visual_style_verification]] in memory: both a real reference *image* and, when available, the reference's own *source code* with concrete numeric parameters are necessary — text descriptions or guessed ratios are not enough.

**Rejected alternatives:**
- A solid (filled) thick stroke at any thickness — rejected: cannot produce a hollow/outlined look regardless of ratio; the earlier 40% and 15% solid-stroke attempts both missed this before the real screenshot was seen.
- Manually computing a gap in the "under" crossing stub at the intersection point (the approach used before this ADR) — rejected once the outer/inner draw-order technique was adopted: the "over" tube's opaque hollow shape already cuts the "under" stub cleanly, so an explicit gap is redundant and was simplified away.
- A byte-for-byte replica of David Bau's renderer (its per-cell arc/rotation path router, `curve=1` quarter-circle arcs at every turn) — rejected as disproportionate; straight centerline segments with round line caps/joins already produce a convincingly curvy, legible tube look with the existing line-drawing primitives (pdf-lib `drawLine` with `LineCapStyle.Round`, SVG `stroke-linecap="round"`), no new geometry primitives (arcs/beziers) needed.
- Extending the "under" crossing stub a full cell into each neighboring cell (tried during this same investigation) — rejected: not what the reference does, and it risks visually overlapping unrelated corridors in the neighboring cells.
