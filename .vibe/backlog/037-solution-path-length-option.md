---
status: in_progress
---
# Solution Path Length Option

## Description
Add a generation option letting the user request a solution path that is more or less long (e.g. short / medium / long, or an explicit target length). To satisfy the request, the generator can run multiple maze generations with different random seeds and pick the candidate whose solution path length best matches the requested target, rather than trying to force path length within a single generation pass.

## Acceptance Criteria
- [ ] User can specify a target solution path length (e.g. short/medium/long, or an explicit length/range) as a maze generation parameter, available in both CLI and web UI.
- [ ] System generates multiple maze candidates with different random seeds and selects the one whose solution path length best matches the requested target.
- [ ] The number of candidate attempts is bounded so generation still completes within a reasonable time even when no candidate matches the target exactly (best-effort selection).
- [ ] When the option is left unset, maze generation behaves exactly as before (single-seed generation, no path-length filtering).

## Notes
Solution path length is already computed by the existing solver (see done/002-maze-solution-path-computation.md), so this is primarily about repeated generation + selection, not new path-detection logic. Path length achievable range depends on maze type/algorithm/dimensions, so "short/medium/long" may need to be relative to grid size rather than an absolute cell count. Open question: how many seed attempts is reasonable as a default bound (performance vs. match quality trade-off) — left to implementation.
