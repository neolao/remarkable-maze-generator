---
date: 2026-07-07
status: accepted
---
# Fixed entrance and exit at opposite corners

**Context:** Computing a maze's solution path requires a defined entrance and exit. The `Maze` type produced by `generateMaze` currently has no notion of entrance or exit points.

**Decision:** The entrance is fixed at the top-left cell `(0, 0)` and the exit at the bottom-right cell `(width - 1, height - 1)`, for every generated maze.

**Reason:** This is the classic maze convention and matches what the acceptance criteria for this item need. No current requirement calls for configurable entrance/exit points, so keeping them fixed avoids unnecessary API surface.

**Rejected alternatives:** Making entrance/exit configurable per call — rejected as premature; nothing in the backlog currently requires it, and it can be added later without breaking this decision if the need arises.
