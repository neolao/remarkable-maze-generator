---
status: todo
---
# Evaluate Pdf-lib Maintenance Risk

## Description
`pdf-lib`, used in `packages/core` for PDF rendering (and as a test-only devDependency in `packages/web`), has had no release since May 2022. It's effectively unmaintained upstream with no active security-patch cadence. Evaluate whether it remains the right long-term choice, or whether a maintained fork/successor (e.g. a `pdf-lib`-community fork or an `@pdf-lib/*` successor) should be tracked and adopted before a vulnerability ever surfaces with no upstream fix available.

## Acceptance Criteria
- [ ] A comparison of `pdf-lib` against at least one actively maintained alternative is documented (API compatibility, migration effort, license)
- [ ] A decision is recorded: stay on `pdf-lib`, pin and monitor, or migrate
- [ ] If migration is chosen, the swap is isolated to `packages/core`'s PDF rendering layer with no change to `cli`/`web` consumers, and all existing PDF-rendering tests pass unchanged

## Notes
Found by `vibe:review-dependencies` during `/vibe:review` on 2026-07-10, rated Low severity (no known CVE today, purely a maintenance-risk observation).
