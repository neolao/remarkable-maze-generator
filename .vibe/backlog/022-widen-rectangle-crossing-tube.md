---
status: in_progress
---
# Widen Rectangle-Crossing Tube

## Description
Increase the visual width of the "rectangle-crossing" maze type's hollow-tube corridors, so the tube can take up more space within a cell than it currently does — potentially more space than the area outside the tube (the walls/gaps between adjacent parallel corridors). This applies to both the PDF and SVG renderers, which share the same tube geometry.

## Acceptance Criteria
- [ ] Generating a "rectangle-crossing" maze renders each corridor's tube visibly wider than the current default
- [ ] The wider tube still renders correctly at a bridge crossing (the over-axis tube stays uninterrupted, the under-axis arms still stop cleanly at the hub, preserving a real visible gap)
- [ ] Adjacent cells' tube edges still connect with no visual gap at shared cell boundaries, even at the increased width
- [ ] The change is reflected consistently in both the PDF export and the web preview (SVG), since both share the same tube geometry

## Notes
The tube's half-width is currently controlled by a single ratio constant (`TUBE_HALF_WIDTH_RATIO = 0.2`, a fraction of the cell size) in `packages/core/src/maze-layout.ts`, shared by both `computeTubeSegments()` (used by PDF and SVG rendering — see ADR 026). Widening it enough that the tube takes up more space than the non-tube area (i.e. half-width > 0.25) is a valid target per this request, but should be checked visually against a generated maze to confirm corridors and crossings still read clearly and don't visually collide at tight turns — see ADR 025/026 for why the current two-edge-lines technique was chosen over earlier border-fill/single-centerline approaches.
