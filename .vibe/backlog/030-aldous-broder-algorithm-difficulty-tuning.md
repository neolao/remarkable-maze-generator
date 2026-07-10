---
status: todo
---
# Aldous-Broder Algorithm Difficulty Tuning

## Description
The `difficulty` option (1–5) is currently only honored by the `growing-tree` algorithm, which uses it as the probability of picking a random active cell versus the most recently added one, producing fewer branch points at low difficulty and more at high difficulty. The `aldous-broder` algorithm currently ignores `difficulty` entirely (see the "ignores the difficulty option (not yet tunable for aldous-broder)" test in `packages/core/src/maze.test.ts`). This task implements a real difficulty lever for `aldous-broder` so it behaves consistently with `growing-tree`.

## Acceptance Criteria
- [ ] System applies the given `difficulty` option when generating a maze with the `aldous-broder` algorithm instead of ignoring it
- [ ] For the same size and seed, a higher `difficulty` produces a maze with more branch points than a lower `difficulty`
- [ ] Boundary difficulty values (1 and 5) are both accepted and produce a fully solvable, fully connected maze
- [ ] The existing "ignores the difficulty option (not yet tunable for aldous-broder)" test is replaced with tests asserting the new tunable behavior

## Notes
Difficulty semantics should match `growing-tree`: difficulty 1 is the easiest (fewest branch points), difficulty 5 is the hardest (most branch points). Aldous-Broder (`packages/core/src/maze-algorithms/aldous-broder.ts`) is a uniform spanning tree algorithm driven by a random walk over unvisited cells; introducing a branch-point bias likely requires biasing the walk's direction choice (e.g. favoring continuing straight versus turning) similar to the approach needed for [[029-wilson-algorithm-difficulty-tuning]], rather than reusing growing-tree's active-cell selection mechanism. Range validation (`validateDifficulty` in `packages/core/src/maze.ts`) already applies across all algorithms, so no new validation should be needed — only the generation logic itself.
