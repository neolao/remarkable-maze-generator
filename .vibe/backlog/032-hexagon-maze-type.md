---
status: todo
---
# Hexagon Maze Type

## Description
The project currently supports `rectangle`, `rectangle-crossing`, and `circle` maze types (`MazeType` in `packages/core/src/maze.ts`), each with its own topology, generation, solver, and renderer. This task adds a new `hexagon` maze type, inspired by https://codebox.net/pages/maze-generator, using a grid of hexagonal cells (6 neighbors per interior cell) instead of the rectangular grid or the circle's growing-sector topology.

## Acceptance Criteria
- [ ] `hexagon` is accepted as a valid `MazeType` (CLI `--type`, web form dropdown, and core `generateMaze`)
- [ ] Generating a maze with `type: "hexagon"` produces a fully connected, uniquely solvable maze laid out on a hexagonal cell grid
- [ ] The hexagon maze renders correctly in both the SVG preview and the PDF output, with walls drawn along real hexagon edges (not a rectangular approximation)
- [ ] The solution path and branch-point detection work correctly on the hexagon topology, consistent with existing maze types

## Notes
Attempting to fetch https://codebox.net/pages/maze-generator returned HTTP 403 (access denied), so the reference site's exact visual style and cell-adjacency conventions could not be verified programmatically. Per prior guidance ([[feedback_visual_style_verification]]), a real reference image/screenshot of that generator's hexagon output should be obtained and reviewed manually before implementing the visual style, rather than guessing. Architecturally, this should likely follow the pattern established for the `circle` maze type: its own module tree (e.g. `hexagon-maze/`) entirely separate from the rectangular grid, with its own generation, solver, and renderer, reusing shared algorithm/solution-path logic where the topology allows (see `packages/core/src/circle-maze/` for the precedent).
