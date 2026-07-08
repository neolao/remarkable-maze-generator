# Module: core
**Role:** Shared core carrying maze generation, PDF rendering, and the reMarkable Cloud client; consumed by `cli` and `web`. Maze generation, solution path computation, and PDF rendering (reMarkable 2 page size) are implemented; the reMarkable Cloud client is still a stub.
**Files:** `packages/core/src/index.ts`, `packages/core/src/maze.ts`, `packages/core/src/maze-solver.ts`, `packages/core/src/maze-pdf.ts`
**Exports:** `CORE_VERSION: string`, `generateMaze(options: GenerateMazeOptions): Maze`, `solveMaze(maze: Maze): MazePosition[]`, `renderMazeToPdf(maze: Maze, options?: RenderMazeToPdfOptions): Promise<Uint8Array>` (solution can be shown via `"extra-page"` or `"overlay"`, default `"none"`), `REMARKABLE_2_PAGE_WIDTH_PT`, `REMARKABLE_2_PAGE_HEIGHT_PT`, types `Maze`, `Cell`, `CellWalls`, `GenerateMazeOptions`, `MazePosition`, `RenderMazeToPdfOptions`, `SolutionDisplayMode`
**Depends on:** `pdf-lib` (external, PDF generation)
