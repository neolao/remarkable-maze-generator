---
status: done
depends_on: [001]
---
# Maze PDF Rendering

## Description
Render a generated maze as a PDF page, with a layout suited to the reMarkable tablet screen (page size/margins matching the device). One maze per page for this first iteration.

## Acceptance Criteria
- [ ] System produces a valid PDF file from a generated maze
- [ ] The maze fills the page within margins sized for the reMarkable screen, without clipping or distortion
- [ ] Rendering the same maze twice produces visually identical output

## Notes
Page dimensions should be chosen based on the reMarkable device's screen size — confirm target device (reMarkable 2 vs Paper Pro) if it affects the page size.
