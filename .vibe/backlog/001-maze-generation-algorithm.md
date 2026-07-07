---
status: in_progress
---
# Maze Generation Algorithm

## Description
Implement the maze generation logic in `packages/core`, using a grid-based algorithm (e.g. recursive backtracker) to produce a solvable maze. Width, height, and a random seed must be configurable so the same seed always reproduces the same maze.

## Acceptance Criteria
- [ ] System generates a maze given a width and height
- [ ] System generates the same maze twice when given the same seed
- [ ] Generated maze has exactly one path between any two connected cells (no isolated areas, no unreachable cells)
- [ ] Invalid dimensions (e.g. zero or negative width/height) are rejected with a clear error

## Notes
Must live entirely in `packages/core` per CLAUDE.md — `cli` and `web` will only call into this logic, never reimplement it.
