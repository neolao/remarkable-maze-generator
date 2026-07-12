---
status: done
---
# Extract Core Domain Entities

## Description
The `core` package currently mixes domain concepts (`Maze`, `Cell`, `CellWalls`, `MazePosition`, `MazeType`, `MazeAlgorithm`, validation rules) directly inside modules that also contain generation algorithms, rendering, and cloud-integration logic (`maze.ts`, `maze-solver.ts`). This item introduces an explicit domain layer that isolates these core entities, value objects, and their invariants (dimension bounds, difficulty range, type/algorithm compatibility) from everything that consumes them, giving the codebase the domain boundary that `CLAUDE.md` currently notes as missing (`vibe:review-ddd` is inactive: "no explicit domain layer"). This is the foundational step other DDD-oriented items (isolating rendering and reMarkable Cloud access as adapters) build on.

## Acceptance Criteria
- [ ] `Maze`, `Cell`, `CellWalls`, `MazePosition`, `MazeType`, `MazeAlgorithm`, `MazeCrossing`, `PathLengthTarget` and their validation rules live in a dedicated domain module, separate from generation-algorithm implementations, rendering, and reMarkable Cloud code.
- [ ] Generation algorithms (`maze-algorithms/*`, `circle-maze/*`), rendering (`maze-pdf.ts`, `maze-svg.ts`, `maze-layout.ts`), and the reMarkable Cloud client depend on the domain module — the domain module has no dependency on any of them.
- [ ] All existing behavior (maze generation, validation error messages, solving) is unchanged — full test suite green, no output differences for any maze type or algorithm.
- [ ] The public exports of `@remarkable-maze-generator/core` consumed by `cli` and `web` (`generateMaze`, `MAZE_TYPES`, `isValidMazeType`, etc.) keep their existing signatures, so no changes are required in `cli` or `web`.

## Notes
Requested by the user as the first step of "apply DDD" to this project — see decision in `/vibe:backlog` session on 2026-07-12: the request was split into 4 separate items (this one, isolating rendering as an adapter, isolating the reMarkable Cloud client as an adapter, and completing the glossary's empty definitions) since each is independently shippable. This item should land first since the other two adapter-isolation items depend on the domain module it creates existing.
