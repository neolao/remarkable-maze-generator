---
status: todo
---
# Wilson Algorithm Difficulty Tuning

## Description
The `difficulty` option (1–5) is currently only honored by the `growing-tree` algorithm, which uses it as the probability of picking a random active cell versus the most recently added one, producing fewer branch points at low difficulty and more at high difficulty. The `wilson` algorithm currently ignores `difficulty` entirely (see the "ignores the difficulty option (not yet tunable for wilson)" test in `packages/core/src/maze.test.ts`). This task implements a real difficulty lever for `wilson` so it behaves consistently with `growing-tree`.

## Acceptance Criteria
- [ ] System applies the given `difficulty` option when generating a maze with the `wilson` algorithm instead of ignoring it
- [ ] For the same size and seed, a higher `difficulty` produces a maze with more branch points than a lower `difficulty`
- [ ] Boundary difficulty values (1 and 5) are both accepted and produce a fully solvable, fully connected maze
- [ ] The existing "ignores the difficulty option (not yet tunable for wilson)" test is replaced with tests asserting the new tunable behavior

## Notes
Difficulty semantics should match `growing-tree`: difficulty 1 is the easiest (fewest branch points), difficulty 5 is the hardest (most branch points). Wilson's algorithm (loop-erased random walks, `packages/core/src/maze-algorithms/wilson.ts`) is a uniform spanning tree algorithm by construction, so introducing a branch-point bias likely requires biasing the random walk's direction choice (e.g. favoring continuing straight versus turning) rather than reusing growing-tree's active-cell selection mechanism. Range validation (`validateDifficulty` in `packages/core/src/maze.ts`) already applies across all algorithms, so no new validation should be needed — only the generation logic itself.
