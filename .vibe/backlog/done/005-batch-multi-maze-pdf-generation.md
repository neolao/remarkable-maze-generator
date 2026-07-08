---
status: done
depends_on: [003]
---
# Batch Multi-Maze PDF Generation

## Description
Extend PDF generation to produce a single PDF document containing multiple mazes (one per page), so a user can request a batch of N mazes in one document instead of generating them one at a time.

## Acceptance Criteria
- [ ] System produces a single PDF with N maze pages when given a count N
- [ ] Each page in the batch contains a distinct maze (different seeds)
- [ ] Requesting a batch of 1 produces the same result as the single-maze renderer (item 003)

## Notes
None.
