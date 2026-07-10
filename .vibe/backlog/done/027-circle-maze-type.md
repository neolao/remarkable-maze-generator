---
status: done
---
# Circle Maze Type

## Description
Add a new selectable maze type, `circle`, alongside the existing `rectangle` and `rectangle-crossing` types. Instead of a rectangular grid of square cells, the maze is laid out as concentric rings divided into cells, with walls between adjacent cells along a ring and between rings, generated and rendered as a circular/radial shape rather than a rectangle.

## Acceptance Criteria
- [x] User can select `circle` as the maze type from the CLI (`--type circle`) and from the web configuration form's maze type dropdown, alongside the existing options
- [x] The generated `circle` maze is a valid perfect maze: every cell is reachable from the entrance, and there is exactly one solution path from entrance to exit
- [x] The `circle` maze renders correctly as a circular/radial shape in both the downloaded PDF and the web preview (SVG), instead of the rectangular grid layout used by the other types
- [x] Selecting `circle` together with any option it does not support: resolved by making `circle` work with every existing option instead — all 4 generation algorithms and every difficulty level are supported, with no restriction (see Notes)

## Notes
Resolved with a much lighter design than the one sketched above, after a design challenge raised during planning (see [[034-circle-maze-type-as-polar-rendering]]): rather than a new cell/wall representation and a new solver, `circle` reuses the exact same rectangular grid, all 4 generation algorithms, difficulty option, solver, and branch-point detection unchanged — a column becomes an angular sector, a row a concentric ring, with the grid wrapping horizontally end-to-end (carved during generation, not stitched on after) so the maze reads as a real seamless circle. Rendering got a new polar geometry (ring-boundary walls as arcs, sector-boundary walls as radial lines), reusing the existing generic segment-drawing code in both the PDF and SVG renderers. One real bug was found and fixed along the way: the solver assumed a maze's boundary walls are always closed, which the wraparound violates — now wraparound-aware for `circle`.
