---
status: in_progress
---
# Circle-Crossing Maze Type

## Description
The `rectangle-crossing` maze type renders thick, curvy tube passages with occasional bridge crossings (a passage tunneling straight through another), but it only exists for the rectangular grid topology and is restricted to the `growing-tree` algorithm (`packages/core/src/maze.ts`). The `circle` maze type is a separate growing-sector topology (`packages/core/src/circle-maze/`) with its own generation, solver, and polar renderer, but has no crossing/bridge support. This task adds a new `circle-crossing` maze type that combines the circle topology with tube-style passages and bridge crossings, analogous to how `rectangle-crossing` extends `rectangle`.

## Acceptance Criteria
- [ ] `circle-crossing` is accepted as a valid `MazeType` (CLI `--type`, web form dropdown, and core `generateMaze`)
- [ ] Generating a maze with `type: "circle-crossing"` produces thick, curvy tube passages on the polar/circle layout, matching the visual style of `rectangle-crossing` adapted to sectors and rings
- [ ] The generated circle-crossing maze includes at least one bridge crossing where structurally possible, rendered correctly in both the PDF and SVG polar renderers
- [ ] Requesting `circle-crossing` with an algorithm that does not support crossings produces the same clear validation error behavior as `rectangle-crossing` does today (currently restricted to `growing-tree`)

## Notes
This combines two features that were each built as separate, isolated tracks: bridge crossings (ADR 024, ADR 033, restricted to `growing-tree`) and the circle maze's own topology (`circle-maze/` module tree, entirely separate from the rectangular grid — see [[027-circle-maze-type]] if still present in `done/`). The circle maze's growing-tree implementation (`packages/core/src/circle-maze/growing-tree.ts`) does not currently implement crossing/tunnel logic, so the tunnel-candidate mechanism from `packages/core/src/maze-algorithms/growing-tree.ts` will need a polar-topology equivalent (crossing "straight through" a ring or sector boundary passage rather than a grid-aligned one). The polar SVG/PDF renderer will also need tube-width and crossing-rendering support mirrored from the rectangle-crossing renderer.
