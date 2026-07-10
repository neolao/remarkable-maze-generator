---
date: 2026-07-10
status: accepted
---
# Circle maze: geometric ring growth instead of a fixed radial thickness

**Context:** ADR 035 fixed pinched passages near the center by growing the inner radius with the sector count, but kept every ring's radial thickness fixed at 1 unit. Reviewed again after rendering: passages away from the center were now too large — since a sector's tangential (walkable) width at radius `r` is `r * angleStep`, and `angleStep` is constant, that width keeps growing with radius while the radial thickness stayed flat at 1, so outer rings ended up visibly wider tangentially than radially, an increasingly lopsided passage shape the further out a ring sits.

**Decision:** Replace the fixed radial thickness with geometric ring growth: ring `y`'s radius is `CIRCLE_INNER_RADIUS_RATIO * (1 + angleStep) ** y` instead of `CIRCLE_INNER_RADIUS_RATIO + y`. This keeps a constant ratio between a ring's radial thickness and its own tangential width at every radius (both equal `radius * angleStep`), so passages stay self-similar from the center to the outer edge — never pinching inward (ADR 035's problem) nor ballooning outward (this follow-up's problem) relative to each other. `computeCircleInnerRadius` (a fixed-vs-sector-count adjustment) is no longer needed and was removed: geometric growth keeps ring proportions consistent regardless of the starting radius, so `CIRCLE_INNER_RADIUS_RATIO` can stay a plain constant again. `computeCircleDiameter` and `computeCellCenter` were updated to use the new `computeCircleRingRadius(maze, ring)` helper.

**Reason:** Geometric (rather than arithmetic) ring spacing is the standard way to keep cells proportionally shaped in a polar layout with a fixed number of angular sectors per ring, without changing the topology from ADR 034. The absolute cell size still grows outward (unavoidable when the sector count doesn't grow with it — more physical space is available at a larger radius for the same angular slice), but the two dimensions of a passage now grow together instead of diverging.

**Rejected alternatives:** Increasing the number of sectors per outer ring so passages stay a truly constant absolute size everywhere — already rejected in ADR 034 (needs a different cell/wall model and solver, well beyond this item's scope). Capping the radial thickness growth (e.g. a fixed maximum) — rejected because it reintroduces the same mismatch this decision fixes, just pushed further out.
