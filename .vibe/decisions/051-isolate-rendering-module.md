---
date: 2026-07-12
status: accepted
---
# Isolate rendering code under a dedicated `rendering/` module

**Context:** Following the extraction of the domain module (`maze-domain.ts`, ADR 050), backlog item 048 asked for PDF rendering (`maze-pdf.ts`), SVG rendering (`maze-svg.ts`), and their shared drawing geometry (`maze-layout.ts`) to live under a distinct module boundary that depends on the domain module but is never depended on by it — completing one half of DDD's "domain has no outward dependency" rule.

**Decision:** Move `maze-pdf.ts`, `maze-svg.ts`, `maze-layout.ts`, and `maze-render-strategy.ts` (plus their test files) into a new `packages/core/src/rendering/` directory. `maze-render-strategy.ts` was included even though the backlog item only named the first three files, because it exists solely to dispatch to them (used exclusively by `maze-pdf.ts`/`maze-svg.ts`, per-`MazeType` segment/layout lookup) and has no reason to sit outside the rendering boundary. `circle-maze/render.ts` was deliberately left in place under `circle-maze/`, preserving that module's existing per-type cohesion (generation, solving, and rendering for the circle maze type kept together) rather than splitting it to match the new grouping.

**Reason:** Keeps the domain module free of any dependency on how a maze is drawn, and gives the rendering concern one place to live instead of being scattered at the package root alongside domain and generation code. No public API or output changed — pure internal reorganization.

**Rejected alternatives:** Leaving `maze-render-strategy.ts` at the package root — rejected because it has no consumer outside rendering and would leave a rendering-only file outside the boundary the item asked for. Also moving `circle-maze/render.ts` into `rendering/` — rejected to avoid breaking the established per-maze-type cohesion of the `circle-maze/` module tree for a boundary the backlog item didn't ask to extend that far.
