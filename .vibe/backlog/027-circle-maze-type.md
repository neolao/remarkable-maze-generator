---
status: in_progress
---
# Circle Maze Type

## Description
Add a new selectable maze type, `circle`, alongside the existing `rectangle` and `rectangle-crossing` types. Instead of a rectangular grid of square cells, the maze is laid out as concentric rings divided into cells, with walls between adjacent cells along a ring and between rings, generated and rendered as a circular/radial shape rather than a rectangle.

## Acceptance Criteria
- [ ] User can select `circle` as the maze type from the CLI (`--type circle`) and from the web configuration form's maze type dropdown, alongside the existing options
- [ ] The generated `circle` maze is a valid perfect maze: every cell is reachable from the entrance, and there is exactly one solution path from entrance to exit
- [ ] The `circle` maze renders correctly as a circular/radial shape in both the downloaded PDF and the web preview (SVG), instead of the rectangular grid layout used by the other types
- [ ] Selecting `circle` together with any option it does not support (to be determined during implementation — e.g. bridge crossings, or a specific generation algorithm) is rejected with a clear error message, consistent with how other unsupported type/option combinations are already handled

## Notes
The current maze model (`Cell[][]`, `CellWalls` with north/south/east/west) is built around a rectangular grid; a circular maze (rings + radial subdivisions) will likely need its own cell/wall representation and its own rendering path in both the PDF and SVG renderers, distinct from the existing wall-segment/tube-segment geometry. How difficulty and the selectable generation algorithms (growing-tree, kruskal, wilson, aldous-broder — see ADR 033) apply to this new type is an open question to resolve during implementation.
