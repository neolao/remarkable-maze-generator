---
date: 2026-07-08
status: accepted
---
# Use pdf-lib for PDF rendering

**Context:** The maze needs to be rendered as vector line segments (walls) into a PDF page.

**Decision:** Use the `pdf-lib` npm package to create the PDF document and draw the maze as line segments.

**Reason:** `pdf-lib` is pure TypeScript/JavaScript with no native dependencies (no canvas, no system font rendering required), which keeps `packages/core` easy to install and test across environments. Its API directly supports drawing lines and exporting bytes, which is all this renderer needs.

**Rejected alternatives:** `pdfkit` — also viable, but stream-oriented and geared more toward text-heavy documents with font management; `pdf-lib`'s simpler byte-array output and line-drawing API is a better fit for a pure vector maze grid.
