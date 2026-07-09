---
date: 2026-07-09
status: accepted
---
# Web default visible name format scoped to the web package only

**Context:** The web send-to-reMarkable endpoint's `defaultVisibleName` produced `${type}-${width}x${height}-${seed}`. Backlog item 020 asked to change it to `{type} {width}✕{height}` (space-separated, multiplication sign, no seed).

**Decision:** Apply the new format only to `packages/web/src/remarkable-routes.ts`'s `defaultVisibleName`. Keep the maze `type` value as-is (its internal technical value, e.g. `rectangle`, `rectangle-crossing`) rather than mapping it to a display label. Leave the CLI's own separate `defaultVisibleName` (in `packages/cli/src/generate-and-send.ts`) untouched.

**Reason:** The CLI has its own independent `defaultVisibleName` implementation — it is not shared code with the web package, so changing the web format does not require touching the CLI. The user's request only concerned sending from the web page. Keeping the type value unmapped avoids introducing a new display-label concept not requested and not present elsewhere in the codebase.

**Rejected alternatives:** Also updating the CLI's default name format for consistency (rejected: out of scope, not requested, would touch unrelated code). Mapping the maze type to a human-readable label (e.g. `rectangle-crossing` → `bridge crossing`) (rejected: adds a new concept not asked for; the technical value is already used verbatim elsewhere).
