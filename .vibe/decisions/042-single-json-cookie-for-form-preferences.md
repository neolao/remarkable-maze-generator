---
date: 2026-07-10
status: accepted
---
# Single JSON cookie for form preferences

**Context:** The web configuration form needs to remember the user's last-used values (width, height, difficulty, maze type, algorithm, solution mode, show-solution checkbox) across visits, using cookies rather than `localStorage`/`sessionStorage`.

**Decision:** Store all seven fields together in a single cookie, as a URI-encoded JSON object, with a 1-year expiry. Parsing validates the shape and every field's type; if the cookie is missing, unparsable, or has any field of the wrong shape, the parser returns no preferences at all and the form falls back entirely to hardcoded defaults (no partial merge of a partially-valid cookie).

**Reason:** A single cookie keeps the read/write surface small and the pre-fill logic atomic — either all fields come from a trustworthy prior submission, or none do. This matches the existing `validateMazeFormInput` mirroring pattern already used in `app.js`: pure encode/decode logic gets a tested TypeScript twin in `packages/web/src/`, duplicated by hand into the build-step-free static `app.js`.

**Rejected alternatives:** One cookie per field — rejected as unnecessary complexity for values that are always read/written together. Partial-merge on a partially-valid cookie — rejected because a corrupted cookie could then mix stale/invalid values with defaults in a way that's harder to reason about and to test.
