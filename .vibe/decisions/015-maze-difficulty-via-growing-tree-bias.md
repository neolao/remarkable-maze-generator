---
date: 2026-07-09
status: accepted
---
# Maze difficulty via a tunable growing-tree selection bias

**Context:** Mazes were generated with a plain recursive backtracker: at each step, carve a passage from the most recently visited cell (a stack, LIFO) to a random unvisited neighbor. This produces long, winding corridors with comparatively few branch points, which users experience as too easy to solve. A `difficulty` option was requested to make mazes harder by increasing the number of branch points and decision points.

**Decision:** Generalize the recursive backtracker into a "growing tree" algorithm: maintain an active list of cells instead of a strict stack, and pick the next cell to expand from that list using a probability `p` of picking a uniformly random cell instead of the most recently added one. `difficulty` is exposed as an integer 1–5, linearly mapped to `p = (difficulty - 1) / 4`. Difficulty 1 (`p = 0`) always picks the most recent cell — mathematically identical to the previous recursive-backtracker behavior, and consumes no extra random draws, so existing (unspecified-difficulty) generation stays behaviorally unchanged. Difficulty 5 (`p = 1`) always picks a random active cell, which is structurally equivalent to Prim's algorithm and produces many short dead ends and branch points. `difficulty` defaults to 1 when omitted.

**Reason:** The growing tree algorithm is a well-known generalization that contains both the recursive backtracker (few branch points, "easy") and Prim's algorithm (many branch points, "hard") as its two extremes, reachable by tuning a single selection-bias parameter. This gives a genuinely continuous difficulty knob without maintaining two separate maze-generation implementations, and guarantees the maze stays a "perfect maze" (fully connected, exactly one path between any two cells) at every difficulty level, since it is still a spanning-tree carving algorithm.

**Rejected alternatives:** Post-processing an easy maze to add extra branch points (braiding) — this breaks the "exactly one solution path" property the PDF solution feature relies on, and reintroduces loops that were explicitly not wanted. Implementing two entirely separate algorithms (recursive backtracker for "easy", Prim's for "hard") and switching between them — duplicates logic and gives only two difficulty levels instead of a smooth scale.
