---
date: 2026-07-09
status: accepted
---
# Move solution-mode validation into core, shared by CLI and web

**Context:** Backlog item 015 adds a `--solution` option to the CLI (`generate`, `generate-and-send`), which needs to validate the value against the same `SolutionDisplayMode` values (`none`, `extra-page`, `overlay`) already validated by the web package (`SOLUTION_MODES`, `isValidSolutionMode`, `invalidSolutionModeMessage` in `packages/web/src/maze-request.ts`).

**Decision:** Move `SOLUTION_MODES`, `isValidSolutionMode`, and `invalidSolutionModeMessage` from `packages/web/src/maze-request.ts` into `packages/core`, exported alongside the existing `SolutionDisplayMode` type. The web package re-imports them from core instead of defining them locally. The CLI imports the same helpers for its own `--solution` flag validation.

**Reason:** Per the project's core constraint, `core` is the single place implementing business logic shared by the CLI and web — the two interfaces stay plain consumers. Solution-mode validation is small, but keeping two independent copies (one per interface) would violate that constraint the moment the CLI needed the same check, and would let the two validations drift (e.g. a mismatched error message) over time.

**Rejected alternatives:**
- Duplicating a local validation function in the CLI package: fastest to write, but directly contradicts the "no duplicated business logic" project constraint and creates a second place to update if solution modes ever change.
- Having the CLI import the validation helpers from `packages/web`: rejected because `web` is not a shared package — the CLI would gain an inappropriate dependency on the web server package for a concern that has nothing to do with HTTP.
