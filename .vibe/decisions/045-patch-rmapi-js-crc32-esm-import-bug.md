---
date: 2026-07-10
status: accepted
---
# Patch rmapi-js's extensionless crc-32 import via patch-package

**Context:** Once `core` correctly resolved to its compiled output under plain `node` (see ADR 044), starting the compiled server/CLI still crashed: `rmapi-js@11.0.0`'s `dist/raw.js` does `import CRC32C from "crc-32/crc32c"` — a subpath import with no file extension. Node's strict ESM resolution rejects this (`ERR_MODULE_NOT_FOUND`); `tsx`'s bundler-based resolver tolerates it, which is why the bug never surfaced in development. `rmapi-js` is the latest published version (11.0.0); no newer release fixes this.

**Decision:** Patch the installed `crc-32/crc32c` import to `crc-32/crc32c.js` inside `rmapi-js`'s compiled output using `patch-package`, with a `postinstall` hook so the fix reapplies automatically after every `npm install`. The generated patch file is committed to the repo.

**Reason:** This is a real bug in a third-party dependency, not in this project's code; `patch-package` is the standard way to apply a minimal, auditable, automatically-reapplied fix without forking the dependency or vendoring it.

**Rejected alternatives:**
- Waiting for an upstream fix — rejected because 11.0.0 is already the latest version and there's no ETA.
- Avoiding the compiled production path altogether (see ADR 044's rejected alternative) — would have sidestepped this bug too, but was rejected there for the same reason.
- Forking/vendoring `rmapi-js` — rejected as disproportionate for a one-line import fix.
