---
status: done
---
# Tube Background Color Option for Crossing Types

## Description
The `rectangle-crossing` maze type (and, once built, `circle-crossing`, see [[031-circle-crossing-maze-type]]) renders thick, curvy tube passages, but the tube shape can currently be hard to distinguish from the surrounding page background. This task adds an option to fill the tube passages with a background color/fill so the tube outline reads more clearly against the page, without affecting non-crossing maze types where there is no tube to highlight.

## Acceptance Criteria
- [ ] User can enable a tube background fill option when generating a `rectangle-crossing` (and `circle-crossing`, once available) maze, via both the CLI and the web form
- [ ] When enabled, the exported PDF and the SVG preview render the tube passages filled with a distinct background color/fill, clearly separating them from the page background
- [ ] When disabled (default), rendering is unchanged from current behavior
- [ ] The option has no effect (or is not offered) for maze types without tube passages (`rectangle`, `circle`)

## Notes
Relevant rendering files: `packages/core/src/maze-svg.ts`, `packages/core/src/maze-pdf.ts`, `packages/core/src/maze-layout.ts` (tube/wall geometry shared by both renderers, per the project's shared wall/path-geometry layers). Should stay printable/legible on a reMarkable e-ink display and on paper if printed — favor a light, subtle fill (e.g. light gray) over a strong color, and verify the PDF still looks correct once printed/viewed in grayscale. Naming for the option (CLI flag, web checkbox/field, API parameter) should follow existing conventions like `--solution` and `showSolutionOnPreview`.
