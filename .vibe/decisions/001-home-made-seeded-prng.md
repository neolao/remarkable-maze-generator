---
date: 2026-07-07
status: accepted
---
# Home-made seeded PRNG for maze generation

**Context:** The maze generation algorithm (recursive backtracker) needs a deterministic pseudo-random number generator so that the same seed always produces the same maze.

**Decision:** Implement a small seeded PRNG directly in `packages/core`, with no external dependency.

**Reason:** `packages/core` is meant to stay dependency-free where possible so it remains lightweight and easily testable in isolation (per CLAUDE.md constraints on the core package). A seeded PRNG is a small, well-understood algorithm (a few lines) that doesn't justify pulling in an external package.

**Rejected alternatives:** Using an external library (e.g. `seedrandom`) — rejected to avoid adding a runtime dependency to `core` for something trivial to implement and fully control.
