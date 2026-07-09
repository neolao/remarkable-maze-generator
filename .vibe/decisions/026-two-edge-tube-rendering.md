---
date: 2026-07-09
status: accepted
---
# Rectangle-crossing rendering: two real edge lines per corridor, per-cell polygon boundary

**Context:** ADR 025 replaced the hollow-tube border trick with a single centerline stroke per corridor. The user clarified that wasn't the ask: "je parlais de dessiner les traits des 2 côtés du tube" — draw the tube's own two boundary lines (like a real pipe outline), not a single centerline, and confirmed directly: "il FAUT un tube creux" (it must be a hollow tube).

**Decision:** Each corridor is now drawn as its own two edge lines — the left and right boundary of a tube of half-width `TUBE_HALF_WIDTH_RATIO` (0.2 of the cell size) around the centerline — computed as a single geometric shape per cell rather than as offset copies of the centerline segments (`computeTubeSegments` / `computeCellTubeSegments` in `maze-layout.ts`):

- Each cell has a small square "hub" at its center (side `2 * halfWidth`) and, for each open side, an "arm" of the same width reaching to the cell boundary on that side.
- A **closed** side contributes one segment: a flat cap across that side of the hub.
- An **open** side contributes two segments: the arm's two edges, from the hub corner out to the cell boundary — *except* when the side is one of a pair of **opposite open sides with no other opening at this cell** (a straight-through passage): in that case the two edges run the *entire* cell width/height, uninterrupted, with no hub break at all — this is what makes straight runs render as one continuous pair of lines rather than being needlessly notched at every cell boundary.
- Adjacent cells' arms terminate at exactly the same point on their shared boundary, so straight runs and turns connect with zero gap using only simple, independent line segments — no stroke-width layering, no paint-order dependency, no separate joint-filling geometry.
- A crossing cell overrides this: the *over* axis is drawn as two straight lines spanning the entire cell, uninterrupted (matching the "straight-through" case above); the *under* axis's arms stop at the hub corners without crossing it, leaving a real gap exactly where the over-axis tube passes.
- The entrance's north side and the exit's south side are always treated as "open" for this computation regardless of the actual (structurally closed) wall data, and since those cells sit at the grid's own edge, their cell boundary there already coincides with the page boundary — no separate stub segment is needed.

**Reason:** A true hollow-tube look (as in davidbau.com/images/art/mazeshot.png) requires two real, independent boundary lines, not a fill/border simulation (ADR 025 already established that fills/borders cause more problems than they solve). Building the boundary once per cell, as the union of a hub and its open arms, guarantees gap-free joins by construction (adjacent cells' arm endpoints are always identical points) rather than by relying on round line caps to coincidentally line up (which is what produced the border gaps ADR 025 was written to fix in the first place).

**Rejected alternatives:**
- Offsetting each centerline segment independently into two parallel lines per segment — rejected: at a turn, two independently-offset segments meet only at their shared centerline endpoint, not at a shared *edge* endpoint, leaving a criss-cross or gap at the corner (the same class of bug as the very first hollow-tube attempt, just occurring in the new two-line model).
- A "hub gap at every open side, no straight-through exception" version — implemented first, then found wrong: it left a `2 * halfWidth` gap in the middle of every straight passage, breaking the tube into disconnected dashes. The straight-through exception was required for the tube to read as continuous.
