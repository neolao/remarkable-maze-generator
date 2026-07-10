---
date: 2026-07-10
status: accepted
---
# Circle maze: dynamic inner radius to avoid pinched passages near the center

**Context:** ADR 034 laid out the "circle" maze type in polar coordinates with a fixed inner radius (`CIRCLE_INNER_RADIUS_RATIO = 1`) and a constant radial ring thickness (1 unit). A sector's tangential (walkable) width at radius `r` is `r * angleStep`, and `angleStep = 2π / width` shrinks as the sector count grows — so with a fixed inner radius, a maze with many sectors ended up with visibly pinched, needle-thin passages near the center while the outermost ring stayed comfortably wide, even though the radial thickness was identical at every ring. Rendered and visually reviewed, this was flagged as a real defect: passage width must not be smaller near the center than at the edge.

**Decision:** Compute the inner radius per maze instead of using a fixed constant: `computeCircleInnerRadius(maze) = max(CIRCLE_INNER_RADIUS_RATIO, 1 / angleStep)`. This guarantees the innermost ring's tangential width is at least as wide as one ring's radial thickness (1 unit) — and since tangential width only grows with radius from there outward, every ring from the center to the edge is at least that wide, never pinching inward. `computeCircleDiameter` and `computeCellCenter` were updated to use this computed radius instead of the fixed constant. The fixed constant is kept as the documented minimum for low sector counts, where it was already wide enough.

**Reason:** This is a small, local formula change — it does not touch generation, the solver, or the overall polar-rendering approach from ADR 034 — so it fixes the defect without revisiting that decision's core trade-off (same grid, same 4 algorithms, no new cell model).

**Rejected alternatives:** A non-uniform (e.g. geometrically growing) radial ring thickness, so every ring keeps the same width-to-thickness aspect ratio all the way out — rejected as unnecessary complexity for what the report asked (passages not smaller at the center than at the edge, not perfectly uniform everywhere); it also makes outer rings' radial thickness grow without bound for tall mazes, which is its own visual oddity. A true circular maze with more cells per outer ring (variable topology) — already rejected in ADR 034 for the same reasons, and this defect doesn't change that calculus.
