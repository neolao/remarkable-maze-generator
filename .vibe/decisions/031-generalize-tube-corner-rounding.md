---
date: 2026-07-09
status: accepted
---
# Generalize tube corner rounding to a single per-corner rule

**Context:** Backlog item 023 rounded a tube turn's two corners via a hardcoded, per-rotation implementation (`computeTurnTubeSegments`, four explicit branches for the four possible turn orientations), only triggered when a cell had exactly two adjacent open sides. Backlog item 024 was redefined mid-implementation, at the user's direct request, to round every remaining sharp corner in the tube — dead ends, T-junctions, and 4-way (non-crossing) junctions — not just turns.

**Decision:** Replace the turn-specific detection and the four hardcoded rotation branches with a single general rule, applied uniformly to every non-crossing cell: a hub corner is rounded if and only if its two adjacent sides are in the *same* open/closed state (both open or both closed); if they differ, the corner is already collinear with its neighboring straight edge and is left untouched. This single rule was verified by hand to reduce to exactly the same two corners item 023 already rounded for a turn, while also correctly producing: zero rounded corners for a straight passage (opposite sides always differ pairwise at every corner), two rounded corners for a dead end, two for a T-junction, and four for a full non-crossing junction. Implementation shortens whichever raw segment endpoints land on a "real" corner (computed from the untouched, pre-rounding segment positions, so one corner's rounding can never accidentally use another corner's already-shortened point as its direction reference) and connects each pair of shortened endpoints with the same `roundCorner`/`ArcSegment` building block introduced in item 023.

**Reason:** A single general rule is both smaller and more correct than enumerating every open-side combination (1, 2 adjacent, 2 opposite, 3, or 4 open sides) as separate cases — it was derived directly from the geometric reason a corner is sharp in the first place (the two lines meeting there are not collinear), so it generalizes for free instead of requiring a new hardcoded branch per additional corner type.

**Rejected alternatives:** Keep item 023's per-rotation `computeTurnTubeSegments` and add three more near-duplicate functions for dead ends, T-junctions, and 4-way junctions — rejected as unnecessary duplication once the general rule was found, and a worse fit for the "simple, independent geometry" precedent set by ADR 025/026 (more hardcoded cases is the opposite direction from that lesson).
