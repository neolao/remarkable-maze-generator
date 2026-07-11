---
date: 2026-07-11
status: accepted
---
# Cap the configurable path-length candidate count at 50

**Context:** Backlog item 044 exposes the previously hardcoded `PATH_LENGTH_MAX_ATTEMPTS` (10) as a user-supplied `pathLengthCandidateCount` option, threaded through the CLI and the web form, wherever a `pathLength` target is also requested.

**Decision:** Cap `pathLengthCandidateCount` at 50 (`MAX_PATH_LENGTH_CANDIDATE_COUNT`), rejected with a validation error above that value, in addition to requiring it to be a positive integer and to be accompanied by a `pathLength` target.

**Reason:** Each candidate is a full maze generation + solve pass; on the largest supported dimensions (200x200) an unbounded value let through by the web form (no auth layer, reachable by anyone on the local network per ADR on `0.0.0.0` binding) could turn a single request into a long-running, resource-heavy loop. A fixed, generous cap preserves the feature's purpose (trading generation time for a better match) while keeping worst-case latency predictable, consistent with the existing `MAX_DIMENSION` cap that protects against the same class of resource-exhaustion issue.

**Rejected alternatives:**
- No upper bound: simplest, but reopens the memory/CPU exhaustion concern the `MAX_DIMENSION` cap (see the 0.8.0 fix) was introduced to close.
- A lower cap (e.g. 20): would more tightly bound worst-case latency but was judged unnecessarily restrictive for legitimate use, since 50 sequential generations of small-to-medium mazes still completes quickly.
