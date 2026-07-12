---
date: 2026-07-12
status: accepted
---
# Isolate reMarkable Cloud client under a dedicated `infrastructure/remarkable/` module

**Context:** Following the extraction of the domain module (ADR 050) and the rendering module (ADR 051), backlog item 049 asked for the reMarkable Cloud integration (`remarkable-auth.ts`, `remarkable-upload.ts`, `remarkable-credential-store.ts`) to live under a distinct module boundary marking it as an external-system adapter, separate from domain and rendering code, completing the other half of DDD's "domain has no outward dependency" rule.

**Decision:** Move `remarkable-auth.ts`, `remarkable-upload.ts`, `remarkable-credential-store.ts` (plus their test files) into a new `packages/core/src/infrastructure/remarkable/` directory. None of these files import from the domain module (`maze-domain.ts`) today, so the move is a pure relocation with no import changes beyond updating `index.ts`'s paths. The package's public exports (`@remarkable-maze-generator/core`) are unchanged, so `cli` and `web` require no changes.

**Reason:** Keeps the domain module free of any dependency on `rmapi-js`, credential storage, or upload mechanics, and gives the reMarkable Cloud adapter concern one place to live instead of sitting at the package root alongside domain and rendering code. Mirrors the grouping precedent already established for rendering (ADR 051).

**Rejected alternatives:** Naming the directory `remarkable/` at the package root instead of nesting it under `infrastructure/` — rejected because the backlog item explicitly called for an `infrastructure/`-labeled boundary to make the adapter/external-system nature of the code visible from the directory structure itself, not just a topical grouping like `rendering/`.
