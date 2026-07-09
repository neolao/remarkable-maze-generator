---
date: 2026-07-09
status: accepted
---
# Web preview solution overlay design

**Context:** Backlog item 018 asks for an optional solution trace with branch-point markers on the web preview image, separate from the existing PDF `solution` display mode (`none`/`extra-page`/`overlay`, backlog item 019).

**Decision:**
- Introduce a distinct `showSolution` boolean field on `/api/mazes/preview`, kept separate from the existing `solution` enum field used by the PDF endpoints, to avoid conflating the two independent capabilities.
- A "branch point" along the solution path is any path cell where more than two directions were open to move to — i.e. beyond the one used to arrive and the one used to leave. At a bridge-crossing cell, the solver's existing axis lock (see ADR 024) already limits available directions to the entered axis, so a crossing cell is never flagged as a branch point even though it has four open walls. Entrance and exit are excluded (they are path endpoints, not something the path "passes through").
- Return the branch-point count via a `X-Solution-Branch-Point-Count` response header on `/api/mazes/preview`, rather than switching the endpoint's response body to JSON — keeps the endpoint's existing `image/svg+xml` contract unchanged for any other caller.

**Reason:** Keeps the two solution-related capabilities (PDF display mode vs. preview overlay) independently toggleable and implementable without one backlog item's work colliding with the other's. Reusing the solver's existing axis-lock logic for branch detection avoids duplicating the bridge-crossing traversal rules in a second place.

**Rejected alternatives:** Wrapping the preview response in JSON (`{ svg, branchPointCount }`) — rejected to avoid a breaking change to the endpoint's content type for existing/future direct consumers of the raw SVG.
