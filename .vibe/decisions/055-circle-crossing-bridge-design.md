---
date: 2026-07-12
status: accepted
---
# Circle-crossing bridge crossing design

**Context:** Adding a `circle-crossing` maze type (backlog item 031) that combines the `circle` growing-sector topology with the tube-style bridge crossings currently only available on `rectangle-crossing`. The circle topology has no fixed neighbor count per cell (a ring's sector count can multiply going outward), unlike the rectangular grid's uniform 4-neighbor model that the existing tunnel-carving logic (`maze-algorithms/growing-tree.ts`) relies on.

**Decision:**
- A circle-crossing bridge is carved the same way as a rectangular one: while extending the growing tree from `current`, a 2-hop candidate `current -> tunnelCell -> target` is considered along a single topological direction (cw, ccw, or outward), where `tunnelCell` is already visited and currently carries a clean straight-through passage on the *other* axis (tangential: cw+ccw open; radial: inward + exactly one outward child open), with `target` unvisited.
- Both hops are carved with the existing `carveEdge` primitive (which already resolves same-ring vs. cross-ring edge ownership), so `tunnelCell` ends up with both axes open — mirroring the rectangular case where a tunneled-through cell ends up with all 4 walls open.
- The **outward** direction is only used as a tunnel candidate when `tunnelCell` has exactly one outward child, so `target` is unambiguous. The **cw/ccw** direction never needs this constraint since every cell has exactly one cw and one ccw neighbor.
- A `CircleMazeCrossing { ring, sector, underAxis: "radial" | "tangential" }` list is recorded on the `Maze`, mirroring the rectangular `MazeCrossing`, and consumed the same way by the solver (axis lock — never turn from the entered axis onto the other one at a crossing node) and by the tube renderer (draw the *over* axis uninterrupted through the cell's hub, the *under* axis stopping at the hub with a real gap).
- Tube rendering computes, per cell, a small hub rectangle in local (radius, angle) space plus arms toward each open side, the direct polar analogue of the rectangular hub-and-arms model. A parent cell with more than one open outward child draws a single outward arm at its own center angle; each child independently draws its own inward arm at its own angle. This is a deliberate, documented simplification: outward-fan junctions (a cell splitting into several children) render as a reasonable approximation rather than a pixel-exact multi-arm hub, since it doesn't affect maze validity or solvability — only the rare visual case of a tube junction spanning a sector-count growth boundary.

**Reason:** Reusing `carveEdge` and the existing axis-lock/crossing-lookup patterns keeps the circle-crossing implementation structurally parallel to the rectangular one (same mental model, same exhaustiveness-checked registries — see ADR 049), instead of inventing a parallel bespoke mechanism. Constraining the outward tunnel direction to single-child cells avoids ambiguous target selection without materially reducing how often a bridge can appear, since most ring-to-ring transitions have a 1:1 or low integer growth ratio.

**Rejected alternatives:**
- Requiring `current` itself to have a single outward child before considering an outward tunnel: unnecessary — only `tunnelCell` (the middle hop, whose existing passage must be unambiguous) needs the constraint, so restricting `current` too would forbid valid crossings for no benefit.
- Pixel-exact multi-arm hub rendering for every outward-fan case: rejected as disproportionate implementation cost for a rare, purely cosmetic junction shape with no effect on correctness.
