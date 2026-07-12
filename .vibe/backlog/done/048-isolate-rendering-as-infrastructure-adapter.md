---
status: done
depends_on: [047]
---
# Isolate Rendering as Infrastructure Adapter

## Description
PDF rendering (`maze-pdf.ts`), SVG rendering (`maze-svg.ts`), and shared geometry (`maze-layout.ts`) currently sit alongside domain logic in `core`, consuming `Maze` directly with no explicit boundary marking them as an output/presentation concern rather than a domain one. Once the domain entities are extracted (item 047), this item re-organizes rendering code as a clearly separated infrastructure/adapter layer that depends on the domain module (reading `Maze`, `MazePosition`, etc.) without the domain ever depending back on rendering — completing one half of the "domain has no outward dependency" rule DDD calls for.

## Acceptance Criteria
- [ ] PDF rendering, SVG rendering, and shared rendering geometry live under a distinct module boundary (e.g. a `rendering/` grouping) that imports from the domain module but is never imported by it.
- [ ] `renderMazeToPdf` and `renderMazeToSvg` keep their existing public signatures and output — full test suite green, no PDF/SVG byte or markup differences for any maze type.
- [ ] The public exports of `@remarkable-maze-generator/core` consumed by `cli` and `web` keep their existing signatures, so no changes are required in `cli` or `web`.

## Notes
Depends on backlog item 047 (Extract Core Domain Entities) since this item's boundary is defined relative to the domain module it introduces. Part of the "apply DDD" request split on 2026-07-12 — see item 047 for full context.
