---
status: done
depends_on: [023]
---
# Round All Remaining Tube Corners

## Description
Round every remaining sharp corner of a "rectangle-crossing" maze type's tube — not just the turns already handled by backlog item 023, but also dead ends, T-junctions, and 4-way (non-crossing) junctions. Any hub corner where two straight edges currently meet at a flat 90° angle should get the same rounded treatment, so no sharp corners remain anywhere in the tube except at actual bridge crossings, which must keep their exact gap for the pass-under illusion to read correctly.

## Acceptance Criteria
- [ ] A dead end in a "rectangle-crossing" maze shows a rounded cap (both corners where the cap meets the two side edges are curved) instead of a sharp flat-cornered cap
- [ ] A T-junction (3 open sides) shows all of its sharp hub corners rounded
- [ ] A 4-way junction (4 open sides, not a bridge crossing) shows all of its sharp hub corners rounded
- [ ] Straight passages are unaffected (no corner exists there to round)
- [ ] Bridge crossings are unaffected — the over/under gap stays exact, no rounding applied there
- [ ] Adjacent cells' tube edges still connect with no visual gap at shared cell boundaries
- [ ] The change is reflected consistently in both the PDF export and the web preview (SVG)

## Notes
This reuses the same corner-rounding building block introduced for backlog item 023 (`roundCorner`, `TUBE_CORNER_RADIUS_RATIO`, `ArcSegment`, in `packages/core/src/maze-layout.ts`), but generalizes it: item 023 only detected and rounded the "turn" case (exactly 2 adjacent open sides); this item needs every hub corner of every non-crossing cell rounded, regardless of how many sides are open (1 dead end, 2 opposite = no corner at all, 2 adjacent = turn, 3 = T-junction, 4 = full junction). The straight-through exception (opposite open sides, no hub break, full-length uninterrupted lines) must be preserved as-is since it has no corner to round.

Getting the arc's sweep direction right caused real confusion on item 023 — a single isolated corner rendered alone looked visually correct but was actually backwards, only becoming obvious once a full real turn was rendered end-to-end and visibly pinched. Re-verify every corner count (1, 3, and 4 open sides) the same way: render each case for real (not just one corner in isolation) and confirm every cap/junction looks like a smooth, consistently-wide rounded shape, not a pinch or a bulge past the original sharp corner.
