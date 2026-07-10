---
status: todo
---
# Configurable Path-Length Candidate Count

## Description
Currently, when a `pathLength` target (short/medium/long) is requested, the generator always tries a fixed number of candidate seeds (`PATH_LENGTH_MAX_ATTEMPTS = 10` in `packages/core/src/maze.ts`) and keeps the best match. Expose this candidate count as a user-configurable option in both the CLI and the web UI, so users can trade off generation time against how closely the solution path matches their requested length.

## Acceptance Criteria
- [ ] User can specify the number of candidate mazes to generate and compare, as an optional parameter alongside `pathLength`, available in both the CLI (`generate`/`generate-and-send`) and the web configuration form.
- [ ] When left unset, the current default behavior is preserved (10 candidates).
- [ ] The option is rejected with a clear validation error when set without a `pathLength` target, or when given a non-positive/non-integer value.
- [ ] The option has no effect on generation when `pathLength` is not set (no unnecessary repeated generation).

## Notes
This only makes sense combined with `pathLength` (see done/037-solution-path-length-option.md) — the candidate count is meaningless without a target to select against. Core logic already isolates this as `PATH_LENGTH_MAX_ATTEMPTS`; this item is about threading a user-supplied value through `generateMaze` options instead of the hardcoded constant, plus surfacing it as a CLI flag and a web form field, with validation. Open question: should there be an upper bound enforced (to prevent an excessive value causing very slow generation) — left to implementation.
