---
status: todo
---
# Avoid Redundant BFS In Maze Svg

## Description
In `packages/core/src/maze-svg.ts`, when `showSolution` is true, both `solveMaze(maze)` and `findSolutionBranchPoints(maze)` are called back-to-back, and `findSolutionBranchPoints` internally re-runs the same BFS instead of reusing the already-computed path. This doubles an already O(n) BFS on the SVG preview hot path (the "show solution on preview" checkbox is a normal UI toggle, so this fires on ordinary requests). Fixing it means letting `findSolutionBranchPoints` accept an optional precomputed path, which requires exposing the internal path/node type through `core`'s public API surface — a small API design decision.

## Acceptance Criteria
- [ ] `findSolutionBranchPoints` can accept a precomputed solution path instead of always recomputing it
- [ ] `maze-svg.ts`'s `showSolution` path calls `solveMaze` once and reuses its result for branch-point detection
- [ ] No change in rendered SVG output (solution path and branch points identical to before)
- [ ] The new/changed public API surface is covered by existing or updated tests in `packages/core`

## Notes
Found by `vibe:review-performance` during `/vibe:review` on 2026-07-10, rated Medium severity. Skipped during that review's auto-fix pass — needs a small public API design decision before implementation.
