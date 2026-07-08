---
date: 2026-07-08
status: accepted
---
# Batch maze generation and PDF output API shape

**Context:** Users need to request a batch of N mazes, and get the result either as a single combined PDF (one maze per page) or as N separate PDF files.

**Decision:**
- A new `generateMazeBatch({ width, height, seed, count })` produces an array of `count` distinct `Maze` objects, deriving each maze's seed as `seed + index` (index starting at 0) so the batch stays fully reproducible from a single starting seed.
- `renderMazeBatchToPdf(mazes: Maze[], options?)` combines the given mazes into one PDF document, one maze per page.
- `renderMazeBatchToPdfs(mazes: Maze[], options?)` returns an array of separate single-maze PDFs (one per maze), by reusing the existing single-maze renderer per maze.
- Both PDF functions accept pre-built `Maze[]` arrays rather than generation parameters, keeping maze generation and PDF rendering as separate concerns; `generateMazeBatch` is the bridge most callers will use to build that array.

**Reason:** Splitting "generate N mazes" from "render them" keeps each function single-purpose and lets `renderMazeBatchToPdfs` be a thin wrapper over the already-tested single-maze renderer instead of a parallel implementation. Deriving seeds as `seed + index` is the simplest reproducible scheme and requires no extra state.

**Rejected alternatives:** A single function taking generation parameters directly and an output-mode flag — rejected because it conflates two responsibilities (which mazes to render, and how to package them) and complicates the return type (`Uint8Array | Uint8Array[]`) depending on a flag.
