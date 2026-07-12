---
date: 2026-07-12
status: accepted
---
# Maze form field visibility dependency graph

**Context:** Backlog item 046 asked for progressive disclosure of the web maze configuration form, so fields the user can't yet act on stay hidden. The backlog description's own example claimed `path-length`/`path-length-candidates` "only matter for certain maze type/algorithm combinations."

**Decision:** The actual dependency graph is derived from what `core` enforces (`validateTypeAlgorithmCompatibility`, `validateDifficulty`'s per-algorithm relevance, `parsePathLengthCandidateCount`), not from the backlog description's example:
- `algorithm` field is shown unless `type === "rectangle-crossing"` (only `growing-tree` is compatible with it; the field is hidden and the effective algorithm is forced to `growing-tree`).
- `difficulty` field is shown only when the effective algorithm is `growing-tree` (the only algorithm reading it — see `maze-algorithms/growing-tree.ts`).
- `path-length-candidates` field is shown only when a `path-length` target is selected (per ADR 047).
- `path-length` itself has no type/algorithm restriction (`generateMaze` applies the candidate search "across every maze type/algorithm combination" — ADR 046) and stays always visible, contrary to the backlog's own example.

A hidden field's raw DOM value (and its cookie-persisted preference) is left untouched so it reappears correctly if its dependency becomes met again; only the value actually used for validation/request-building is overridden to the effective one (`growing-tree` for algorithm, the default difficulty, or omitted for candidate count) while hidden. This mirrors the existing pattern in `app.js` where `pathLength`/`pathLengthCandidateCount` are dropped from the seeded PDF/send request bodies without mutating the form's own state.

**Reason:** Keeps the frontend's notion of "what's relevant" in lockstep with `core`'s actual validation rules instead of a second, drifting source of truth — and avoids permanently discarding a user's prior selection (e.g. a chosen non-default algorithm) just because it's temporarily hidden by an unrelated choice.

**Rejected alternatives:** Hiding fields based on the backlog's literal example (tying `path-length` visibility to type/algorithm) — rejected because `core` does not actually restrict it that way; implementing it would have hidden a feature that works in a combination the UI claimed didn't support it.
