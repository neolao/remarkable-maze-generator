---
status: done
depends_on: [012]
---
# Web Preview Solution Overlay

## Description
Let the user optionally see the maze's solution traced directly on the web preview image, instead of only in the downloaded/sent PDF. Along the traced solution, each branch point (a cell where the solution path passes a junction with another possible direction) is marked with a circle, and the total number of branch points on the solution path is displayed on the page.

## Acceptance Criteria
- [ ] User can enable a "show solution" option on the maze configuration form before generating
- [ ] When enabled, the preview image shows the solution path traced over the maze walls
- [ ] When enabled, each branch point along the solution path is marked with a visible circle on the preview image
- [ ] The page displays the total number of branch points found on the solution path
- [ ] Leaving the option disabled keeps the current preview behavior (walls only, no solution, no branch count shown)

## Notes
The web preview is rendered via `core`'s `renderMazeToSvg()`, which currently only draws walls (no solution overlay, see ADR 019) — the SVG renderer will need a solution/branch-point drawing mode, and computing "branch points along the solution path" is new derived logic that likely belongs in `core` (near `solveMaze()`) rather than in the web package, to keep generation/solving logic in one place per project constraints. Definition of "branch point" (a path cell adjacent to more than 2 open passages, vs. any junction the path merely passes near) should be confirmed during implementation if ambiguous.
