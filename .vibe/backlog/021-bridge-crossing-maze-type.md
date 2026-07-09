---
status: in_progress
---
# Bridge Crossing Maze Type

## Description
Add a new maze type inspired by David Bau's "Printable Mazes" generator (https://davidbau.com/archives/2006/10/10/printable_mazes.html), whose most distinctive feature is 3-D crossings: corridors that pass over/under one another via a bridge instead of a flat intersection. This gives a more diabolical, non-planar maze compared to the current strictly grid-based generation. The feature should plug into the existing `core` maze generation module and be exposed as a selectable maze type from both the CLI and the web UI, reusing the shared PDF/SVG rendering layer.

## Acceptance Criteria
- [ ] User can select a "bridge crossing" maze type (alongside the existing type) when generating a maze via the CLI and the web form
- [ ] A generated bridge-crossing maze contains at least one crossing where two corridors overlap via an over/under bridge instead of a normal intersection
- [ ] The generated maze remains solvable: exactly one valid path exists from entrance to exit, and the solution-path feature (`--solution` / web option) correctly traces through bridge crossings
- [ ] PDF and SVG rendering visually distinguishes the "over" segment from the "under" segment at each bridge crossing (e.g. a visible gap in the under path)

## Notes
Source of inspiration: https://davidbau.com/archives/2006/10/10/printable_mazes.html (Python/ReportLab generator, also offers a "curvy" vs "straight" path style — out of scope here, this item focuses only on the bridge-crossing topology). Bridge crossings break the planar-grid assumption the current maze representation likely relies on, so the underlying maze data model in `core` may need to represent a crossing as a distinct cell/edge type rather than a simple wall/passage grid. Needs a design decision on how "over" vs "under" is encoded and rendered.
