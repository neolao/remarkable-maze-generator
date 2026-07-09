---
date: 2026-07-09
status: accepted
---
# Bridge crossing maze type: visual-only crossings, shared type validation

**Context:** Adding a new selectable maze type, `rectangle-crossing`, inspired by David Bau's "Printable Mazes" 3-D crossings — corridors that visually pass over/under one another via a bridge instead of a flat intersection (backlog item 021).

**Decision:**
- Crossings are visual-only: at a crossing cell, the "over" passage is the real corridor already part of the maze's unique spanning tree (same generation algorithm as `rectangle`); the "under" passage is a decorative stub capped at the cell boundary — it is not a real passage, does not connect to neighboring cells, and cannot be walked. No new edges are added to the maze graph, so the existing "exactly one path between entrance and exit" guarantee is preserved unchanged.
- Crossing cells are recorded as an explicit list (cell coordinates) on the generated `Maze`, populated only for `type: "rectangle-crossing"`, derived by scanning interior cells for a straight-through passage (two opposite walls open, perpendicular walls closed) after the normal spanning-tree generation completes. Very small mazes may have no eligible cell — the type still generates a valid maze with zero crossings rather than failing.
- Maze type selection follows the same shared-validation pattern already established for solution display modes (ADR 021): a `MAZE_TYPES` list, `isValidMazeType()`, and `invalidMazeTypeMessage()` are added to `core` and consumed identically by `cli` and `web`, so both interfaces enforce and describe the same allowed values.

**Reason:** A functional crossing (a real second passage sharing a cell) would add a cycle to the spanning tree, which can create more than one valid path between entrance and exit — contradicting the existing, already-relied-upon "perfect maze" guarantee and the product requirement that the maze stay uniquely solvable. Keeping the crossing purely decorative delivers the visual/diabolical effect the feature is inspired by, without touching the proven generation and solving logic.

**Rejected alternatives:**
- Functional crossings with real alternate passages (true 3-D routing, closer to the original inspiration) — rejected because it can introduce loops and ambiguous solutions, and would require a materially different generation and solving algorithm.
- A general layered/graph-based maze model to support arbitrary crossings anywhere — rejected as disproportionate for the requested scope; the simpler "decorative stub on an existing straight passage" satisfies the acceptance criteria without a data model overhaul.
