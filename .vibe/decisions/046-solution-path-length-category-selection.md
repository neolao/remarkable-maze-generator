---
date: 2026-07-11
status: accepted
---
# Solution path length option: relative categories selected from a bounded candidate set

**Context:** Backlog item 037 asks for a way to request a shorter or longer solution path, noting that the achievable path length range depends heavily on maze type, algorithm, and dimensions, and leaves the exact category-to-length mapping as an implementation decision.

**Decision:** Expose the option as three relative categories — `short`, `medium`, `long` — rather than an absolute cell-count target. When set, `generateMaze` generates up to a bounded number of candidates (derived deterministically from the base seed: `seed`, `seed + 1`, …), computes each candidate's solution path length, and picks: the shortest for `short`, the longest for `long`, and the one closest to the median for `medium`. Leaving the option unset keeps single-seed generation unchanged.

**Reason:** Path length achievable range is not knowable in the abstract (it depends on type/algorithm/dimensions), so an absolute target would require the user to already know that range or the system to guess it — an absolute target's "closeness" would be meaningless without it. Ranking within the actually-generated candidate set is self-relative to that maze's own real constraints, requires no precomputed bounds, and keeps the CLI/web surface simple (one dropdown, no companion numeric field).

**Rejected alternatives:**
- Absolute cell-count target (e.g. `--path-length 42`): rejected because the achievable range is unknown to the caller ahead of generation, making the number hard to choose meaningfully; would also need a companion UI input on the web form.
- Both category and absolute number accepted: rejected as unnecessary duplicated validation/UI for a use case category selection already satisfies, given the confirmed decision to use categories only.
