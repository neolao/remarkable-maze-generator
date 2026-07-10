---
status: todo
---
# Refactor Maze Type/Algorithm Dispatch Into Strategy Map

## Description
The same if/else or switch on `maze.type` (rectangle / rectangle-crossing / circle) is duplicated across `packages/core/src/maze-pdf.ts` (`drawMaze`), `maze-svg.ts` (`renderMazeToSvg`), and `maze-solver.ts` (`solveMaze`, `findSolutionBranchPoints`), plus duplicated circle-type checks in `logicalLayoutSize`/`logicalSvgSize` and a second parallel algorithm switch in `circle-maze/generate.ts`. Adding a new maze type or generation algorithm currently requires synchronized edits across roughly six call sites, which violates the Open/Closed Principle and risks silent drift if one site is missed. Introduce a per-axis strategy lookup (e.g. `Record<MazeType, renderer>` and `Record<MazeAlgorithm, generator>`) so each new type/algorithm is registered in one place per axis.

## Acceptance Criteria
- [ ] Adding a new maze type requires editing exactly one registration point per concern (rendering, solving), not one branch per file
- [ ] Adding a new generation algorithm requires editing exactly one registration point instead of two parallel switches
- [ ] All existing maze types (rectangle, rectangle-crossing, circle) and algorithms (growing-tree, kruskal, wilson, aldous-broder) continue to behave identically (full test suite green, no PDF/SVG output changes)
- [ ] No duplicated `maze.type === "circle"` checks remain across `maze-pdf.ts` and `maze-svg.ts`

## Notes
Found by `vibe:review-solid` during `/vibe:review` on 2026-07-10, rated High severity. Skipped during that review's auto-fix pass because it's a multi-file refactor judged too risky for a mechanical apply-and-verify loop — recommended as a dedicated follow-up task instead.
