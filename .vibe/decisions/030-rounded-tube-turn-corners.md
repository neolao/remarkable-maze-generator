---
date: 2026-07-09
status: accepted
---
# Round tube turn corners with a native arc, straight parts stay simple lines

**Context:** Backlog item 023 asks for the "rectangle-crossing" maze type's tube to have rounded corners at turns (currently a sharp 90° join). ADR 025 established "simple, independent straight strokes, no fills/borders" specifically to eliminate a recurring class of rendering bugs from earlier, more complex hollow-tube techniques; ADR 026 extended this to two real edge lines per corridor, still built entirely from independent `LineSegment`s.

**Decision:** Keep every straight part of the tube exactly as `LineSegment`s (unchanged — walls, straight corridors, dead ends, crossings). At a genuine turn (exactly two adjacent open sides, not a straight-through pair, not a crossing — crossings always have all four sides open and are unaffected), the two straight edges that would otherwise meet at a sharp hub corner are each shortened by a small fillet radius, and the gap between their new shortened endpoints is closed with a real circular arc segment (SVG `<path>` with an `A` command; PDF via `pdf-lib`'s `drawSvgPath`, which also supports arc path syntax) — not a polyline approximation. Both the arc's center and the two tangent (shortened-endpoint) points are computed explicitly in the same unit-cell coordinate system as the existing `LineSegment`s, so the two renderers keep consuming one shared geometry computation, only branching on whether a given segment is a line or an arc when drawing it.

**Reason:** A true curve reads more cleanly than a polyline approximation at typical rendering sizes, and both target renderers (SVG natively, `pdf-lib` via `drawSvgPath`) support real arcs, so there's no need to fake one. Scoping the arc strictly to the two tangent points of an otherwise-unchanged sharp corner keeps the change additive and local — it doesn't touch how any other segment is computed, doesn't introduce a fill or a border, and doesn't require the tube's other geometry (straight-through exception, crossing gap, entrance/exit stubs) to change at all. This keeps faith with ADR 025's core lesson (independent, local geometry only — no shared paint-order-dependent tricks) while giving the corner an actual curve instead of a many-segment polyline.

**Rejected alternatives:**
- Approximating the curve with several short straight `LineSegment`s (a polyline) — considered first; rejected in favor of a real arc once confirmed both renderers support arcs natively, since a true curve is simpler to reason about (one segment, not many) and reads more smoothly.
- Rounding every hub corner uniformly, including dead ends and straight-through cells — rejected: the backlog's acceptance criteria explicitly scope this to turns only, keeping dead ends and straight passages visually unchanged.
