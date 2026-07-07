# Module: core
**Role:** Shared core carrying maze generation, PDF rendering, and the reMarkable Cloud client; consumed by `cli` and `web`. Maze generation and solution path computation are implemented; PDF rendering and the reMarkable Cloud client are still stubs.
**Files:** `packages/core/src/index.ts`, `packages/core/src/maze.ts`, `packages/core/src/maze-solver.ts`
**Exports:** `CORE_VERSION: string`, `generateMaze(options: GenerateMazeOptions): Maze`, `solveMaze(maze: Maze): MazePosition[]`, types `Maze`, `Cell`, `CellWalls`, `GenerateMazeOptions`, `MazePosition`
**Depends on:** —
