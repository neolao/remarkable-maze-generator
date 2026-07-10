---
date: 2026-07-10
status: accepted
---
# Core package resolves to source in dev, to compiled output otherwise

**Context:** The compiled production build of the web server and the CLI binary crashed on startup under plain `node`, because the `core` package's `main`/`exports` pointed straight at its TypeScript source (`./src/index.ts`), which `node` cannot execute without a loader. That source-pointing setup exists on purpose, so that `packages/web` and `packages/cli` can run against `core` via `tsx` and Vitest during development without requiring a build step first.

**Decision:** Give `core` conditional package exports: a `development` condition pointing at `./src/index.ts`, and a `default` condition pointing at `./dist/index.js`. The `tsx`-based dev scripts (`packages/web`'s `dev`, `packages/cli`'s `start`) now pass `--conditions=development` so they keep resolving straight to source with no build step. Plain `node` (compiled prod server, compiled CLI binary) has no such condition active, so it naturally falls through to `default` and picks up the built `dist/index.js`. Vitest already resolves the `development` condition by default, so `npm test` keeps working against source with no build required.

**Reason:** Preserves the existing "no build required for dev/test" pattern documented in `.vibe/index.md` while making the compiled production path actually resolve `core` correctly, without needing two different copies of `core`'s consumption logic.

**Rejected alternatives:**
- Pointing `main`/`exports` straight at `./dist/index.js` and requiring `core` to be built before any dev/test run — rejected because it breaks the fast, no-build dev loop the project already relies on.
- Running the "production" server/CLI through `tsx` instead of compiling — rejected in favor of a real compiled build; keeping `tsx` (a dev-time tool) as the production runtime was considered but not chosen.
