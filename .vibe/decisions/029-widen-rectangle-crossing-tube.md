---
date: 2026-07-09
status: accepted
---
# Widen the rectangle-crossing tube past the non-tube area

**Context:** Backlog item 022 asked for the "rectangle-crossing" maze type's hollow-tube corridors to be wider — explicitly allowed to take up more visual space within a cell than the walls/gaps around it.

**Decision:** Raise `TUBE_HALF_WIDTH_RATIO` (shared by both `computeTubeSegments()` consumers — PDF and SVG rendering, see ADR 026) from `0.2` to `0.35`. At `0.35`, the tube occupies 70% of a corridor's cell width along its axis, versus 30% for the surrounding gap — clearing the "more than the non-tube area" bar (crossed above `0.25`) with a comfortable margin, while staying under `0.5` so a real, visible cell-boundary gap remains between parallel corridors and no geometry self-overlaps.

**Reason:** The existing tube geometry (`computeCellTubeSegments()`) is fully parametric on this single ratio — every cap, arm, and crossing-gap coordinate is derived from it — so no other code needed to change; picking a new value was the entire scope of the request. `0.35` was chosen by rendering a generated bridge-crossing maze at this ratio and confirming visually that turns, dead ends, and crossings still read clearly with no overlap (see the runtime verification step).

**Rejected alternatives:** Making the tube width configurable via a new render option — rejected as scope creep; the request was to change the default appearance, not to add a new capability.
