---
date: 2026-07-09
status: accepted
---
# Web form: native PDF preview and split client validation

**Context:** Item 012 adds a web form to configure and generate a maze, with a preview shown before download/send (items 013/014, out of scope here). `POST /api/mazes/generate` already returns the PDF bytes directly (ADR 017). The static frontend (`packages/web/public/`) has no bundler or build step — only `packages/web/src/` is compiled by `tsc`.

**Decision:**
1. Preview the generated maze by loading the returned PDF into the browser's native PDF viewer (an embedded frame pointed at a blob URL built from the response), instead of rendering a custom thumbnail/image.
2. Keep the validation rules (positive integer width/height, integer difficulty 1–5) as a tested, framework-free TypeScript module in `packages/web/src/`. The static page's plain JavaScript re-implements the same checks inline, since `public/` files run unmodified in the browser with no build step to import compiled/tested code from `src/`.

**Reason:**
1. Every modern browser already renders PDFs natively; a bespoke preview would duplicate `core`'s rendering just to re-display it, with no added value for this ticket's acceptance criteria.
2. This keeps the authoritative, edge-case-tested validation logic in one place (satisfying the project's TDD requirement) without introducing a frontend bundler for a single small form — a proportionate trade-off given the static page's current scope.

**Rejected alternatives:**
- Custom canvas/SVG preview of the maze: rejected, duplicates rendering logic already owned by `core` for no acceptance-criteria benefit.
- Adding a frontend bundler (Vite/esbuild) to import the tested validation module directly into the browser: rejected as disproportionate for one form; revisit if the static frontend grows more modules needing shared logic.
