---
status: todo
---
# Add Test Coverage For Web App.js

## Description
`packages/web/public/app.js` has zero test coverage even though it contains non-trivial client-side logic: form submit/validation feedback, the pairing flow, the send-to-reMarkable flow, and cookie read/write. It also duplicates `serializeFormPreferences`/`parseFormPreferences` from the tested `packages/web/src/form-preferences.ts` ("duplicated here because this static page runs unmodified in the browser") — that duplicate copy could silently drift from its tested counterpart with nothing to catch it. Add jsdom-based (or lightweight Playwright) tests covering at least the cookie round-trip and the duplicated serialization functions.

## Acceptance Criteria
- [ ] A test verifies `app.js`'s `serializeFormPreferences`/`parseFormPreferences` stay behaviorally identical to `packages/web/src/form-preferences.ts`
- [ ] A test exercises the cookie read/write round-trip for remembered form fields
- [ ] A test covers at least one failure path in the send-to-reMarkable or pairing flow (e.g. network failure surfaces a user-visible error, not a silent failure)
- [ ] `npm test` includes the new test file and passes

## Notes
Found by `vibe:review-tests` during `/vibe:review` on 2026-07-10, rated High severity. Skipped during that review's auto-fix pass because setting up jsdom/browser test infrastructure was judged out of scope for a fix-only pass — flagged as recommended follow-up work.
