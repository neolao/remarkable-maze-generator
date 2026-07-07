# Module: core
**Role:** Shared core carrying maze generation, PDF rendering, and the reMarkable Cloud client; consumed by `cli` and `web`. Maze generation is implemented; PDF rendering and the reMarkable Cloud client are still stubs.
**Files:** `packages/core/src/index.ts`, `packages/core/src/maze.ts`
**Exports:** `CORE_VERSION: string`, `generateMaze(options: GenerateMazeOptions): Maze`, types `Maze`, `Cell`, `CellWalls`, `GenerateMazeOptions`
**Depends on:** —
