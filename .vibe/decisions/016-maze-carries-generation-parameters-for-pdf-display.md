---
date: 2026-07-09
status: accepted
---
# Maze carries its own generation parameters for PDF display

**Context:** Generated maze PDFs need to display the parameters used to create them (type, dimensions, seed, difficulty), so a maze can be regenerated exactly later just by reading the values off the page. The PDF renderer (`renderMazeToPdf` and friends) only ever received a `Maze` object (`width`, `height`, `cells`) and a separate `RenderMazeToPdfOptions` bag (currently just the solution display mode) — it had no access to the seed or difficulty used to produce that maze, since those are consumed and discarded inside `generateMaze`.

**Decision:** Add optional `type`, `seed`, and `difficulty` fields directly to the `Maze` type, populated by `generateMaze()` with the resolved values it used (including the current single supported type, `"rectangle"`, and the difficulty after defaulting). `generateMazeBatch()` propagates them per maze (each maze keeps its own effective `seed + index`). The PDF renderer reads these fields straight off the `Maze` it is given and prints them in a small footer when present, instead of taking them as separate rendering options. The fields stay optional so maze objects built without going through `generateMaze()` (existing hand-built test fixtures) remain valid and simply render without the footer.

**Reason:** Making the maze self-describing keeps a single source of truth for "how was this maze made" — there is no separate value the caller could pass to the renderer that drifts from what was actually generated, which is exactly the kind of accuracy this feature is meant to guarantee. It also makes the batch case correct for free: each maze in a batch already carries its own resolved seed, so the printed footer is automatically accurate per page without any extra plumbing, even though batch generation is not yet exposed through the CLI.

**Rejected alternatives:** Passing `seed`/`difficulty` as new fields on `RenderMazeToPdfOptions`, supplied by the caller alongside the maze — rejected because it duplicates information the maze generator already has, opening the door to a caller passing a maze rendered with parameters that don't match how it was actually generated, and would have printed the same single seed on every page of a batch regardless of each maze's actual seed.
