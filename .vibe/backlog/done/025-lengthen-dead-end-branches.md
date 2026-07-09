---
status: done
---
# Lengthen Dead-End Branches

## Description
Improve maze generation so that wrong-turn branches (dead ends off the solution path) tend to be longer, instead of the many short dead ends the current generator produces — a solver can currently rule out a wrong branch almost immediately after taking it, making the maze feel less challenging even at higher difficulty. This is about the *length* of dead-end branches specifically, not the overall number of decision points along the solution path (which `--difficulty` already controls).

## Acceptance Criteria
- [ ] Generating a maze (at a given difficulty) produces noticeably fewer short (1–2 cell) dead-end branches than the current generator, for a representative sample of seeds
- [ ] The maze keeps exactly one solution and remains fully connected (single spanning tree), same guarantee as today
- [ ] The same seed still reproduces the exact same maze after the change (deterministic generation is preserved, even though the specific layout produced for a given seed may change)
- [ ] Existing difficulty levels (1–5) still meaningfully vary how hard the maze is to solve — the change should not flatten difficulty into "always long branches regardless of level"

## Notes
Current algorithm: `packages/core/src/maze.ts`'s `generateMaze()` uses a growing-tree algorithm (see ADR 015) with a single `randomSelectionProbability` derived from `difficulty` — picking the most-recently-added active cell (probability 0) behaves like a recursive backtracker (long corridors, few branch points), while picking a uniformly random active cell (probability 1) behaves like Prim's algorithm (many branch points, but characteristically short dead-end branches, since a wrong turn gets boxed in quickly by cells already claimed by other branches). This is why higher difficulty today produces more branch points *and*, as a side effect, shorter dead ends — the request is to break that coupling so dead-end branches stay long even as the number of branch points increases with difficulty. Likely needs a growing-tree cell-selection strategy that biases toward *extending the most recently active branch further before abandoning it* (e.g. a weighted mix, or a "commit to a branch for at least N cells" rule) rather than the current binary most-recent-vs-random choice. Should be validated by actually measuring dead-end branch lengths in generated output (not just visual impression) before/after, across the difficulty range.
