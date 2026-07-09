---
status: done
depends_on: [022]
---
# Round Tube Turn Corners

## Description
Round the corners of the "rectangle-crossing" maze type's tube where a corridor turns (currently a sharp 90° join between the two straight arm edges at a turn). This is purely a visual refinement of the existing tube geometry, applied consistently to both the PDF export and the web preview since they share the same tube geometry computation.

## Acceptance Criteria
- [ ] A turn in a "rectangle-crossing" maze's tube shows a rounded (curved) outer and inner corner instead of a sharp right-angle join
- [ ] Straight passages and dead ends are unaffected — only actual turns get rounded corners
- [ ] Adjacent cells' tube edges still connect with no visual gap at shared cell boundaries, even with rounded corners
- [ ] A bridge crossing still renders correctly (the over-axis tube stays uninterrupted, the under-axis arms still stop cleanly at the hub with a real visible gap)
- [ ] The change is reflected consistently in both the PDF export and the web preview (SVG)

## Notes
This directly touches the geometry established by ADR 025 and ADR 026: the deliberate choice to render the tube as simple, independent straight line segments (no fills, no borders, no joint-filling geometry) specifically to eliminate a recurring class of rendering bugs from earlier, more complex attempts (hollow-tube border tricks, per-joint filled disks). Rounding the turn corners will need a concrete technical approach that adds curves (e.g. arcs between the existing hub corner points) without reintroducing that class of bug — this should be explicitly proposed and confirmed with the user before implementation, given the project's prior history on this exact rendering technique (see ADR 025's "je parlais de dessiner les traits des 2 côtés du tube" / "il FAUT un tube creux" exchange). Depends on backlog item 022 (tube widening) only because it touches the same geometry function and should build on the current tube width, not because of a functional prerequisite.
